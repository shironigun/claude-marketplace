import { type APIResponse, type TestInfo, test } from '@playwright/test';
import { env } from '../../config/env';

/**
 * Parse a JSON body, surfacing the raw text on failure.
 *
 * Worth the wrapper: `res.json()` on an error page throws `Unexpected token <`, which
 * tells you nothing. This tells you the status and the first 500 chars.
 */
export async function json<T = unknown>(res: APIResponse): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON but got (status ${res.status()}): ${text.slice(0, 500)}`);
  }
}

/**
 * Throw with context when a setup/teardown call did not succeed — never let a failed
 * create or delete pass silently (a Playwright APIResponse does not throw on 4xx/5xx).
 */
export async function ensureOk(res: APIResponse, label: string): Promise<void> {
  if (res.ok()) return;
  const body = (await res.text()).slice(0, 500);
  throw new Error(`${label}: ${res.status()} ${res.url()}\n${body}`);
}

/** A database deadlock-victim message some backends surface in a 500 body ("rerun the transaction"). */
const DEADLOCK_VICTIM = /deadlock/i;

/**
 * ensureOk for CLEANUP calls only (test cleanup, seed teardown, sweep): sends the request
 * and, when the backend answers 500 with a deadlock-victim message, sends it ONCE more.
 * Any other failure, or a second deadlock, throws like ensureOk. Never use it for a request
 * a test asserts on — assertions see the first response; CI retries are the flake net there.
 */
export async function ensureOkRetryingDeadlock(
  send: () => Promise<APIResponse>,
  label: string,
): Promise<APIResponse> {
  let res = await send();
  if (res.status() === 500 && DEADLOCK_VICTIM.test(await res.text())) res = await send();
  await ensureOk(res, label);
  return res;
}

/**
 * Call immediately after any resource-creating request.
 *
 * A 429 is a transient infra condition, not a test defect — skip rather than fail, and
 * let the retry pick it up. Returns the response so it can be chained.
 */
export function skipIfRateLimited(res: APIResponse): APIResponse {
  test.skip(res.status() === 429, 'Rate limited (429) — skipping; will be retried on the next run.');
  return res;
}

/**
 * Soft response-time check: records an annotation, never fails.
 *
 * Shared test environments are noisy; a hard latency assertion produces false failures
 * that erode trust in the suite faster than any real bug. Make it a hard `expect` only
 * where a real SLA exists.
 */
export function softAssertResponseTime(
  testInfo: TestInfo,
  ms: number,
  thresholdMs: number = env.responseTimeThresholdMs,
): void {
  const status = ms <= thresholdMs ? 'ok' : 'slow';
  testInfo.annotations.push({
    type: `response-time:${status}`,
    description: `${ms}ms (threshold ${thresholdMs}ms)`,
  });
}

/** Body text truncated for use as an `expect()` failure message. */
export async function bodyPreview(res: APIResponse, max = 500): Promise<string> {
  const text = await res.text();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
