// App bootstrap: wires store, loader, preview, exporter and UI together.

import { createStore } from './state.js';
import { FileImageLoader } from './loaders.js';
import { createImageItem, rotateItem, setCrop, setOverlap } from './models.js';
import { PreviewRenderer } from './preview.js';
import { exportPng } from './exporter.js';
import { validate } from './validate.js';
import { renderControls, applyValidation } from './ui.js';

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
  scrollEl: $('preview-scroll'),
  dimsEl: $('preview-dims'),
});

const itemListEl = $('item-list');
const errorBanner = $('error-banner');
const exportBtn = $('export-btn');

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
  // Rebuild control cards only on structural changes (preserves input focus).
  if (state.structureVersion !== lastStructureVersion) {
    renderControls(itemListEl, state, handlers);
    lastStructureVersion = state.structureVersion;
  }

  renderDirectionToggles(state.direction);

  const result = validate(state.items, state.direction);
  applyValidation(itemListEl, result.invalidIds, result.message);
  showError(state.items.length > 0 ? result.message : null);

  exportBtn.disabled = !result.valid;

  if (result.valid) {
    preview.render(state.items, state.direction);
  } else {
    preview.render(state.items, state.direction); // still show what we can
  }
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

exportBtn.addEventListener('click', async () => {
  try {
    await exportPng(store.get().items, store.get().direction, 'merged.png');
  } catch (err) {
    showError(err.message);
  }
});

window.addEventListener('resize', () => {
  const s = store.get();
  preview.fit(s.items, s.direction);
});

// initial paint
store.set((s) => ({ ...s }));
