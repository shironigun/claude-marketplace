// Live QA status pane (Tier 3) — a Claude Code "mod" that renders the status board
// (the same board as the /status command and the /qa home base) in a live pane that
// refreshes as qa-context changes.
//
// REQUIRES a Claude Code engine with the mods runtime (~2.1.293+). CONFIRMED: on an
// engine WITHOUT it, the WHOLE plugin fails to load (`Error: Hook load failed`), not just
// this pane — skills/commands/agents all become unavailable there. Affects the standalone
// CLI, `claude -p`/CI, and older versions; mods-capable interactive engines load it fine.
// Remedy on such engines: delete the plugin's `hooks/` folder (only the pane depends on it);
// everything else, incl. the in-chat `/status` board, then loads. See README, "Live status pane".
//
// Honest + read-only by the same rule as the board spec
// (knowledge/orchestration/status-board.md): every value is read from qa-context.json;
// an absent slice renders "not started" / "—"; nothing is fabricated; the pane writes
// nothing (its only state is a redraw tick).

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const PANE = 'qa-status'

const tick = atom({ plugin: 'qa-engineering', key: 'tick' } as const, 0)

async function readJson($: any, path: string): Promise<any> {
  try {
    if (!(await $.fs.exists(path))) return undefined
    return JSON.parse(await $.fs.read(path))
  } catch {
    return undefined
  }
}

function moduleCounts(ctx: any): { built: number; total: number } | undefined {
  const mods = ctx?.catalog?.modules
  if (!Array.isArray(mods)) return undefined
  return { built: mods.filter((m: any) => m?.status === 'built').length, total: mods.length }
}

function lastRunText(ctx: any): string {
  const hist = ctx?.runHistory?.runs
  if (Array.isArray(hist) && hist.length) {
    const r = hist[hist.length - 1]
    const p = r?.passed
    const f = r?.failed
    if (p == null && f == null) return 'ran (totals unavailable)'
    const flaky = r?.flaky ? ` / ${r.flaky} flaky` : ''
    return `${p ?? 0} passed / ${f ?? 0} failed${flaky}`
  }
  const fr = ctx?.failures?.runs
  if (Array.isArray(fr)) return fr.length ? `${fr.length} failed` : 'all green'
  return 'not run yet'
}

// Trend of the last few runs OF THE SAME SCOPE as the latest run, labeled with that
// scope — so a narrow green run isn't shown as "fixing" a broad red one.
function trendText(ctx: any): string | undefined {
  const hist = ctx?.runHistory?.runs
  if (!Array.isArray(hist) || hist.length < 2) return undefined
  const scope = hist[hist.length - 1]?.scope
  const same = hist.filter((r: any) => r?.scope === scope)
  if (same.length < 2) return undefined
  const marks = same.slice(-4).map((r: any) => ((r?.failed ?? 0) > 0 ? '✗' : '✓')).join(' ')
  return scope ? `${scope}: ${marks}` : marks
}

function runIsRed(ctx: any): boolean {
  const hist = ctx?.runHistory?.runs
  if (Array.isArray(hist) && hist.length) return (hist[hist.length - 1]?.failed ?? 0) > 0
  const f = ctx?.failures?.runs
  return Array.isArray(f) && f.length > 0
}

function courseText(ctx: any): string | undefined {
  const l = ctx?.learning
  if (!l) return undefined
  const path = Array.isArray(l.path) ? l.path : []
  const covered = path.filter((t: any) => t?.status === 'covered').length
  const total = path.length
  const where = l.current ?? (total ? `${covered}/${total}` : 'started')
  return total ? `${where} (${covered}/${total} topics)` : String(where)
}

function coverageText(ctx: any): string | undefined {
  const specs = ctx?.automation?.specs
  if (!Array.isArray(specs) || !specs.length) return undefined
  const levels = Array.from(new Set(specs.map((s: any) => s?.level).filter(Boolean)))
  return levels.length ? levels.join(' · ') : undefined
}

function openBugs(ctx: any): number | undefined {
  const items = ctx?.bugs?.items
  if (!Array.isArray(items)) return undefined
  return items.filter((b: any) => b?.status !== 'closed').length
}

function loopSteps(ctx: any): { name: string; done: boolean }[] {
  const c = ctx ?? {}
  const ran = Array.isArray(c?.runHistory?.runs) ? c.runHistory.runs.length > 0 : c?.failures !== undefined
  const red = runIsRed(c)
  const bugsFiled = Array.isArray(c?.bugs?.items) && c.bugs.items.length > 0
  const published =
    (Array.isArray(c?.ado?.published) && c.ado.published.length > 0) ||
    (Array.isArray(c?.cases?.items) && c.cases.items.some((i: any) => i?.adoCaseId))
  return [
    { name: 'analyze', done: !!(c.story || c.module) && !!c.review },
    { name: 'cases', done: Array.isArray(c?.cases?.items) && c.cases.items.length > 0 },
    { name: 'publish', done: !!c?.cases?.approved && published },
    { name: 'automate', done: Array.isArray(c?.automation?.specs) && c.automation.specs.length > 0 },
    { name: 'run', done: ran },
    // "bugs" is handled when the run is green (nothing to file) or real bugs were filed;
    // a red run with no bugs filed is the one case that leaves it pending (go file one).
    { name: 'bugs', done: (ran && !red) || bugsFiled },
  ]
}

