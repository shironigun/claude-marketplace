/**
 * `orders/{orderId}` + { orderId: 7 } → `orders/7`.
 *
 * The one route filler for every module. Throws on a missing param — an unfilled
 * `{placeholder}` would otherwise be sent to the API as a literal path segment and
 * produce a mystifying 404. Values are URL-encoded so an id with a slash or space
 * cannot break out of its path segment.
 */
export function fillRoute(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`fillRoute: missing param '${key}' in template '${template}'`);
    }
    return encodeURIComponent(String(value));
  });
}
