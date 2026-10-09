/**
 * Profile registry. `AUTOMATION_PROFILE` selects which one is active.
 *
 * This is also the only place config is validated — and it validates loudly, at
 * worker startup, naming the exact env keys that are missing. A test suite that
 * fails with `401` because a URL was blank costs an afternoon; this costs a line.
 */
import { env } from './env';
import { SERVICES, primaryServiceKey } from './services';
import type { Profile } from '../common/profiles/profile.types';
import { defaultProfile } from '../common/profiles/default.profile';

const registry: Record<string, () => Profile> = {
  default: defaultProfile,

  // Register additional environments/tenants here:
  // staging: stagingProfile,
};

export const profileNames = (): string[] => Object.keys(registry);

function assertProfileConfig(profile: Profile): void {
  const missing: string[] = [];
  const key = (name: string) => `${profile.envPrefix}_${name} (or ${name})`;

  // The primary service must resolve — everything else is opt-in.
  const primary = primaryServiceKey();
  if (!profile.services[primary]) {
    missing.push(key((SERVICES[primary] as { envKey: string }).envKey));
  }

  switch (profile.auth.strategy) {
    case 'password':
      if (!profile.auth.baseUrl) missing.push(key('AUTH_BASE_URL'));
      if (!profile.credentials.userName) missing.push(key('AUTH_USERNAME'));
      if (!profile.credentials.password) missing.push(key('AUTH_PASSWORD'));
      break;
    case 'client-credentials':
      if (!profile.auth.baseUrl) missing.push(key('AUTH_BASE_URL'));
      if (!profile.auth.clientId) missing.push(key('AUTH_CLIENT_ID'));
      if (!profile.auth.clientSecret) missing.push(key('AUTH_CLIENT_SECRET'));
      break;
    case 'static':
      if (!profile.auth.staticToken) missing.push(key('AUTH_STATIC_TOKEN'));
      break;
    case 'none':
      break;
    default:
      throw new Error(
        `Unknown AUTH_STRATEGY '${String(profile.auth.strategy)}'. ` +
          `Valid values: password, client-credentials, static, none.`,
      );
  }

  if (missing.length === 0) return;
  throw new Error(
    `Profile '${profile.name}' is missing required config:\n` +
      missing.map((m) => `  • ${m}`).join('\n') +
      `\nCopy .env.example to .env and fill these in, ` +
      `then re-run \`npm run verify:setup\`.`,
  );
}

/** Resolve the active profile. Validates config and fails with an actionable message. */
export function getProfile(name: string = env.profile): Profile {
  const factory = registry[name];
  if (!factory) {
    throw new Error(
      `Unknown profile '${name}'. Known profiles: ${profileNames().join(', ')}. ` +
        `Register new ones in config/profiles.index.ts.`,
    );
  }
  const profile = factory();
  assertProfileConfig(profile);
  return profile;
}
