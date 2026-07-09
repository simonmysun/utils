// CSS/DOM preview renderer (no Canvas). Builds one overflow-hidden viewport
// per image and lets flexbox lay them out along the stitch axis.
// Zoom/pan of the whole composite is handled separately by PanZoom.

import { contentBox, cssImageTransform, compositeSize } from './geometry.js';

export class PreviewRenderer {
  constructor({ scaleEl, canvasEl, dimsEl }) {
    this.scaleEl = scaleEl;
    this.canvasEl = canvasEl;
    this.dimsEl = dimsEl;
  }

  /**
   * Build the composite DOM and size the (pan/zoom) layer to match.
   * @returns {{w: number, h: number}} composite pixel size
   */
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
      img.draggable = false;

      view.appendChild(img);
      canvas.appendChild(view);
    });

    const size = items.length ? compositeSize(items, direction) : { w: 0, h: 0 };
    this.scaleEl.style.width = `${Math.max(0, size.w)}px`;
    this.scaleEl.style.height = `${Math.max(0, size.h)}px`;

    this.updateDims(items, size);
    return size;
  }

  updateDims(items, size) {
    if (!this.dimsEl) return;
    this.dimsEl.textContent = items.length
      ? `${Math.round(size.w)} × ${Math.round(size.h)} px`
      : '';
  }
}