function focusLabel(ctx: any): string | undefined {
  const mods = ctx?.catalog?.modules
  if (Array.isArray(mods)) {
    const inProg = mods.find((m: any) => m?.status === 'in-progress')
    if (inProg?.name) return `${inProg.name} module`
  }
  if (ctx?.module?.name) return `${ctx.module.name} module`
  if (ctx?.story?.id) return `story ${ctx.story.id}`
  return undefined
}

function statusMark(s: string): { glyph: string; color: string; dim: boolean } {
  if (s === 'built') return { glyph: '✓', color: 'green', dim: false }
  if (s === 'in-progress') return { glyph: '●', color: 'cyan', dim: false }
  return { glyph: '○', color: 'gray', dim: true }
}

// Guards so a second load of this module (a reinstall, a stray duplicate copy, or a
// repeated session.start) never duplicates behavior: the command registers once, the
// pane is keyed by id (reopening is a no-op), and only one refresh timer ever runs.
let refreshStarted = false

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'qa-status',
        description: 'Open the live QA status board pane',
      })
    } catch {
      // already registered by an earlier load — ignore, don't duplicate
    }
    void $.ui.open({ id: PANE, title: 'QA status' }) // idempotent: one pane per id
    if (!refreshStarted) {
      refreshStarted = true
      $.clock.every(3000, () => void update($, tick, (n: number) => n + 1))
    }
    return next(e)
  })

  on('command.run', { command: 'qa-status' }, async $ => {
    await $.ui.open({ id: PANE, title: 'QA status' })
    return { text: 'QA status pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tick) // subscribe: each clock tick refreshes the pane

    const ctx = await readJson($, 'qa-context.json')
    const house = await readJson($, 'house-profile.json')
    const product = house?.product?.name ?? ctx?.catalog?.product ?? 'your project'

    if (!ctx) {
      return (
        <Box flexDirection="column">
          <Text bold>QA status — {product}</Text>
          <Text dimColor>No qa-context yet. Run /qa to get started.</Text>
        </Box>
      )
    }

    const counts = moduleCounts(ctx)
    const metrics: string[] = []
    metrics.push(counts ? `modules built ${counts.built}/${counts.total}` : 'modules —')
    const trend = trendText(ctx)
    metrics.push(`last run ${lastRunText(ctx)}${trend ? ` (${trend})` : ''}`)
    const course = courseText(ctx)
    if (course) metrics.push(`course ${course}`)
    const bugs = openBugs(ctx)
    metrics.push(`open bugs ${bugs ?? 0}`)

    const steps = loopSteps(ctx)
    const firstPending = steps.findIndex(s => !s.done)
    const red = runIsRed(ctx)
    const focus = focusLabel(ctx)
    const coverage = coverageText(ctx)

    const mods = Array.isArray(ctx?.catalog?.modules) ? ctx.catalog.modules : []
    const room = Math.max(4, (e.viewport?.rows ?? 24) - 10)

    return (
      <Box flexDirection="column">
        <Text bold>QA status — {product}</Text>
        <Text>{metrics.join('  ·  ')}</Text>
        <Text> </Text>

        <Text dimColor>{focus ? `loop — ${focus}` : 'loop — no active work (pick a module with /build or a story with /test)'}</Text>
        <Box flexDirection="row">
          {steps.map((s, i) => {
            let glyph = '○'
            let color = 'gray'
            let dim = true
            if (focus) {
              const isRun = s.name === 'run'
              if (isRun && s.done && red) { glyph = '✗'; color = 'red'; dim = false }
              else if (s.done) { glyph = '✓'; color = 'green'; dim = false }
              else if (i === firstPending) { glyph = '●'; color = 'cyan'; dim = false }
            }
            return (
              <Text key={s.name} color={color} dimColor={dim}>
                {glyph} {s.name}{i < steps.length - 1 ? '   ' : ''}
              </Text>
            )
          })}
        </Box>
        {coverage && <Text dimColor>automated levels: {coverage}</Text>}
        <Text> </Text>

        <Text dimColor>modules</Text>
        {mods.length === 0 && <Text dimColor>No framework yet — run /qa to set one up.</Text>}
        {mods.slice(0, room).map((m: any, i: number) => {
          const mk = statusMark(m?.status)
          return (
            <Text key={m?.name ?? i} color={mk.color} dimColor={mk.dim}>
              {mk.glyph} {m?.name ?? '(unnamed)'}
            </Text>
          )
        })}
      </Box>
    )
  })
}
