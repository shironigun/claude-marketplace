import { parseSource, type N } from '../src/parse/parse.ts';

export function expr(code: string): { node: N; src: string } {
  const src = `const __value = ${code};`;
  const ast = parseSource(src, 'expr.tsx');
  return { node: ast.program.body[0].declarations[0].init, src };
}

export function file(src: string, name = 'file.tsx'): N {
  return parseSource(src, name);
}
