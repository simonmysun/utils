// Builds the per-image control cards and wires their events.

const EDGES = ['top', 'right', 'bottom', 'left'];

export function renderControls(container, state, handlers) {
  const { items, direction } = state;
  container.replaceChildren();

  if (items.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.innerHTML = 'No images yet. Click <strong>Add images</strong> to begin.';
    container.appendChild(hint);
    return;
  }

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.id = item.id;

    // Head: thumb, title, actions
    const head = document.createElement('div');
    head.className = 'item-head';

    const thumb = document.createElement('img');
    thumb.className = 'item-thumb';
    thumb.src = item.element.src;
    thumb.alt = item.name;

    const titleWrap = document.createElement('div');
    titleWrap.className = 'item-title';
    titleWrap.textContent = `${index + 1}. ${item.name}`;
    titleWrap.title = item.name;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = `${item.naturalWidth}×${item.naturalHeight} · ${item.rotation}°`;

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.append(
      iconBtn('↑', 'Move up', () => handlers.onMoveUp(item.id), index === 0),
      iconBtn('↓', 'Move down', () => handlers.onMoveDown(item.id), isLast),
      iconBtn('⟳', 'Rotate 90°', () => handlers.onRotate(item.id)),
      iconBtn('✕', 'Delete', () => handlers.onDelete(item.id), false, 'danger'),
    );

    const headText = document.createElement('div');
    headText.style.flex = '1';
    headText.style.minWidth = '0';
    headText.append(titleWrap, meta);

    head.append(thumb, headText, actions);

    // Crop rows (slider + number per edge)
    const rotated = rotatedDims(item);
    const grid = document.createElement('div');
    grid.className = 'crop-grid';
    EDGES.forEach((edge) => {
      const extent = edge === 'top' || edge === 'bottom' ? rotated.h : rotated.w;
      const max = Math.max(0, extent - 1);
      const row = sliderRow({
        label: `Crop ${edge}`,
        value: item.crop[edge],
        max,
        onInput: (v) => handlers.onCrop(item.id, edge, v),
      });
      grid.appendChild(row);
    });

    card.append(head, grid);

    // Overlap-with-next (not shown on last item)
    if (!isLast) {
      const row = sliderRow({
        label: 'Overlap next',
        value: item.overlapNext,
        max: overlapMax(item, direction),
        onInput: (v) => handlers.onOverlap(item.id, v),
      });
      row.classList.add('overlap-row');
      card.appendChild(row);
    }

    const err = document.createElement('div');
    err.className = 'item-error';
    err.hidden = true;
    card.appendChild(err);

    container.appendChild(card);
  });
}

function rotatedDims(item) {
  const rot = ((item.rotation % 360) + 360) % 360;
  return rot % 180 === 0
    ? { w: item.naturalWidth, h: item.naturalHeight }
    : { w: item.naturalHeight, h: item.naturalWidth };
}

function overlapMax(item, direction) {
  const { w: rW, h: rH } = rotatedDims(item);
  const along = direction === 'vertical'
    ? rH - item.crop.top - item.crop.bottom
    : rW - item.crop.left - item.crop.right;
  return Math.max(0, along - 1);
}

/**
 * A labelled control: range slider + number input kept in sync.
 * The number input allows values beyond `max` (over-crop is caught by
 * validation), while the slider is bounded to [0, max].
 */
function sliderRow({ label: labelText, value, max, onInput }) {
  const row = document.createElement('div');
  row.className = 'slider-row';

  const label = document.createElement('label');
  label.textContent = labelText;

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = String(Math.max(0, max));
  range.value = String(Math.min(value, max));

  const num = document.createElement('input');
  num.type = 'number';
  num.min = '0';
  num.value = String(value);

  range.addEventListener('input', () => {
    num.value = range.value;
    onInput(range.value);
  });
  num.addEventListener('input', () => {
    const v = Number(num.value) || 0;
    range.value = String(Math.min(Math.max(0, v), max));
    onInput(num.value);
  });

  row.append(label, range, num);
  return row;
}

function iconBtn(text, title, onClick, disabled = false, extra = '') {
  const btn = document.createElement('button');
  btn.className = `btn icon ${extra}`.trim();
  btn.textContent = text;
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.disabled = disabled;
  btn.addEventListener('click', onClick);
  return btn;
}

/** Highlight invalid cards without rebuilding the DOM. */
export function applyValidation(container, invalidIds, message) {
  container.querySelectorAll('.item-card').forEach((card) => {
    const invalid = invalidIds.has(card.dataset.id);
    card.classList.toggle('invalid', invalid);
    const err = card.querySelector('.item-error');
    if (err) {
      err.hidden = !invalid;
      err.textContent = invalid ? message || 'Invalid for current direction.' : '';
    }
  });
}
