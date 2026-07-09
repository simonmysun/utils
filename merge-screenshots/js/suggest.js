// P2 placeholder: pluggable interface for smart overlap/duplicate detection.
// Reserved so the smart-merge feature can be added later WITHOUT touching the
// core editing/merge pipeline. The UI wires to `getSuggestionProvider()`.

/**
 * Interface: given two adjacent items and the stitch direction, return a
 * suggested overlap (in px) that hides duplicated content between them.
 */
export class SuggestionProvider {
  get available() {
    return false;
  }

  // eslint-disable-next-line no-unused-vars
  async suggestOverlap(prevItem, nextItem, direction) {
    throw new Error('SuggestionProvider.suggestOverlap() not implemented');
  }
}

/** Default no-op provider. Advertises itself as unavailable. */
export class NoopSuggestionProvider extends SuggestionProvider {}

let current = new NoopSuggestionProvider();

export function getSuggestionProvider() {
  return current;
}

export function setSuggestionProvider(provider) {
  current = provider;
}
