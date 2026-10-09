/**
 * Canonical Profile factory.
 *
 * Every profile is built from the same env reads — the only thing that varies is
 * the prefix. That is what makes a new environment a one-line addition rather
 * than a new code path.
 */
import type { Profile } from './profile.types';
import {
  readServiceUrls,
  readAuthConfig,
  readCredentials,
  readWebAppConfig,
  readDefaultHeaders,
} from '../../config/env';

export function buildProfile(shape: {
  name: string;
  envPrefix: string;
  variant?: number;
}): Profile {
  const credentials = readCredentials(shape.envPrefix);
  const webApp = readWebAppConfig(shape.envPrefix);

  return {
    ...shape,
    services: readServiceUrls(shape.envPrefix),
    defaultHeaders: readDefaultHeaders(shape.envPrefix),
    auth: readAuthConfig(shape.envPrefix),
    credentials: {
      tenantId: credentials.tenantId,
      userName: credentials.userName,
      password: credentials.password,
    },
    tenantId: credentials.tenantId,
    testTenantId: credentials.testTenantId,
    crossTenantId: credentials.crossTenantId,
    webAppUrl: webApp.webAppUrl,
    webAppLoginUrl: webApp.webAppLoginUrl,
    postLoginHeading: webApp.postLoginHeading,
  };
}
