/**
 * The one HTTP client every test and service uses. A single place for:
 *   • the auth header (from the profile's strategy) and the profile's default headers
 *   • latency measurement (for soft response-time annotations)
 *   • one token re-mint on an unexpected 401 — with this profile's OWN credentials
 *   • turning a cloud host's "application stopped" page into a clear environment error
 *
 * Tests and services never build headers themselves, which is why changing the auth
 * scheme — or adding a gateway key, a signed request, an idempotency header — is a
 * one-file change here.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Profile } from '../profiles/profile.types';
import { mintToken, authHeaders, getCachedUserId } from '../auth/token';

export interface RequestOpts {
  /** Query-string parameters. */
  params?: Record<string, string | number | boolean>;
  /** Extra or overriding headers. Setting the auth header here suppresses the default. */
  headers?: Record<string, string>;
  /** JSON request body. */
  data?: unknown;
  /** `application/x-www-form-urlencoded` body. */
  form?: Record<string, string | number | boolean>;
  /** `multipart/form-data` body — file uploads. */
  multipart?: Record<string, string | number | boolean | { name: string; mimeType: string; buffer: Buffer }>;
  /** Send no token — the only way to assert the 401 path. */
  omitAuth?: boolean;
  /** Per-request timeout override, ms. */
  timeout?: number;
}

export interface TimedResponse {
  res: APIResponse;
  /** Wall-clock latency in ms, for soft response-time annotations. */
  ms: number;
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

// Many managed platforms answer every request with an HTML "app is stopped /
// unavailable" page (a 403 or 503) while the backend is down for maintenance.
// Detecting it turns "every test failed with a schema error" into one clear cause.
const STOPPED_MARKERS = /this (web )?app is stopped|web app - unavailable|service unavailable/i;

/** True when a response is a host-down placeholder page rather than a real API reply. */
export function isStoppedHostPage(status: number, body: string): boolean {
  return (status === 403 || status === 503) && STOPPED_MARKERS.test(body);
}

export class HostStoppedError extends Error {
  constructor(url: string) {
    super(`The API host appears to be stopped or unavailable (environment down): ${url}`);
    this.name = 'HostStoppedError';
  }
}

/**
 * Thin wrapper over Playwright's `APIRequestContext`, bound to one service host and
 * one profile. One instance per service per worker (created by the base fixture).
 */
export class ApiClient {
  /** The authenticated user's id from the token/login, when one is known. */
  readonly userId: string;

  constructor(
    private readonly ctx: APIRequestContext,
    private readonly profile: Profile,
    private token: string,
  ) {
    this.userId = getCachedUserId(profile.name);
  }

  get(route: string, opts?: RequestOpts): Promise<TimedResponse> {
    return this.send('get', route, opts);
  }
  post(route: string, opts?: RequestOpts): Promise<TimedResponse> {
    return this.send('post', route, opts);
  }
  put(route: string, opts?: RequestOpts): Promise<TimedResponse> {
    return this.send('put', route, opts);
  }
  patch(route: string, opts?: RequestOpts): Promise<TimedResponse> {
    return this.send('patch', route, opts);
  }
  delete(route: string, opts?: RequestOpts): Promise<TimedResponse> {
    return this.send('delete', route, opts);
  }

  private buildOptions(opts?: RequestOpts) {
    // Profile defaults first (gateway subscription key, static API key, API-version
    // header), then the caller's — a test can always override one.
    //
    // Need a SIGNED request (HMAC, a per-request nonce, an idempotency key)? Compute
    // it here: this method is the single place every request passes through.
    const headers: Record<string, string> = {
      ...this.profile.defaultHeaders,
      ...(opts?.headers ?? {}),
    };

    // Let Playwright set the content type (and multipart boundary) for form/multipart bodies.
    const hasEncodedBody = !!opts?.form || !!opts?.multipart;
    const hasContentType = Object.keys(headers).some((h) => h.toLowerCase() === 'content-type');
    if (!hasEncodedBody && !hasContentType) headers['Content-Type'] = 'application/json';

    const authHeaderName = this.profile.auth.headerName.toLowerCase();
    const callerSetAuth = Object.keys(headers).some((h) => h.toLowerCase() === authHeaderName);
    if (!opts?.omitAuth && !callerSetAuth) {
      Object.assign(headers, authHeaders(this.profile.auth, this.token));
    }

    return {
      params: opts?.params,
      headers,
      data: opts?.data,
      form: opts?.form,
      multipart: opts?.multipart,
      timeout: opts?.timeout,
    };
  }

  private async send(method: Method, route: string, opts?: RequestOpts): Promise<TimedResponse> {
    const call = async (): Promise<TimedResponse> => {
      const started = Date.now();
      const res = await this.ctx[method](route, this.buildOptions(opts));
      return { res, ms: Date.now() - started };
    };

    let result = await call();

    // A 401 on a request that DID send our token means it expired mid-run: re-mint
    // once with this profile's own credentials and retry. A second 401 is a real
    // authorisation result and is returned as-is.
    const authHeaderName = this.profile.auth.headerName.toLowerCase();
    const sentOurToken =
      !opts?.omitAuth &&
      this.profile.auth.strategy !== 'none' &&
      !Object.keys(opts?.headers ?? {}).some((h) => h.toLowerCase() === authHeaderName);

    if (result.res.status() === 401 && sentOurToken) {
      this.token = await mintToken(this.profile, true);
      result = await call();
    }

    const status = result.res.status();
    if ((status === 403 || status === 503) && isStoppedHostPage(status, await result.res.text())) {
      throw new HostStoppedError(result.res.url());
    }
    return result;
  }
}
