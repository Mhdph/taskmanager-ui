import { Store } from '@tanstack/react-store';

/**
 * Compatibility adapter for the existing action modules' nested assignments.
 * TanStack Store batches notifications; React subscribes to revision changes.
 * New state consumers can subscribe with useSelector instead of a render loop.
 */
export function createReactiveState<T extends object>(initial: T) {
  const store = new Store({ value: initial, revision: 0 });
  const proxies = new WeakMap<object, object>();
  const targets = new WeakMap<object, object>();
  let queued = false;
  function notify() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      store.setState(previous => ({ ...previous, revision: previous.revision + 1 }));
    });
  }
  const unwrap = (value: any) => targets.get(value) || value;
  function wrap<V>(value: V): V {
    if (!value || typeof value !== 'object') return value;
    const target = value as object;
    if (targets.has(target)) return value;
    const cached = proxies.get(target);
    if (cached) return cached as V;
    // Browser files, DOM nodes, dates, and other class instances require their
    // original receiver for native accessors. Only wrap data containers.
    const prototype = Object.getPrototypeOf(target);
    if (!(target instanceof Set) && !Array.isArray(target) && prototype !== Object.prototype && prototype !== null) return value;
    const proxy = new Proxy(target, {
      get(object, key, receiver) {
        // Native Set methods require the raw Set as receiver.
        if (object instanceof Set) {
          if (key === 'add')
            return (item: unknown) => {
              const size = object.size;
              object.add(unwrap(item));
              if (size !== object.size) notify();
              return receiver;
            };
          if (key === 'delete')
            return (item: unknown) => {
              const removed = object.delete(unwrap(item));
              if (removed) notify();
              return removed;
            };
          if (key === 'clear')
            return () => {
              if (!object.size) return;
              object.clear();
              notify();
            };
          const result = Reflect.get(object, key, object);
          return typeof result === 'function' ? result.bind(object) : result;
        }
        return wrap(Reflect.get(object, key, receiver));
      },
      set(object, key, next) {
        const raw = unwrap(next);
        if (Object.is(Reflect.get(object, key), raw)) return true;
        const result = Reflect.set(object, key, raw);
        if (result) notify();
        return result;
      },
      deleteProperty(object, key) {
        const exists = Reflect.has(object, key);
        const result = Reflect.deleteProperty(object, key);
        if (exists && result) notify();
        return result;
      },
    });
    proxies.set(target, proxy);
    targets.set(proxy, target);
    return proxy as V;
  }
  return { state: wrap(initial), store, notify };
}
