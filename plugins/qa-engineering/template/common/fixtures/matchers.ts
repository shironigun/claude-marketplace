/**
 * Custom API matchers (playwright.dev/docs/test-assertions#add-custom-matchers-using-expectextend).
 *
 *   await expect(res).toHaveStatus(400)        exact status; prints url + body on failure
 *   await expect(res).toMatchContract(schema)  200 + Zod shape; readable issue list
 *
 * Use the built-in `await expect(res).toBeOK()` when any 2xx is correct. Both matchers
 * accept an APIResponse or the `{ res }` object the ApiClient returns.
 */
import { expect as baseExpect, type APIResponse } from '@playwright/test';
import type { ZodTypeAny } from 'zod';

type ResponseLike = APIResponse | { res: APIResponse };

function unwrap(received: ResponseLike): APIResponse {
  return 'res' in received ? received.res : received;
}

async function bodyPreview(res: APIResponse): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '<body unavailable>';
  }
}

export const expect = baseExpect.extend({
  async toHaveStatus(received: ResponseLike, expected: number) {
    const res = unwrap(received);
    const actual = res.status();
    const pass = actual === expected;
    // Only read the body when the assertion is going to fail.
    const body = pass === this.isNot ? await bodyPreview(res) : '';
    return {
      pass,
      name: 'toHaveStatus',
      expected,
      actual,
      message: () =>
        `${this.utils.matcherHint('toHaveStatus', undefined, undefined, { isNot: this.isNot })}\n\n` +
        `${res.url()}\n` +
        `Expected status: ${this.isNot ? 'not ' : ''}${expected}\n` +
        `Received status: ${actual}\n` +
        (body ? `Body: ${body}` : ''),
    };
  },

  async toMatchContract(received: ResponseLike, schema: ZodTypeAny) {
    const res = unwrap(received);
    const status = res.status();
    let pass = false;
    let detail = '';
    if (status !== 200) {
      detail = `Expected status 200, received ${status}\n${res.url()}\n${await bodyPreview(res)}`;
    } else {
      const text = await res.text();
      let body: unknown;
      let parsedOk = true;
      try {
        body = JSON.parse(text);
      } catch {
        parsedOk = false;
        detail = `Expected a JSON body, received: ${text.slice(0, 500)}`;
      }
      if (parsedOk) {
        const parsed = schema.safeParse(body);
        pass = parsed.success;
        if (!parsed.success) {
          detail =
            `${res.url()}\nContract violations:\n` +
            parsed.error.issues.map((i) => `  [${i.path.join('.')}] ${i.message}`).join('\n');
        }
      }
    }
    return {
      pass,
      name: 'toMatchContract',
      message: () =>
        `${this.utils.matcherHint('toMatchContract', undefined, undefined, { isNot: this.isNot })}\n\n` +
        (pass ? 'Response matched the contract.' : detail),
    };
  },
});
