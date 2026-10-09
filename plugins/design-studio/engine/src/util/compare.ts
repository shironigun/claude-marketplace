/** Orders strings by UTF-16 code unit, the order a bare `Array#sort()` uses, so output never depends on locale. */
export const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
