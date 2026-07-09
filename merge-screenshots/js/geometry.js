// Pure geometry helpers for rotation / crop / overlap.
// The same math drives both the CSS/DOM preview and the Canvas export,
// so it lives in one place and stays framework-free.

/** Size of an image after rotation (0/90/180/270). */
export function rotatedSize(naturalW, naturalH, rotation) {
  return rotation % 180 === 0
    ? { w: naturalW, h: naturalH }
    : { w: naturalH, h: naturalW };
}

/**
 * Translation (in parent px) required so that, combined with
 * `rotate(rotation deg)` and `transform-origin: 0 0`, the rotated image's
 * top-left corner sits at (0,0) and it occupies [0,rW] x [0,rH].
 * The same values are reused for the canvas transform.
 */
export function baseTranslate(naturalW, naturalH, rotation) {
  switch (((rotation % 360) + 360) % 360) {
    case 0:   return [0, 0];
    case 90:  return [naturalH, 0];
    case 180: return [naturalW, naturalH];
    case 270: return [0, naturalW];
    default:  return [0, 0];
  }
}

/**
 * Effective crop for an item, folding the overlap-with-next into the
 * trailing edge along the stitch axis (bottom for vertical, right for
 * horizontal). Overlap is ignored for the last item.
 */
export function effectiveCrop(item, direction, isLast) {
  const c = { ...item.crop };
  const overlap = isLast ? 0 : Math.max(0, item.overlapNext || 0);
  if (direction === 'vertical') c.bottom += overlap;
  else c.right += overlap;
  return c;
}

/**
 * Visible content box of an item after rotation + effective crop.
 * `lead*` are the leading crop offsets used to position the image in CSS.
 */
export function contentBox(item, direction, isLast) {
  const { w: rW, h: rH } = rotatedSize(item.naturalWidth, item.naturalHeight, item.rotation);
  const c = effectiveCrop(item, direction, isLast);
  return {
    w: rW - c.left - c.right,
    h: rH - c.top - c.bottom,
    leadLeft: c.left,
    leadTop: c.top,
    rotatedW: rW,
    rotatedH: rH,
  };
}

/**
 * CSS transform string for the <img> inside a preview viewport so the
 * cropped region aligns to the viewport's top-left corner.
 */
export function cssImageTransform(item) {
  const [bx, by] = baseTranslate(item.naturalWidth, item.naturalHeight, item.rotation);
  const tx = bx - item.crop.left;
  const ty = by - item.crop.top;
  return `translate(${tx}px, ${ty}px) rotate(${item.rotation}deg)`;
}

/**
 * Overall composite pixel size given the ordered items and direction.
 * Perpendicular axis takes the max content extent; the stitch axis sums.
 */
export function compositeSize(items, direction) {
  let along = 0;
  let across = 0;
  items.forEach((item, i) => {
    const box = contentBox(item, direction, i === items.length - 1);
    if (direction === 'vertical') {
      along += Math.max(0, box.h);
      across = Math.max(across, Math.max(0, box.w));
    } else {
      along += Math.max(0, box.w);
      across = Math.max(across, Math.max(0, box.h));
    }
  });
  return direction === 'vertical'
    ? { w: across, h: along }
    : { w: along, h: across };
}
