// Pan & zoom controller for the preview.
//
// Manages a `translate(tx,ty) scale(scale)` transform on `contentEl` inside a
// clipped `viewportEl`. Interactions:
//   - drag              -> pan
//   - wheel / trackpad  -> zoom toward the pointer
//   - pinch (trackpad)  -> zoom (arrives as ctrl+wheel)
// Plus programmatic fit()/fitWidth()/fitHeight()/zoomBy()/reset().

const MIN_SCALE = 0.02;
const MAX_SCALE = 32;

export class PanZoom {
  constructor(viewportEl, contentEl) {
    this.viewport = viewportEl;
    this.content = contentEl;
    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.contentW = 0;
    this.contentH = 0;
    this.onChange = null; // optional callback(scale)

    this._bind();
  }

  setContentSize(w, h) {
    this.contentW = w;
    this.contentH = h;
  }

  _apply() {
    this.content.style.transform =
      `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    if (this.onChange) this.onChange(this.scale);
  }

  _clampScale(s) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  }

  _avail() {
    const pad = 24;
    return {
      w: Math.max(1, this.viewport.clientWidth - pad),
      h: Math.max(1, this.viewport.clientHeight - pad),
    };
  }

  _empty() {
    return this.contentW <= 0 || this.contentH <= 0;
  }

  /** Fit content entirely within the viewport and center it. */
  fit() {
    if (this._empty()) { this.scale = 1; this.tx = 0; this.ty = 0; this._apply(); return; }
    const a = this._avail();
    this.scale = this._clampScale(Math.min(a.w / this.contentW, a.h / this.contentH));
    this.tx = (this.viewport.clientWidth - this.contentW * this.scale) / 2;
    this.ty = (this.viewport.clientHeight - this.contentH * this.scale) / 2;
    this._apply();
  }

  /** Fit to the viewport width; center horizontally, align to the top. */
  fitWidth() {
    if (this._empty()) return this.fit();
    const a = this._avail();
    this.scale = this._clampScale(a.w / this.contentW);
    this.tx = (this.viewport.clientWidth - this.contentW * this.scale) / 2;
    this.ty = 12;
    this._apply();
  }

  /** Fit to the viewport height; center vertically, align to the left. */
  fitHeight() {
    if (this._empty()) return this.fit();
    const a = this._avail();
    this.scale = this._clampScale(a.h / this.contentH);
    this.ty = (this.viewport.clientHeight - this.contentH * this.scale) / 2;
    this.tx = 12;
    this._apply();
  }

  /** Re-apply the current transform (e.g. after content size changed). */
  reapply() {
    this._apply();
  }

  /** Zoom by a factor around a viewport-relative point (defaults to center). */
  zoomBy(factor, cx, cy) {
    if (cx === undefined) cx = this.viewport.clientWidth / 2;
    if (cy === undefined) cy = this.viewport.clientHeight / 2;
    const next = this._clampScale(this.scale * factor);
    const ratio = next / this.scale;
    this.tx = cx - (cx - this.tx) * ratio;
    this.ty = cy - (cy - this.ty) * ratio;
    this.scale = next;
    this._apply();
  }

  reset() {
    this.fit();
  }

  _bind() {
    // Wheel (and trackpad pinch): zoom toward the pointer.
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.viewport.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      this.zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    // Drag to pan.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId = null;

    this.viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      this.viewport.setPointerCapture(pointerId);
      this.viewport.classList.add('panning');
    });

    this.viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.tx += e.clientX - lastX;
      this.ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this._apply();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (pointerId !== null) {
        try { this.viewport.releasePointerCapture(pointerId); } catch (_) { /* ignore */ }
      }
      pointerId = null;
      this.viewport.classList.remove('panning');
    };
    this.viewport.addEventListener('pointerup', endDrag);
    this.viewport.addEventListener('pointercancel', endDrag);
  }
}
