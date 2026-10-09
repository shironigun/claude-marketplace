import type { N } from '../parse/parse.ts';
import { walk, lineOf, endLineOf, textOf, unwrap, containsJsx, EXPRESSION_WRAPPERS, TS_EXPRESSION_WRAPPERS, type Visitor } from '../parse/walk.ts';
import { calleeName, isStyledRef } from '../parse/callee.ts';
import { jsxName, jsxAttrString } from '../parse/jsx.ts';
import { keyName } from '../parse/literal.ts';
import { muiPrimitiveName, type ImportBinding } from '../parse/imports.ts';
import { cmp } from '../util/compare.ts';
import type { ModuleInfo } from './module-info.ts';

export interface RenderedEl { name: string; line: number; props: Record<string, string> }
export interface ComponentSignals {
  data: boolean;
  dataHooks: string[];
  slots: number;
  region: boolean;
  primaryActions: number;
  pageArea: boolean;
  domainProps: boolean;
  styledTarget: string | null;
}
export interface ComponentDef {
  id: string;
  name: string;
  local: string;
  file: string;
  line: number;
  loc: number;
  exportNames: string[];
  rendered: RenderedEl[];
  signals: ComponentSignals;
  /**
   * The identifiers the component reads in expression position (sorted), so a module-level status map, style object
   * or makeStyles hook can be tied to the components that use it. Internal: not part of the registry.
   */
  refs: string[];
}
// `valueRefs` are the component (or alias) names the file uses as a value outside the component's own declaration.
export interface FindResult { components: ComponentDef[]; aliases: Map<string, string>; valueRefs: string[] }

const PASCAL = /^[A-Z][A-Za-z0-9_]*$/;
const WRAPPERS = new Set(['memo', 'forwardRef', 'observer', 'React.memo', 'React.forwardRef']);
const DATA_CALLS = new Set(['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery', 'useQueries', 'useSelector', 'useAppSelector', 'useDispatch', 'useAppDispatch', 'useParams', 'useSearchParams', 'useNavigate', 'useLoaderData', 'fetch', 'axios']);
const DATA_HOOK_RE = /^use\w+(Query|Mutation|Subscription)$|^use\w*(Socket|SignalR|Hub)\w*$/;
const NOT_DATA_HOOKS = new Set(['useMediaQuery']);
const DATA_SOURCE_RE = /(^|\/)(api|apis|services?|queries|mutations)(\/|$)|[-.](api|service)$/i;
// Each alias hop, utility argument and interface heritage clause costs one level.
const MAX_TYPE_DEPTH = 8;
const PARTIAL_UTILITIES = new Set(['Partial', 'Readonly', 'Required', 'Omit', 'Pick']);
const DATA_NAME_RE = /(Api|API|Service)$/;
const REGION = new Set(['Dialog', 'Drawer', 'SwipeableDrawer', 'Popover', 'Table', 'TableContainer', 'AppBar', 'nav', 'header', 'aside', 'form']);
const SLOT_TYPE_RE = /ReactNode|ReactElement|JSX\.Element|ReactChild|ReactPortal/;
const DOMAIN_SOURCE_RE = /(^|\/)(models?|types?|interfaces?|entities|dto)(\/|$)/i;
const PAGE_AREA_RE = /\b100d?vh\b|<Outlet\b|<Container\b[^>]*\bmaxWidth/;

