// Pluggable image-loader abstraction.
// Add new sources (URL, clipboard, drag-drop, cloud, ...) by implementing load().

export class ImageLoader {
  /**
   * @returns {Promise<{element: HTMLImageElement, name: string, width: number, height: number, objectUrl: string|null}>}
   */
  // eslint-disable-next-line no-unused-vars
  async load(source) {
    throw new Error('ImageLoader.load() not implemented');
  }
}

/** Loads an image from a File (from <input type="file"> or drag & drop). */
export class FileImageLoader extends ImageLoader {
  async load(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      throw new Error(`Unsupported file: ${file ? file.name : 'unknown'} (not an image)`);
    }

    const objectUrl = URL.createObjectURL(file);
    const element = new Image();
    element.src = objectUrl;

    await element.decode().catch(() => {
      URL.revokeObjectURL(objectUrl);
      throw new Error(`Failed to decode image: ${file.name}`);
    });

    return {
      element,
      name: file.name,
      width: element.naturalWidth,
      height: element.naturalHeight,
      objectUrl,
    };
  }
}
