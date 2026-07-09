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

    // Crop grid
    const grid = document.createElement('div');
    grid.className = 'crop-grid';
    EDGES.forEach((edge) => {
      const field = document.createElement('div');
      field.className = 'field';
      const label = document.createElement('label');
      label.textContent = `Crop ${edge}`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.value = String(item.crop[edge]);
      input.addEventListener('input', () => handlers.onCrop(item.id, edge, input.value));
      field.append(label, input);
      grid.appendChild(field);
    });

    card.append(head, grid);

    // Overlap-with-next (not shown on last item)
    if (!isLast) {
      const maxOverlap = overlapMax(item, direction);
      const row = document.createElement('div');
      row.className = 'overlap-row';

      const label = document.createElement('label');
      label.textContent = 'Overlap next';

      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = String(maxOverlap);
      range.value = String(Math.min(item.overlapNext, maxOverlap));

      const num = document.createElement('input');
      num.type = 'number';
      num.min = '0';
      num.max = String(maxOverlap);
      num.value = String(item.overlapNext);

      range.addEventListener('input', () => {
        num.value = range.value;
        handlers.onOverlap(item.id, range.value);
      });
      num.addEventListener('input', () => {
        range.value = num.value;
        handlers.onOverlap(item.id, num.value);
      });

      row.append(label, range, num);
      card.appendChild(row);
    }

    const err = document.createElement('div');
    err.className = 'item-error';
    err.hidden = true;
    card.appendChild(err);

    container.appendChild(card);
  });
}

function overlapMax(item, direction) {
  const rot = ((item.rotation % 360) + 360) % 360;
  const rW = rot % 180 === 0 ? item.naturalWidth : item.naturalHeight;
  const rH = rot % 180 === 0 ? item.naturalHeight : item.naturalWidth;
  const along = direction === 'vertical'
    ? rH - item.crop.top - item.crop.bottom
    : rW - item.crop.left - item.crop.right;
  return Math.max(0, along - 1);
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
