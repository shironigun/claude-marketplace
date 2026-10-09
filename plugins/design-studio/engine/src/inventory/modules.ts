import { posix } from 'node:path';
import type { AppConfig } from '../config/config.ts';

const THEME_FOLDER_RE = /(^|\/)theme\//;

/**
 * True for the files that define the theme: the configured theme entry and anything under a `theme/` folder. Their
 * literal values are the tokens themselves, so they are never counted as raw values or status maps.
 */
export function isThemeSource(file: string, cfg: Pick<AppConfig, 'themeEntry'>): boolean {
  return (cfg.themeEntry !== null && file === posix.normalize(cfg.themeEntry.replace(/\\/g, '/'))) || THEME_FOLDER_RE.test(file);
}

/** A configured root without its trailing slashes. */
export const norm = (r: string): string => r.replace(/\/+$/, '');

export function sharedRootOf(file: string, cfg: AppConfig): string | null {
  return cfg.modules.shared.find((r) => file.startsWith(`${norm(r)}/`)) ?? null;
}

export function moduleOf(file: string, cfg: AppConfig): string | null {
  if (sharedRootOf(file, cfg)) return 'shared';
  for (const root of cfg.modules.roots) {
    const prefix = `${norm(root)}/`;
    if (!file.startsWith(prefix)) continue;
    const rest = file.slice(prefix.length);
    const slash = rest.indexOf('/');
    return slash > 0 ? rest.slice(0, slash) : null;
  }
  return null;
}
