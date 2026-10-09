/**
 * Test-body helpers.
 *
 *   knownBug(id, summary)   playwright.dev/docs/test-annotations — test.fail + an annotation shown in
 *                           the HTML report. The test asserts the CORRECT behaviour; it stays green
 *                           while the bug is open and turns red the day it is fixed, telling you to
 *                           remove the marker. Call it on the line immediately BEFORE the assertion
 *                           that exposes the bug — never as the first line: test.fail() turns EVERY
 *                           later failure into an expected one, so a stopped host, network error, auth
 *                           failure or failed setup before that line must stay a real (red) failure.
 *   onlyFor / skipFor       product-VARIANT preconditions only (a feature that exists for one variant
 *                           of the product and not another). Keys off `profile.variant`. Never use a
 *                           skip to hide a failed setup call.
 *   authGuardTests          one "401 without a token" test per route, tagged @security — proves the
 *                           endpoint (or the gateway in front of it) rejects an unauthenticated call.
 */
import { test as pwTest } from '@playwright/test';
import { test as baseTest, expect } from './base';
import type { Profile } from '../profiles/profile.types';
import type { ServiceKey } from '../../config/services';

export function knownBug(id: string, summary: string): void {
  pwTest.info().annotations.push({ type: 'known-bug', description: `${id}: ${summary}` });
  pwTest.fail(true, `${id}: ${summary}`);
}

/** Run only when the active profile's `variant` is one of `variants`. */
export function onlyFor(profile: Profile, variants: number[], reason: string): void {
  pwTest.skip(
    profile.variant === undefined || !variants.includes(profile.variant),
    `Only for variant ${variants.join('/')}: ${reason}`,
  );
}

/** Skip when the active profile's `variant` is one of `variants`. */
export function skipFor(profile: Profile, variants: number[], reason: string): void {
  pwTest.skip(
    profile.variant !== undefined && variants.includes(profile.variant),
    `Not for variant ${variants.join('/')}: ${reason}`,
  );
}

export interface GuardedRoute {
  /** Test title, kept verbatim from the test it replaces. */
  title: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  route: string;
  data?: unknown;
}

/** Registers one "401 without a token" test per route. Call at the top level of a spec file. */
export function authGuardTests(host: ServiceKey, routes: GuardedRoute[], tags: string[]): void {
  for (const r of routes) {
    baseTest(r.title, { tag: ['@security', ...tags] }, async ({ apis }) => {
      const { res } = await apis[host][r.method](r.route, { omitAuth: true, data: r.data });
      await expect(res).toHaveStatus(401);
    });
  }
}