export function pascalFromFile(file: string): string {
  const parts = file.split('/');
  let base = parts[parts.length - 1].replace(/\.[^.]+$/, '');
  if (base === 'index' && parts.length > 1) base = parts[parts.length - 2];
  const name = base.split(/[-_.\s]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('');
  return /^[A-Z]/.test(name) ? name : `C${name}`;
}

// Walks the runtime part of a tree. Identifiers in type positions are not runtime references, so TS nodes are skipped;
// the expression wrappers are entered and their type child is skipped by the same rule.
function walkRuntime(root: N, visit: Visitor): void {
  walk(root, (n, parents) => (n.type.startsWith('TS') && !TS_EXPRESSION_WRAPPERS.has(n.type) ? 'skip' : visit(n, parents)));
}

// An Identifier that reads a binding: not a non-computed property key and not the property of a member access.
function isValueRef(n: N, parents: readonly N[]): boolean {
  const parent = parents[parents.length - 1];
  const isKey = !!parent && !parent.computed && ((parent.type === 'ObjectProperty' && parent.key === n) || (parent.type === 'MemberExpression' && parent.property === n));
  return n.type === 'Identifier' && !isKey;
}

// True when the Identifier sits where a name is bound, not read: a parameter, a declarator id, a destructuring target or a catch parameter.
function isBinding(n: N, parent: N | undefined, grand: N | undefined): boolean {
  if (!parent) return false;
  return (parent.type === 'VariableDeclarator' && parent.id === n)
    || (parent.type === 'CatchClause' && parent.param === n)
    || (Array.isArray(parent.params) && parent.params.includes(n))
    || (parent.type === 'AssignmentPattern' && parent.left === n)
    || parent.type === 'ArrayPattern'
    || parent.type === 'RestElement'
    || (parent.type === 'ObjectProperty' && grand?.type === 'ObjectPattern' && parent.value === n);
}

// An Identifier that uses a binding as a value. Reading it for what it carries is not a use of the thing itself:
// the object of a member access (`X.displayName = …`, `X?.prop`, `X['k']`), the target of `Object.assign(X, …)`,
// a plain alias (`const A = X`) and a binding position that only reuses the name.
function isValueUse(n: N, parents: readonly N[]): boolean {
  if (!isValueRef(n, parents) || isBinding(n, parents[parents.length - 1], parents[parents.length - 2])) return false;
  // Type assertions and parentheses around the identifier are looked through.
  let k = parents.length - 1;
  let node = n;
  while (k >= 0 && EXPRESSION_WRAPPERS.has(parents[k].type)) { node = parents[k]; k--; }
  const parent = parents[k];
  if (!parent) return true;
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && parent.object === node) return false;
  if ((parent.type === 'CallExpression' || parent.type === 'OptionalCallExpression') && parent.arguments[0] === node && calleeName(parent.callee, 'dotted') === 'Object.assign') return false;
  return !(parent.type === 'VariableDeclarator' && parent.init === node && parent.id.type === 'Identifier');
}

// A variable statement is split into its declarators, so each unit declares at most one component.
const unitsOf = (stmt: N): N[] => {
  const inner = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt;
  return inner?.type === 'VariableDeclaration' ? inner.declarations : [stmt];
};

// The names in `names` the file uses as a value from outside the declaration that defines them, e.g. `slots={{ day: X }}`,
// `fn(X)` or `{ a: X }` (see isValueUse for what does not count). Statements that only expose a name (`export { X }`,
// `export default memo(X)`, `const Y = memo(X)`) are not uses, and neither are the JSX renders the graph already counts.
// `owners` maps a declaration to the component it defines.
function findValueRefs(ast: N, names: ReadonlySet<string>, owners: ReadonlyMap<N, string>, aliasDecls: ReadonlySet<N>): string[] {
  const used = new Set<string>();
  for (const stmt of ast.program.body) {
    if ((stmt.type === 'ExportNamedDeclaration' && !stmt.declaration) || (stmt.type === 'ExportDefaultDeclaration' && !owners.has(stmt))) continue;
    for (const unit of unitsOf(stmt)) {
      if (aliasDecls.has(unit)) continue;
      const owner = owners.get(unit);
      walkRuntime(unit, (n, parents) => { if (n.type === 'Identifier' && n.name !== owner && names.has(n.name) && isValueUse(n, parents)) used.add(n.name); });
    }
  }
  return [...used].sort();
}

function styledTargetOf(arg: N | null | undefined): string | null {
  const a = unwrap(arg);
  if (!a) return null;
  if (a.type === 'StringLiteral') return a.value;
  return calleeName(a, 'dotted');
}

