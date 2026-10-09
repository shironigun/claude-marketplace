/**
 * Shared Zod primitives.
 *
 * Schemas live here when the shape is used by more than one module — a `Customer`
 * embedded in an `Order` response must parse against the same schema the Customer
 * module uses, or the two modules will drift and contract tests will disagree.
 * Module-only shapes belong in `modules/<module>/api/schemas/`.
 *
 * `.passthrough()` on every object is deliberate: unknown extra fields are the
 * backend adding something, which is not a contract break. A missing or
 * wrong-typed KNOWN field is.
 */
import { z } from 'zod';

/** A string that may be null but must be present. */
export const nullableString = z.string().nullable();

/** A string that may be null or absent entirely. */
export const looseString = z.string().nullable().optional();

/** Identifiers — some APIs return numbers, some return numeric strings, some both. */
export const idSchema = z.union([z.number(), z.string()]);

/** ISO-8601 timestamp. Rejects `"not a date"`, accepts `2026-08-11T10:00:00Z`. */
export const isoDateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'not a valid ISO-8601 date' });

/** Audit columns, present on most persisted entities. All optional by design. */
export const auditFields = z
  .object({
    createdAt: looseString,
    updatedAt: looseString,
    createdBy: looseString,
    updatedBy: looseString,
  })
  .partial()
  .passthrough();

/** Envelope for `{ data: [...], total, pageNumber, pageSize }` list responses. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      data: z.array(item),
      total: z.number().optional(),
      pageNumber: z.number().optional(),
      pageSize: z.number().optional(),
    })
    .passthrough();
}

/**
 * A list endpoint that returns either a bare array or a `{ data: [...] }` envelope.
 * Use while the shape is genuinely ambiguous — then narrow it once confirmed, and
 * record the finding in `docs/subsystems/<module>.md`.
 */
export function arrayOrEnvelope<T extends z.ZodTypeAny>(item: T) {
  return z.union([z.array(item), paginated(item)]);
}

/** Standard problem-details error body (RFC 7807), loosely matched. */
export const problemDetails = z
  .object({
    type: looseString,
    title: looseString,
    status: z.number().optional(),
    detail: looseString,
    errors: z.record(z.unknown()).optional(),
  })
  .passthrough();
