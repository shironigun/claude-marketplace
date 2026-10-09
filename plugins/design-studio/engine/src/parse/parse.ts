import { parse, type ParserPlugin } from '@babel/parser';

export type N = {
  type: string;
  start?: number | null;
  end?: number | null;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  [key: string]: any;
};

export function parseSource(code: string, file: string): N {
  const ts = /\.(ts|tsx|mts|cts)$/i.test(file);
  const jsx = /\.(tsx|jsx|js|mjs|cjs)$/i.test(file);
  const plugins: ParserPlugin[] = ['decorators-legacy'];
  if (ts) plugins.push('typescript');
  if (jsx) plugins.push('jsx');
  return parse(code, { sourceType: 'module', errorRecovery: true, plugins }) as unknown as N;
}
