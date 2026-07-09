// Dimension-consistency validation.
//
// Requirement 3.1: every image must share the SAME pixel size on the edge
// perpendicular to the stitch axis (width for vertical, height for horizontal),
// measured on the rotated image. Rotation may be used to make images match.

import { rotatedSize, contentBox } from './geometry.js';

export function perpendicularExtent(item, direction) {
  const { w, h } = rotatedSize(item.naturalWidth, item.naturalHeight, item.rotation);
  return direction === 'vertical' ? w : h;
}

/**
 * @returns {{ valid: boolean, message: string|null, invalidIds: Set<string> }}
 */
export function validate(items, direction) {
  const invalidIds = new Set();

  if (items.length === 0) {
    return { valid: false, message: null, invalidIds };
  }

  // Perpendicular size must match the first item.
  const base = perpendicularExtent(items[0], direction);
  const axisName = direction === 'vertical' ? 'width' : 'height';

  for (const item of items) {
    if (perpendicularExtent(item, direction) !== base) {
      invalidIds.add(item.id);
    }
  }

  // Content boxes must have positive area (crops/overlap not larger than image).
  items.forEach((item, i) => {
    const box = contentBox(item, direction, i === items.length - 1);
    if (box.w <= 0 || box.h <= 0) invalidIds.add(item.id);
  });

  if (invalidIds.size > 0) {
    return {
      valid: false,
      message:
        `All images must have the same ${axisName} (after rotation) of ${base}px, ` +
        `and cropping/overlap must not remove an entire image. ` +
        `Rotate or remove the highlighted image(s) to continue.`,
      invalidIds,
    };
  }

  return { valid: true, message: null, invalidIds };
}
