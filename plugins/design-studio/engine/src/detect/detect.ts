import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readText } from '../util/read.ts';
import { walkFiles } from '../util/fs-walk.ts';
import { isDir, isObject, isString } from '../util/guards.ts';
import { appRelative, firstLine } from '../util/messages.ts';
import { DEFAULT_EXCLUDE, withDefaults, type AppConfig } from '../config/config.ts';

export interface StackInfo {
  packageName: string | null;
  react: string | null;
  mui: string | null;
  router: string | null;
  i18n: string | null;
  query: string | null;
  state: string | null;
  testRunner: string | null;
  storybook: string | null;
  typescript: boolean;
  styling: { sx: number; styled: number; makeStyles: number; styleProp: number; cssFiles: number };
  themeEntry: string | null;
  providersEntry: string | null;
  moduleRoots: string[];
  sharedRoots: string[];
  /** What could not be read while detecting (an unreadable or malformed package.json, a source file or folder), app-relative. */
  problems: string[];
}

export interface PackageInfo {
  name: string | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

const MODULE_ROOTS = ['src/components', 'src/features', 'src/modules', 'src/pages', 'src/views'];
const SHARED_ROOTS = ['src/common/components', 'src/components/common', 'src/components/shared', 'src/shared/components', 'src/ui', 'src/components/ui'];
const THEME_CANDIDATES = ['src/theme/index.ts', 'src/theme/index.tsx', 'src/theme.ts', 'src/theme.tsx', 'src/styles/theme.ts'];
const PROVIDER_CANDIDATES = ['src/app.tsx', 'src/App.tsx', 'src/main.tsx', 'src/index.tsx'];

const count = (text: string, re: RegExp): number => (text.match(re) ?? []).length;
// A dependency map is user input: anything but an object of version strings counts as no dependencies.
const depMap = (v: unknown): Record<string, string> =>
  isObject(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => isString(e[1]))) : {};

/**
 * Reads `<app>/package.json` without ever throwing. A missing file is an empty package; an unreadable, malformed
 * or non-object one is an empty package plus a `problem` (app-relative).
 */
export function readPackageJson(appRootAbs: string): { pkg: PackageInfo; problem: string | null } {
  const empty: PackageInfo = { name: null, dependencies: {}, devDependencies: {}, peerDependencies: {} };
  const path = join(appRootAbs, 'package.json');
  if (!existsSync(path)) return { pkg: empty, problem: null };
  let json: unknown;
  try {
    json = JSON.parse(readText(path));
  } catch (e) {
    const what = e instanceof SyntaxError ? `package.json: ${firstLine(e)}` : `read: ${firstLine(e)}`;
    return { pkg: empty, problem: appRelative(what, appRootAbs) };
  }
  if (!isObject(json)) return { pkg: empty, problem: 'package.json: not a JSON object' };
  return {
    pkg: {
      name: isString(json.name) ? json.name : null,
      dependencies: depMap(json.dependencies),
      devDependencies: depMap(json.devDependencies),
      peerDependencies: depMap(json.peerDependencies),
    },
    problem: null,
  };
}

/** Never throws: whatever cannot be read is left out and listed in `problems`. */
export function detectStack(appRootAbs: string): StackInfo {
  const problems: string[] = [];
  const unreadable = (e: unknown): void => { problems.push(appRelative(`read: ${firstLine(e)}`, appRootAbs)); };
  const { pkg, problem } = readPackageJson(appRootAbs);
  if (problem !== null) problems.push(problem);
  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
  const pick = (...names: string[]): string | null => {
    for (const n of names) if (Object.hasOwn(deps, n) && deps[n]) return `${n}@${deps[n]}`;
    return null;
  };
  const files = walkFiles(appRootAbs, { include: ['src/**/*.{ts,tsx,js,jsx,css,scss,less}'], exclude: DEFAULT_EXCLUDE, onError: (_dir, e) => unreadable(e) });
  const styling = { sx: 0, styled: 0, makeStyles: 0, styleProp: 0, cssFiles: 0 };
  const texts = new Map<string, string>();
  for (const f of files) {
    if (/\.(css|scss|less)$/i.test(f)) { styling.cssFiles++; continue; }
    let text: string;
    try { text = readText(join(appRootAbs, f)); } catch (e) { unreadable(e); continue; }
    texts.set(f, text);
    styling.sx += count(text, /\bsx=\{/g);
    styling.styled += count(text, /\bstyled(?:\(|\.\w+`)/g);
    styling.makeStyles += count(text, /\bmakeStyles\b/g);
    styling.styleProp += count(text, /\bstyle=\{\{/g);
  }
  const anyContaining = (re: RegExp): string | null => [...texts.keys()].find((f) => re.test(texts.get(f) ?? '')) ?? null;
  const candidateContaining = (cands: string[], re: RegExp): string | null => cands.find((c) => re.test(texts.get(c) ?? '')) ?? null;
  return {
    packageName: pkg.name,
    react: pick('react'),
    mui: pick('@mui/material'),
    router: pick('react-router-dom', 'react-router'),
    i18n: pick('react-i18next', 'i18next'),
    query: pick('@tanstack/react-query', 'react-query'),
    state: pick('@reduxjs/toolkit', 'redux', 'zustand'),
    testRunner: pick('vitest', 'jest'),
    storybook: pick('storybook', '@storybook/react-vite', '@storybook/react'),
    typescript: existsSync(join(appRootAbs, 'tsconfig.json')),
    styling,
    themeEntry: THEME_CANDIDATES.find((c) => texts.has(c)) ?? anyContaining(/\bcreateTheme\(/),
    providersEntry: candidateContaining(PROVIDER_CANDIDATES, /<ThemeProvider\b/) ?? anyContaining(/<ThemeProvider\b/),
    moduleRoots: MODULE_ROOTS.filter((r) => isDir(join(appRootAbs, r))),
    sharedRoots: SHARED_ROOTS.filter((r) => isDir(join(appRootAbs, r))),
    problems,
  };
}

export function proposeConfig(stack: StackInfo, appRootAbs: string): AppConfig {
  return withDefaults({
    // `||`, not `??`: an empty package name is no name, and the config schema needs a non-empty product.
    product: stack.packageName || basename(appRootAbs),
    appRoot: '.',
    sources: ['src/**/*.{ts,tsx,js,jsx}', 'src/**/*.{css,scss,less}'],
    libraryHome: stack.sharedRoots[0] ?? 'src/components/shared',
    themeEntry: stack.themeEntry,
    providersEntry: stack.providersEntry,
    modules: { roots: stack.moduleRoots, shared: stack.sharedRoots },
    protectedPaths: isDir(join(appRootAbs, 'src/routes')) ? ['src/routes/**'] : [],
  });
}
