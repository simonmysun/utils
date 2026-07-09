// CSS/DOM preview renderer (no Canvas). Builds one overflow-hidden viewport
// per image and lets flexbox lay them out along the stitch axis.

import { contentBox, cssImageTransform, compositeSize } from './geometry.js';

export class PreviewRenderer {
  constructor({ scaleEl, canvasEl, scrollEl, dimsEl }) {
    this.scaleEl = scaleEl;
    this.canvasEl = canvasEl;
    this.scrollEl = scrollEl;
    this.dimsEl = dimsEl;
  }

  render(items, direction) {
    const canvas = this.canvasEl;
    canvas.className = `preview-canvas ${direction}`;
    canvas.replaceChildren();

    items.forEach((item, i) => {
      const isLast = i === items.length - 1;
      const box = contentBox(item, direction, isLast);

      const view = document.createElement('div');
      view.className = 'pv-item';
      view.style.width = `${Math.max(0, box.w)}px`;
      view.style.height = `${Math.max(0, box.h)}px`;

      const img = document.createElement('img');
      img.src = item.element.src;
      img.width = item.naturalWidth;
      img.height = item.naturalHeight;
      img.style.transform = cssImageTransform(item);
      img.alt = item.name;

      view.appendChild(img);
      canvas.appendChild(view);
    });

    this.updateDims(items, direction);
    this.fit(items, direction);
  }

  updateDims(items, direction) {
    if (!this.dimsEl) return;
    if (items.length === 0) {
      this.dimsEl.textContent = '';
      return;
    }
    const { w, h } = compositeSize(items, direction);
    this.dimsEl.textContent = `${Math.round(w)} × ${Math.round(h)} px`;
  }

  // Scale the composite down to fit the available preview area.
  fit(items, direction) {
    if (items.length === 0) {
      this.scaleEl.style.transform = 'scale(1)';
      return;
    }
    const { w, h } = compositeSize(items, direction);
    if (w <= 0 || h <= 0) {
      this.scaleEl.style.transform = 'scale(1)';
      return;
    }
    const pad = 32;
    const availW = Math.max(50, this.scrollEl.clientWidth - pad);
    const availH = Math.max(50, this.scrollEl.clientHeight - pad);
    // Never upscale beyond 1; fit within both dimensions.
    const scale = Math.min(1, availW / w, availH / h);
    this.scaleEl.style.transform = `scale(${scale})`;
    // Reserve layout space so scrollbars behave with the scaled content.
    this.scaleEl.style.width = `${w}px`;
    this.scaleEl.style.height = `${h}px`;
  }
}
