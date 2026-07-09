// Data model for a single image in the sequence.

let counter = 0;

/**
 * @param {object} loaded  Result of an ImageLoader: { element, name, width, height, objectUrl }
 */
export function createImageItem(loaded) {
  return {
    id: `img-${Date.now()}-${counter++}`,
    name: loaded.name,
    element: loaded.element,       // HTMLImageElement (already decoded)
    objectUrl: loaded.objectUrl,   // for cleanup
    naturalWidth: loaded.width,
    naturalHeight: loaded.height,
    rotation: 0,                   // 0 | 90 | 180 | 270
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    overlapNext: 0,                // overlap with the following item (px)
  };
}

export function rotateItem(item, deltaDeg) {
  const rotation = (((item.rotation + deltaDeg) % 360) + 360) % 360;
  return { ...item, rotation };
}

export function setCrop(item, edge, value) {
  const v = Math.max(0, Math.round(Number(value) || 0));
  return { ...item, crop: { ...item.crop, [edge]: v } };
}

export function setOverlap(item, value) {
  return { ...item, overlapNext: Math.max(0, Math.round(Number(value) || 0)) };
}
