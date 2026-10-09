/** The bucket stored under `key`, created with `make` (and stored) the first time the key is seen. */
export function bucketOf<K, B>(m: Map<K, B>, key: K, make: () => B): B {
  let b = m.get(key);
  if (b === undefined) { b = make(); m.set(key, b); }
  return b;
}

/** Appends `value` to the list under `key`. */
export function pushTo<K, V>(m: Map<K, V[]>, key: K, value: V): void {
  bucketOf(m, key, (): V[] => []).push(value);
}

/** Adds `value` to the set under `key`. */
export function addTo<K, V>(m: Map<K, Set<V>>, key: K, value: V): void {
  bucketOf(m, key, () => new Set<V>()).add(value);
}

/** Groups `items` by `key`, keeping their order within each group and the order in which the keys first appear. */
export function groupBy<T, K>(items: Iterable<T>, key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) pushTo(m, key(it), it);
  return m;
}
