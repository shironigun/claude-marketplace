/**
 * Runs once per run, before the API projects. A broken login (wrong password, auth host
 * down, a token field that does not match) fails HERE, once, with the cause — instead of
 * every API test failing the same way and burying it.
 */
import { test as setup } from '@playwright/test';
import { getProfile } from '../../config/profiles.index';
import { resolveProfile } from '../auth/token';

setup('API login works for the active profile', async () => {
  // Logs in and resolves the profile's identity from the response (config/profiles.index + token).
  await resolveProfile(getProfile());
});
