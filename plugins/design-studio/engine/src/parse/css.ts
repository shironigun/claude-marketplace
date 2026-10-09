export interface CssDecl { property: string; value: string; line: number }

export function kebabToCamel(prop: string): string {
  return prop.replace(/^-+/, '').replace(/-([a-z])/g, (_m: string, ch: string) => ch.toUpperCase());
}

export function parseCssDeclarations(text: string): CssDecl[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const out: CssDecl[] = [];
  // A declaration ends at `;`, at `}` or, for the last one in a template or file, at the end of the text.
  const re = /([a-zA-Z-]+)\s*:\s*([^;{}]+?)\s*(?=[;}]|$)/g;
  let line = 1;
  let last = 0;
  for (const m of clean.matchAll(re)) {
    const idx = m.index ?? 0;
    for (let i = last; i < idx; i++) if (clean.charCodeAt(i) === 10) line++;
    last = idx;
    out.push({ property: kebabToCamel(m[1]), value: m[2].trim(), line });
  }
  return out;
}
