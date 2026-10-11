/**
 * `npm run verify:setup` — the Phase-0 gate.
 *
 * Run this BEFORE writing a single test. It answers, in about five seconds, the
 * question that otherwise costs a day: can this workspace reach the backend and
 * authenticate against it?
 *
 * Every automation project that stalls, stalls here — missing credentials, a URL
 * that resolves to a login page, a token in a field nobody documented. Getting a
 * green run from this script is the real start of the project.
 *
 *   1. resolve + validate the active profile
 *   2. mint a token with the configured strategy
 *   3. decode it (expiry, subject) when it is a JWT
 *   4. probe the PRIMARY host's VERIFY_PATH (the gate) + any host with its own
 *      <HOST>_VERIFY_PATH; non-primary hosts without one get an advisory reachability
 *      check (one path can't be valid on every host, so they never fail the gate)
 */
import { request as pwRequest } from '@playwright/test';
import { getProfile, profileNames } from '../config/profiles.index';
import { SERVICES, serviceKeys, primaryServiceKey } from '../config/services';
import { mintToken, authHeaders, decodeJwtClaims, subjectFromClaims } from '../common/auth/token';
import { env } from '../config/env';
import type { Profile } from '../common/profiles/profile.types';

const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const bad = (msg: string) => console.log(`  ✗ ${msg}`);
const info = (msg: string) => console.log(`    ${msg}`);
const heading = (msg: string) => console.log(`\n${msg}\n${'─'.repeat(msg.length)}`);

