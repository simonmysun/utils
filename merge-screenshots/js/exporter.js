// Canvas-based PNG exporter. Only used at export time (preview is CSS/DOM).

import { baseTranslate, contentBox, compositeSize } from './geometry.js';

/** Render one item onto its own canvas at rotated size, then return it. */
function renderRotated(item) {
  const c = document.createElement('canvas');
  const rot = ((item.rotation % 360) + 360) % 360;
  const rotated = rot % 180 === 0
    ? { w: item.naturalWidth, h: item.naturalHeight }
    : { w: item.naturalHeight, h: item.naturalWidth };

  c.width = rotated.w;
  c.height = rotated.h;
  const ctx = c.getContext('2d');
  const [bx, by] = baseTranslate(item.naturalWidth, item.naturalHeight, rot);
  ctx.translate(bx, by);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(item.element, 0, 0, item.naturalWidth, item.naturalHeight);
  return c;
}

/**
 * Compose all items into a single canvas.
 * @returns {HTMLCanvasElement}
 */
export function compose(items, direction) {
  const size = compositeSize(items, direction);
  if (size.w <= 0 || size.h <= 0) {
    throw new Error('Nothing to export: composite size is empty.');
  }

  const out = document.createElement('canvas');
  out.width = Math.round(size.w);
  out.height = Math.round(size.h);
  const ctx = out.getContext('2d');

  let offset = 0;
  items.forEach((item, i) => {
    const isLast = i === items.length - 1;
    const box = contentBox(item, direction, isLast);
    const sw = Math.max(0, box.w);
    const sh = Math.max(0, box.h);
    if (sw === 0 || sh === 0) return;

    const rotatedCanvas = renderRotated(item);
    if (direction === 'vertical') {
      ctx.drawImage(rotatedCanvas, box.leadLeft, box.leadTop, sw, sh, 0, offset, sw, sh);
      offset += sh;
    } else {
      ctx.drawImage(rotatedCanvas, box.leadLeft, box.leadTop, sw, sh, offset, 0, sw, sh);
      offset += sw;
    }
  });

  return out;
}

/** Compose and trigger a browser download of the PNG. */
export async function exportPng(items, direction, filename = 'merged.png') {
  const canvas = compose(items, direction);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed (toBlob returned null). The image may exceed the browser canvas size limit.'))), 'image/png');
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a tick before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
