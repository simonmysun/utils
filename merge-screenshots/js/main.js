// App bootstrap: wires store, loader, preview, exporter and UI together.

import { createStore } from './state.js';
import { FileImageLoader } from './loaders.js';
import { createImageItem, rotateItem, setCrop, setOverlap } from './models.js';
import { PreviewRenderer } from './preview.js';
import { PanZoom } from './panzoom.js';
import { exportPng } from './exporter.js';
import { validate } from './validate.js';
import { renderControls, applyValidation } from './ui.js';
import { getSuggestionProvider } from './suggest.js';

const $ = (id) => document.getElementById(id);

const store = createStore({
  direction: 'vertical',
  items: [],
  structureVersion: 0, // bumped when the list DOM must be rebuilt
});

const loader = new FileImageLoader();
const preview = new PreviewRenderer({
  scaleEl: $('preview-scale'),
  canvasEl: $('preview-canvas'),
  dimsEl: $('preview-dims'),
});
const panzoom = new PanZoom($('preview-scroll'), $('preview-scale'));
panzoom.onChange = (scale) => {
  $('zoom-level').textContent = `${Math.round(scale * 100)}%`;
};

const itemListEl = $('item-list');
const errorBanner = $('error-banner');
const exportBtn = $('export-btn');
const autoMergeBtn = $('auto-merge-btn');

// --- state helpers ------------------------------------------------------

function bumpStructure(mutator) {
  store.set((s) => {
    const next = mutator(s);
    return { ...next, structureVersion: s.structureVersion + 1 };
  });
}

function updateItem(id, fn) {
  store.set((s) => ({
    ...s,
    items: s.items.map((it) => (it.id === id ? fn(it) : it)),
  }));
}

function moveItem(id, delta) {
  bumpStructure((s) => {
    const i = s.items.findIndex((it) => it.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= s.items.length) return s;
    const items = s.items.slice();
    [items[i], items[j]] = [items[j], items[i]];
    return { ...s, items };
  });
}

// --- handlers passed to the UI -----------------------------------------

const handlers = {
  onRotate: (id) => bumpStructure((s) => ({
    ...s,
    items: s.items.map((it) => (it.id === id ? rotateItem(it, 90) : it)),
  })),
  onMoveUp: (id) => moveItem(id, -1),
  onMoveDown: (id) => moveItem(id, 1),
  onDelete: (id) => bumpStructure((s) => {
    const target = s.items.find((it) => it.id === id);
    if (target && target.objectUrl) URL.revokeObjectURL(target.objectUrl);
    return { ...s, items: s.items.filter((it) => it.id !== id) };
  }),
  onCrop: (id, edge, value) => updateItem(id, (it) => setCrop(it, edge, value)),
  onOverlap: (id, value) => updateItem(id, (it) => setOverlap(it, value)),
};

// --- file upload --------------------------------------------------------

async function addFiles(fileList) {
  const files = Array.from(fileList);
  const loaded = [];
  for (const file of files) {
    try {
      loaded.push(createImageItem(await loader.load(file)));
    } catch (err) {
      showError(err.message);
      return; // fail-and-stop per requirements
    }
  }
  if (loaded.length) {
    bumpStructure((s) => ({ ...s, items: [...s.items, ...loaded] }));
  }
}

// --- error banner -------------------------------------------------------

function showError(message) {
  errorBanner.hidden = !message;
  errorBanner.textContent = message || '';
}

// --- rendering ----------------------------------------------------------

let lastStructureVersion = -1;

function renderDirectionToggles(direction) {
  $('dir-vertical').classList.toggle('active', direction === 'vertical');
  $('dir-horizontal').classList.toggle('active', direction === 'horizontal');
}

store.subscribe((state) => {
  const structural = state.structureVersion !== lastStructureVersion;

  // Rebuild control cards only on structural changes (preserves input focus).
  if (structural) {
    renderControls(itemListEl, state, handlers);
    lastStructureVersion = state.structureVersion;
  }

  renderDirectionToggles(state.direction);

  const result = validate(state.items, state.direction);
  applyValidation(itemListEl, result.invalidIds, result.message);
  showError(state.items.length > 0 ? result.message : null);

  exportBtn.disabled = !result.valid;
  autoMergeBtn.disabled = state.items.length < 2 || !getSuggestionProvider().available;

  // Always render what we can, even when invalid.
  const size = preview.render(state.items, state.direction);
  panzoom.setContentSize(size.w, size.h);
  // Re-fit on structural changes; keep the user's view during fine edits.
  if (structural) panzoom.fit();
  else panzoom.reapply();
});

// --- events -------------------------------------------------------------

$('file-input').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = ''; // allow re-selecting the same file
});

document.querySelectorAll('.btn.toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    bumpStructure((s) => ({ ...s, direction: btn.dataset.dir }));
  });
});

async function autoMerge() {
  const { items, direction } = store.get();
  const provider = getSuggestionProvider();
  if (items.length < 2 || !provider.available) return;

  const allowReorder = $('reorder-toggle').checked;
  autoMergeBtn.disabled = true;
  autoMergeBtn.textContent = 'Analyzing…';
  showError(null);
  // Yield once so the button label paints before the synchronous analysis.
  await new Promise((r) => setTimeout(r, 0));

  try {
    const { order, perItem, warnings } = await provider.analyze(items, direction, {
      allowReorder,
    });
    const reordered = order.some((idx, pos) => idx !== pos);
    if (allowReorder && reordered) {
      warnings.unshift(`Reordered images to: ${order.map((i) => i + 1).join(' → ')}.`);
    }
    bumpStructure((s) => {
      const applied = order.map((idx) => {
        const it = s.items[idx];
        const plan = perItem[idx];
        // Auto-merge yields a complete geometry plan, so reset all edges first
        // (leftover crop/overlap from prior runs or manual edits would corrupt
        // the result, e.g. stale perpendicular crops shrinking the content box).
        const crop = { top: 0, right: 0, bottom: 0, left: 0 };
        if (direction === 'vertical') {
          crop.top = plan.cropTop;
          crop.bottom = plan.cropBottom;
        } else {
          crop.left = plan.cropTop;
          crop.right = plan.cropBottom;
        }
        return { ...it, crop, overlapNext: plan.overlapNext };
      });
      return { ...s, items: applied };
    });
    if (warnings.length) {
      const cur = errorBanner.hidden ? '' : errorBanner.textContent;
      showError(cur ? `${cur} ${warnings.join(' ')}` : warnings.join(' '));
    }
  } catch (err) {
    showError(err.message);
  } finally {
    autoMergeBtn.textContent = 'Auto-merge';
  }
}

autoMergeBtn.addEventListener('click', autoMerge);

exportBtn.addEventListener('click', async () => {
  try {
    await exportPng(store.get().items, store.get().direction, 'merged.png');
  } catch (err) {
    showError(err.message);
  }
});

$('zoom-in').addEventListener('click', () => panzoom.zoomBy(1.25));
$('zoom-out').addEventListener('click', () => panzoom.zoomBy(1 / 1.25));
$('zoom-fit-w').addEventListener('click', () => panzoom.fitWidth());
$('zoom-fit-h').addEventListener('click', () => panzoom.fitHeight());

window.addEventListener('resize', () => panzoom.reapply());

// initial paint
store.set((s) => ({ ...s }));
