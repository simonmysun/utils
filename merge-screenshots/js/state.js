// Minimal observable store. No dependencies.

export function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();

  return {
    get() {
      return state;
    },
    set(updater) {
      state = typeof updater === 'function' ? updater(state) : updater;
      subscribers.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
