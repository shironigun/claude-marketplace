/** The first line of an error's message (or of any thrown value): enough to say what failed, without a stack. */
export function firstLine(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).split('\n')[0];
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A relative path ends at whitespace, a quote or punctuation that cannot be part of one.
const REST = '[^\\s\'"`<>|*?:;,()]*';

/**
 * Rewrites every absolute form of `appRootAbs` (back- or forward-slashed) in `message` as an app-relative POSIX
 * path, and the bare root as `.`, so that nothing stored in the registry or the report depends on where the app lives.
 */
export function appRelative(message: string, appRootAbs: string): string {
  const fwd = appRootAbs.replace(/\\/g, '/').replace(/\/+$/, '');
  if (fwd === '') return message; // the filesystem root: there is nothing to make relative to
  const forms = [...new Set([fwd, fwd.replace(/\//g, '\\')])].map(escapeRe).join('|');
  const re = new RegExp(`(?:${forms})(?![\\w-]|\\.\\w)(?:[\\\\/](${REST}))?`, 'g');
  return message.replace(re, (_whole, rest: string | undefined) => (rest ? rest.replace(/\\/g, '/') : '.'));
}
