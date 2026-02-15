/**
 * Minimal pub/sub store for InfernoJS (replaces zustand).
 * Usage:
 *   const store = createStore({ count: 0 });
 *   store.set({ count: 1 });
 *   const unsub = store.subscribe((state) => console.log(state));
 */

type Listener<T> = (state: T) => void;

export interface Store<T> {
  get(): T;
  set(partial: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(fn: Listener<T>): () => void;
}

export function createStore<T extends Record<string, any>>(initial: T): Store<T> {
  let state = { ...initial };
  let listeners: Listener<T>[] = [];

  function get(): T {
    return state;
  }

  function set(partial: Partial<T> | ((prev: T) => Partial<T>)): void {
    const updates = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...updates };
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn: Listener<T>): () => void {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  return { get, set, subscribe };
}
