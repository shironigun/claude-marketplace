import { type ZodError } from 'zod';

/**
 * Format a ZodError into a readable `expect()` failure message.
 *
 *   const parsed = orderSchema.safeParse(body);
 *   expect(parsed.success, formatZodError(parsed.error)).toBe(true);
 *
 * Without this you get `expected true, received false` and have to re-run with a
 * console.log to find out which field drifted.
 */
export function formatZodError(error: ZodError | undefined): string {
  if (!error) return '';
  return error.issues.map((i) => `  [${i.path.join('.') || '<root>'}] ${i.message}`).join('\n');
}