// The element a `styled.div` / `styled['div']` factory targets.
const memberTarget = (m: N): string | null => m.property.name ?? m.property.value ?? null;

interface Init { fn: N; styledTarget: string | null; propsTypeArg: N | null }

const typeArgsOf = (n: N | null | undefined): N[] => n?.typeParameters?.params ?? n?.typeArguments?.params ?? [];

// memo<Props>(...) carries the props type first; forwardRef<El, Props>(...) carries it second.
const wrapperPropsIndex = (wrapper: string): number => (wrapper.endsWith('forwardRef') ? 1 : 0);

function componentInit(init0: N | null | undefined): Init | null {
  const init = unwrap(init0);
  if (!init) return null;
  if ((init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression' || init.type === 'ClassExpression') && containsJsx(init)) return { fn: init, styledTarget: null, propsTypeArg: null };
  if (init.type === 'CallExpression') {
    const callee = unwrap(init.callee);
    const wrapper = calleeName(callee, 'dotted') ?? '';
    if (WRAPPERS.has(wrapper)) {
      const inner = componentInit(init.arguments[0]);
      return inner && { ...inner, propsTypeArg: inner.propsTypeArg ?? typeArgsOf(init)[wrapperPropsIndex(wrapper)] ?? null };
    }
    if (callee?.type === 'CallExpression' && calleeName(callee.callee, 'dotted') === 'styled') return { fn: init, styledTarget: styledTargetOf(callee.arguments[0]), propsTypeArg: null };
    if (callee?.type === 'MemberExpression' && isStyledRef(callee)) return { fn: init, styledTarget: memberTarget(callee), propsTypeArg: null };
  }
  if (init.type === 'TaggedTemplateExpression') {
    const tag = unwrap(init.tag);
    if (tag?.type === 'CallExpression' && calleeName(tag.callee, 'dotted') === 'styled') return { fn: init, styledTarget: styledTargetOf(tag.arguments[0]), propsTypeArg: null };
    if (tag?.type === 'MemberExpression' && isStyledRef(tag)) return { fn: init, styledTarget: memberTarget(tag), propsTypeArg: null };
  }
  return null;
}

// Interfaces are kept whole (not just their body) so `extends` can be followed.
function typeDecls(ast: N): Map<string, N> {
  const m = new Map<string, N>();
  for (const s0 of ast.program.body) {
    const s = s0.type === 'ExportNamedDeclaration' ? s0.declaration : s0;
    if (s?.type === 'TSInterfaceDeclaration') m.set(s.id.name, s);
    else if (s?.type === 'TSTypeAliasDeclaration') m.set(s.id.name, s.typeAnnotation);
  }
  return m;
}

interface TypeShape { members: N[]; children: boolean }

// Property-signature members of a props type, plus whether PropsWithChildren added an implicit `children`.
function typeMembers(t: N | null | undefined, decls: Map<string, N>, depth = 0): TypeShape {
  const none: TypeShape = { members: [], children: false };
  if (!t || depth > MAX_TYPE_DEPTH) return none;
  if (t.type === 'TSTypeLiteral') return { members: t.members, children: false };
  if (t.type === 'TSInterfaceBody') return { members: t.body, children: false };
  if (t.type === 'TSInterfaceDeclaration') return mergeShapes([{ members: t.body.body, children: false }, ...(t.extends ?? []).map((h: N) => referenceShape(h.expression, typeArgsOf(h), decls, depth + 1))]);
  if (t.type === 'TSIntersectionType') return mergeShapes(t.types.map((x: N) => typeMembers(x, decls, depth + 1)));
  if (t.type === 'TSTypeReference') return referenceShape(t.typeName, typeArgsOf(t), decls, depth + 1);
  return none;
}

function mergeShapes(shapes: TypeShape[]): TypeShape {
  return { members: shapes.flatMap((s) => s.members), children: shapes.some((s) => s.children) };
}

function referenceShape(typeName: N, args: N[], decls: Map<string, N>, depth: number): TypeShape {
  const name = typeName.type === 'Identifier' ? typeName.name : typeName.type === 'TSQualifiedName' && typeName.left.type === 'Identifier' && typeName.left.name === 'React' ? typeName.right.name : null;
  if (name === null) return { members: [], children: false };
  if (name === 'PropsWithChildren') return { members: typeMembers(args[0], decls, depth).members, children: true };
  if (PARTIAL_UTILITIES.has(name)) return typeMembers(args[0], decls, depth);
  return typeName.type === 'Identifier' ? typeMembers(decls.get(name), decls, depth) : { members: [], children: false };
}

function propsType(fn: N, declNode: N, wrapperTypeArg: N | null): N | null {
  const param = Array.isArray(fn.params) ? fn.params[0] : null;
  const own = param?.typeAnnotation?.typeAnnotation;
  if (own) return own;
  if (wrapperTypeArg) return wrapperTypeArg;
  if (fn.type === 'ClassDeclaration' || fn.type === 'ClassExpression') return (fn.superTypeParameters?.params ?? fn.superTypeArguments?.params)?.[0] ?? null;
  const declared = declNode.type === 'VariableDeclarator' ? declNode.id.typeAnnotation?.typeAnnotation : null;
  return typeArgsOf(declared)[0] ?? null;
}

export function findComponents(ast: N, src: string, file: string, info: ModuleInfo): FindResult {
  const imports = new Map<string, ImportBinding>(info.imports.map((b) => [b.local, b]));
  const exportedAs = new Map<string, string[]>();
  for (const [exported, local] of info.exportsLocal) exportedAs.set(local, [...(exportedAs.get(local) ?? []), exported]);
  const decls = typeDecls(ast);
  const components: ComponentDef[] = [];
  const aliases = new Map<string, string>();
  const usedNames = new Set<string>();
  const owners = new Map<N, string>();
  const aliasDecls = new Set<N>();

  const isDataImport = (local: string): boolean => {
    const b = imports.get(local);
    return !!b && !b.typeOnly && (DATA_SOURCE_RE.test(b.source) || DATA_NAME_RE.test(b.imported));
  };
  const isRegion = (el: RenderedEl): boolean => {
    const m = muiPrimitiveName(el.name, imports);
    return m ? REGION.has(m) : /^[a-z]/.test(el.name) && REGION.has(el.name);
  };

  const build = (displayName: string, local: string, fn: N, declNode: N, styledTarget: string | null, wrapperTypeArg: N | null): void => {
    const name = usedNames.has(displayName) ? `${displayName}Default` : displayName;
    usedNames.add(name);
    owners.set(declNode, local);
    const rendered: RenderedEl[] = [];
    const called = new Set<string>();
    const referenced = new Set<string>();
    walkRuntime(fn, (n, parents) => {
      if (n.type === 'JSXOpeningElement') {
        const props: Record<string, string> = {};
        for (const p of ['variant', 'type', 'size', 'color']) { const v = jsxAttrString(n, p); if (v !== null) props[p] = v; }
        rendered.push({ name: jsxName(n.name), line: lineOf(n), props });
      } else if (n.type === 'CallExpression' || n.type === 'OptionalCallExpression') {
        const c = unwrap(n.callee);
        if (c?.type === 'Identifier') called.add(c.name);
        else if (c?.type === 'MemberExpression' && unwrap(c.object)?.type === 'Identifier') called.add(unwrap(c.object)?.name);
      } else if (isValueRef(n, parents)) {
        referenced.add(n.name);
      }
    });
    const dataHooks = [...new Set([...[...called].filter((c) => !NOT_DATA_HOOKS.has(c) && (DATA_CALLS.has(c) || DATA_HOOK_RE.test(c))), ...[...referenced].filter(isDataImport)])].sort();
    const typeNode = propsType(fn, declNode, wrapperTypeArg);
    const shape = typeMembers(typeNode, decls);
    const members = shape.members;
    const slotNames = new Set<string>();
    if (shape.children) slotNames.add('children');
    for (const m of members) {
      if (m.type !== 'TSPropertySignature' && m.type !== 'TSMethodSignature') continue;
      const key = m.key?.type === 'Identifier' ? m.key.name : String(m.key?.value);
      const typeText = m.type === 'TSMethodSignature' ? textOf(m, src) : m.typeAnnotation ? textOf(m.typeAnnotation, src) : '';
      if (key === 'children' || SLOT_TYPE_RE.test(typeText)) slotNames.add(key);
    }
    const param = Array.isArray(fn.params) ? fn.params[0] : null;
    if (param?.type === 'ObjectPattern' && param.properties.some((p: N) => p.type === 'ObjectProperty' && keyName(p) === 'children')) slotNames.add('children');
    const typeIdents = new Set<string>();
    const addIdents = (t: N | null | undefined): void => { if (t) walk(t, (n) => { if (n.type === 'Identifier') typeIdents.add(n.name); }); };
    addIdents(typeNode);
    for (const m of members) addIdents(m.typeAnnotation);
    const primitiveOf = (el: RenderedEl): string => muiPrimitiveName(el.name, imports) ?? el.name;
    components.push({
      id: `${file}#${name}`,
      name,
      local,
      file,
      line: lineOf(declNode),
      loc: endLineOf(declNode) - lineOf(declNode) + 1,
      exportNames: [...(exportedAs.get(local) ?? [])].sort(),
      rendered,
      signals: {
        data: dataHooks.length > 0,
        dataHooks,
        slots: slotNames.size,
        region: rendered.some(isRegion),
        primaryActions: rendered.filter((el) => (/(^|\.)(Button|LoadingButton)$/.test(primitiveOf(el)) && el.props.variant === 'contained') || el.props.type === 'submit').length,
        pageArea: PAGE_AREA_RE.test(textOf(fn, src)),
        domainProps: [...typeIdents].some((t) => { const b = imports.get(t); return !!b && DOMAIN_SOURCE_RE.test(b.source); }),
        styledTarget,
      },
      refs: [...referenced].sort(cmp),
    });
  };

  for (const stmt0 of ast.program.body) {
    const isExport = stmt0.type === 'ExportNamedDeclaration' || stmt0.type === 'ExportDefaultDeclaration';
    const stmt = isExport && stmt0.declaration ? stmt0.declaration : stmt0;
    if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration') {
      const display: string = stmt.id?.name ?? pascalFromFile(file);
      const local: string = stmt.id?.name ?? 'default';
      const isComponent = PASCAL.test(display) && (stmt.type === 'FunctionDeclaration' ? containsJsx(stmt.body) : !!stmt.superClass && containsJsx(stmt.body));
      if (isComponent) build(display, local, stmt, stmt0, null, null);
    } else if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        if (d.id.type !== 'Identifier' || !PASCAL.test(d.id.name)) continue;
        const r = componentInit(d.init);
        if (r) { build(d.id.name, d.id.name, r.fn, d, r.styledTarget, r.propsTypeArg); continue; }
        const init = unwrap(d.init);
        const arg = init?.type === 'CallExpression' ? unwrap(init.arguments[0]) : null;
        if (init?.type === 'CallExpression' && WRAPPERS.has(calleeName(init.callee, 'dotted') ?? '') && arg?.type === 'Identifier') { aliases.set(d.id.name, arg.name); aliasDecls.add(d); }
      }
    } else if (stmt0.type === 'ExportDefaultDeclaration') {
      const r = componentInit(stmt);
      if (r) build(pascalFromFile(file), 'default', r.fn, stmt0, r.styledTarget, r.propsTypeArg);
    }
  }
  const names = new Set([...components.map((c) => c.local), ...aliases.keys()]);
  return { components, aliases, valueRefs: findValueRefs(ast, names, owners, aliasDecls) };
}