/** Never print a secret in full — enough to confirm it is set, not enough to leak. */
const mask = (value: string | undefined): string => {
  if (!value) return '(not set)';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
};

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function main(): Promise<void> {
  console.log('\nAutomation setup verification');
  console.log('=============================');

  // ── 1. Profile ──────────────────────────────────────────────────────────
  heading(`1. Profile — '${env.profile}'`);
  let profile: Profile;
  try {
    profile = getProfile();
    ok(`profile '${profile.name}' resolved (known: ${profileNames().join(', ')})`);
    info(`tenant id       : ${profile.testTenantId || '(not set)'}`);
    info(`cross-tenant id : ${profile.crossTenantId ?? '(not set — isolation tests will skip)'}`);
    info(`web app url     : ${profile.webAppUrl || '(not set — UI tier not configured)'}`);
  } catch (err) {
    bad((err as Error).message);
    console.log('\nFix .env and run again.\n');
    process.exit(1);
    return;
  }

  // ── 2. Services ─────────────────────────────────────────────────────────
  heading('2. Services');
  const configured: Array<{ key: string; url: string }> = [];
  for (const key of serviceKeys()) {
    const def = SERVICES[key];
    const url = profile.services[key];
    if (url) {
      ok(`${String(key).padEnd(12)} ${url}`);
      configured.push({ key: String(key), url });
    } else {
      bad(`${String(key).padEnd(12)} ${def.envKey} is not set — ${def.description}`);
    }
  }
  if (configured.length === 0) {
    console.log('\nNo service URLs configured. Set them in .env and run again.\n');
    process.exit(1);
    return;
  }

  // ── 3. Authentication ───────────────────────────────────────────────────
  heading(`3. Authentication — strategy '${profile.auth.strategy}'`);
  if (profile.auth.strategy === 'password') {
    info(`login url  : ${joinUrl(profile.auth.baseUrl, profile.auth.loginPath)}`);
    info(`body fields: ${[profile.auth.usernameField, profile.auth.passwordField, profile.auth.tenantField]
      .filter(Boolean)
      .join(', ')}`);
    info(`token field: ${profile.auth.tokenField}`);
    info(`username   : ${profile.credentials.userName || '(not set)'}`);
    info(`password   : ${mask(profile.credentials.password)}`);
  }

  let token = '';
  if (profile.auth.strategy === 'none') {
    ok('strategy is `none` — no token required');
  } else {
    try {
      token = await mintToken(profile, true);
      ok(`token minted — ${mask(token)}`);

      const claims = decodeJwtClaims(token);
      if (claims) {
        const subject = subjectFromClaims(claims);
        if (subject) info(`subject : ${subject}`);
        if (typeof claims.exp === 'number') {
          const expiresAt = new Date(claims.exp * 1000);
          const minutes = Math.round((expiresAt.getTime() - Date.now()) / 60_000);
          info(`expires : ${expiresAt.toISOString()} (in ${minutes} min)`);
          if (minutes < 5) {
            bad('token expires in under 5 minutes — long suites will need the 401 re-mint path');
          }
        }
      } else {
        info('opaque token (not a JWT) — no claims to decode');
      }
    } catch (err) {
      bad((err as Error).message);
      console.log(
        '\nAuthentication is the blocker for everything else. Common causes:\n' +
          '  • AUTH_TOKEN_FIELD does not match the response (the error above lists the real keys)\n' +
          '  • AUTH_USERNAME_FIELD / AUTH_PASSWORD_FIELD do not match what the endpoint expects\n' +
          '  • the login endpoint needs an extra constant field → set AUTH_EXTRA_BODY\n' +
          '  • credentials are wrong, or the account is locked\n' +
          '  • your provider needs a strategy this template does not ship — add a case to\n' +
          '    common/auth/token.ts (it is the only file that has to change)\n',
      );
      process.exit(1);
      return;
    }
  }

  // ── 4. Authenticated probe ──────────────────────────────────────────────
  heading('4. Authenticated probe');

  // Exactly what a test sends: profile default headers + auth. If a gateway key
  // is missing, this must fail here rather than in the first spec someone writes.
  const defaultHeaderNames = Object.keys(profile.defaultHeaders);
  if (defaultHeaderNames.length) {
    info(`default headers: ${defaultHeaderNames.join(', ')}`);
  }
  const headers = { ...profile.defaultHeaders, ...authHeaders(profile.auth, token) };
  const primary = primaryServiceKey();
  let anyFailed = false;

  // One VERIFY_PATH cannot be valid on every host. The PRIMARY host is the gate — it uses the
  // global VERIFY_PATH (or its own <PRIMARY>_VERIFY_PATH). A non-primary host is a gate ONLY when
  // it has its own <HOST>_VERIFY_PATH; otherwise it gets an advisory reachability check that never
  // fails the setup (so extra hosts don't red a run just because one path doesn't exist on them).
  for (const { key, url } of configured) {
    const perHost = process.env[`${key.toUpperCase()}_VERIFY_PATH`]?.trim();
    const isPrimary = key === String(primary);
    const verifyPath = perHost || (isPrimary ? env.verifyPath : undefined);
    const ctx = await pwRequest.newContext();
    try {
      if (!verifyPath) {
        // Non-primary host, no verify path configured: advisory only.
        const res = await ctx.get(url, { headers }).catch(() => null);
        if (res) {
          info(`${key.padEnd(12)} reachable (${res.status()}) — set ${key.toUpperCase()}_VERIFY_PATH to probe it as a gate`);
        } else {
          info(`${key.padEnd(12)} not probed — set ${key.toUpperCase()}_VERIFY_PATH for an authenticated check`);
        }
        continue;
      }
      const target = joinUrl(url, verifyPath);
      const res = await ctx.get(target, { headers });
      const status = res.status();
      if (status === 401 || status === 403) {
        bad(`${key.padEnd(12)} ${status} — the token was rejected (${target})`);
        if (defaultHeaderNames.length === 0) {
          info('If a gateway fronts this API it may also require a subscription/API key.');
          info('Set DEFAULT_HEADERS in .env, e.g. {"Ocp-Apim-Subscription-Key":"…"}');
        }
        anyFailed = true;
      } else if (status === 404) {
        bad(`${key.padEnd(12)} 404 — this host does not serve '${verifyPath}' (${target})`);
        info(`Set ${isPrimary ? 'VERIFY_PATH' : `${key.toUpperCase()}_VERIFY_PATH`} to a cheap authenticated GET on this service.`);
        anyFailed = true;
      } else if (status >= 500) {
        bad(`${key.padEnd(12)} ${status} — the service is unhealthy (${target})`);
        anyFailed = true;
      } else {
        ok(`${key.padEnd(12)} ${status} (${target})`);
      }
    } catch (err) {
      bad(`${key.padEnd(12)} request failed — ${(err as Error).message}`);
      info('Check the URL, VPN/network access, and any corporate proxy.');
      anyFailed = true;
    } finally {
      await ctx.dispose();
    }
  }

  // ── Verdict ─────────────────────────────────────────────────────────────
  console.log('');
  if (anyFailed) {
    console.log('Setup is INCOMPLETE — fix the items marked ✗ above, then run again.\n');
    process.exit(1);
  }
  console.log('Setup verified. You can start writing tests.\n');
  console.log('Next:');
  console.log('  1. list your API hosts in config/services.ts');
  console.log('  2. scaffold modules/<your-module>/ (see modules/README.md and AGENTS.md §6)');
  console.log('  3. npm run typecheck && npm test\n');

  console.log(`(primary service: '${String(primary)}' — the \`api\` fixture points here)\n`);
}

void main();
