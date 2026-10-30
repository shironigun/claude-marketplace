# Visual catalog

Every block in `assets/vzkit.js` returns an HTML string. `examples/example-content.js` uses most of them.

## Lanes and colours

Three lanes colour icons, pills and diagram boxes:
- `ai`: indigo, the AI or an outside service
- `crm`: amber, your product's own code (the name is historical; it means "the app")
- `dl`: neutral, a person or a screen

Diagram box classes: `b-ai`, `b-crm`, `b-dl`, `b-ok` (good outcome), `b-bad` (failure), `b-note`
(dashed, a side note). Level colours: `var(--urg-low|medium|high|critical)`.

## Page furniture

| Call | Use |
|---|---|
| `head(eyebrow, title, intro?)` | the heading of every page |
| `plain(text)` | the "In plain words" note on every page after the first |
| `roles([[lane, role, what, '#anchor']])` | Product / QA / Developers buttons at the top of How it works |
| `sub(text, id?)` | a section heading; give an id when a button or link points at it |
| `block(html)` | spacing wrapper for a picture placed right after a plain note |
| `devDetails(summary, html)` | the collapsed developer block (keeps id `how-dev`) |
| `foot(icon, html)` | a one-line note under a picture |

## Story blocks

| Call | Draws | Notes |
|---|---|---|
| `journey(label, nodes, loop, caption)` | numbered icon steps with arrows; stacks vertically on phones | nodes `[lane, icon, title, sub, who]`, 4-6 of them; `loop` `{icon, html, who, lane}` or `null` |
| `matrix(cols, rows, legend)` | who-does-what grid with yes/helps/no icons | cols `[[lane, icon, label] ×3]`; rows `[icon, job, [state, text] ×3]`, state `y`/`p`/`n`; legend `{y, p, n}` labels |
| `tiles(items)` | promise tiles | `[icon, title, one line]` |
| `helper(icon, name, tag, mini, when, gives)` | a card for one AI helper or service | wrap several in `<div class="vz-helpers">` |
| `mini(viewBox, label, inner)` | the small drawing inside a helper card | classes `m-crm m-ai m-ok m-cell m-ar m-idea m-bub m-line m-k m-ghost m-x m-plus m-cust m-rep m-crit m-high m-med m-btn`; arrows use `marker-end="url(#mah)"` |
| `compare(items)` | side-by-side cards with a mini example and a verdict | `[icon, title, tag, inner, verdict, kind?]`; inner usually `msg()` bubbles or a small mock; kind defaults to `owed`, use `rule` for a neutral fact about a variant (payment types, plans) |
| `msg(side, text, meta, badge?)` | one chat bubble | side `c` left, `r` right, `s` system |
| `levels(levels, rows, example?)` | a ladder as a grid (Low → Critical) | levels `[[label, colour]]`; rows `[icon, signal, [cell per level]]` |
| `upill(label, colour)` | a coloured level pill | for examples and issue visuals |
| `actions(items)` | the buttons a person can press, and when | `[icon, name, when, lane?]` |
| `chips(items)` | a row of small facts with icons | `[icon, html]`; good for test ids under a grid |

## Testing blocks

| Call | Draws |
|---|---|
| `verdicts(title, sub, rows)` | real inputs on the left, the expected verdict and test id on the right; rows `[side, who, text, kind, verdict, testId]`. Kinds for conversations: `owed`/`closed`/`none`/`crit`; generic kinds for forms, callbacks and other inputs: `allowed`/`blocked`/`info`/`rule`/`crit`. `crit` adds a red "critical" badge |
| `testCards(items)` | test case cards for a Tests page; items `{ id, title, checks, steps?, expected, priority? }` with priority `critical`/`high`/`normal` |
| `table(head, rows, { first, min })` | a scrolling reference table; `first: true` sets column 1 in monospace; `min` a CSS min-width |
| `code(label, text, id)` | a code block with a label and a Copy button; pass raw text (it is escaped); `id` unique on the page |
| `checklist(title, sub, items)` | a ticked list of checks run on every answer; items `[text, testId]` |
| `keys(list, start)` | numbered legend for `num(n)` callouts on a mock |
| `num(n)` | a numbered callout dot to place inside a mock |
| `issues(items)` | issue cards; items `[kind crit/warn/info, badge, title, text, visual html]` |
| `dots(n, limit)` | n dots with a limit line; the ones past it red ("4 sends, limit 3") |
| `route(icon, n, name, best, steps)` | one way to test; wrap in `<div class="vz-routes">` |
| `pairs([[ok, left, right]])` | which login works with which environment |

Issue visuals that work: two `upill`s with `&ne;` (got vs expected), `dots`, a bar over its limit
(`<div class="vz-over"><i></i><b></b><span>162</span></div>`), version chips
(`<div class="vz-ver"><span>DEV 1.10</span><b>&gt;</b><span>repo 1.9</span></div>`), a token with a warning
icon (`<div class="vz-tok"><span>text</span>` + `ic('warn')` + `</div>`). Add `<small>` under the visual
for its one-word label.

## Card rows: no card alone in a row

`tiles`, `compare`, `issues`, `actions` and `journey` size their columns by how many items they get, so a
row never ends with one lonely card (6 → 3+3, 4 → 4 or 2+2, 5 → 3+2, 7 → 4+3); phones get one column. For
a card row you build yourself (helper cards, routes), use `cards(className, [html, html, ...])`, or put
`style="' + K.cols(n) + '"` on the wrapper. Prefer counts of 2, 3, 4 or 6.

## Mocks of real screens

Draw the product's own layout and labels (read its components). Use theme tokens for surfaces and text.
For a **solid** bar or button with white text, use `background:var(--solid); color:var(--on-solid)` (or
`--solid-2` for the amber lane): those stay dark enough in both themes, where `--accent-2` turns light in
dark mode and loses contrast. A mock that copies a light-only product screen may use the product's own
literal colours, inside one wrapper, on purpose.

## Other shell classes you can use directly

`.tablewrap` + `table.t` (tables; `td.fn` monospace cell), `.codewrap` + `.codebar` + `pre.code` (code),
`.callout` (a warning box with an icon), `.checks` + `.check` (a numbered check grid), `.twocol` (two
columns that stack on phones), `.qs` + `.qrow` + `.pick` (To confirm questions), `.typetag` (a small
monospace tag), `.status.s4`/`.s5` (red/amber status chip), `.note` (a muted sentence), `.paths` + `.path`
(numbered ways to do something), `.vz-mock` + `.vz-mh` (a card with a header row, for any mock),
`.vz-bub` + `mark` (a highlighted message), `.vz-meter` + `.vz-bar` (a length meter), `.vz-cal` (a month
grid), `.vz-nos` (red "no X" chips), `.vz-bars` + `.vz-br` + `.vz-bt` (stacked horizontal bars).

## More icons

The kit's icons are filled Material icons. To add one for a page, call this at the top of `content.js`,
before any block uses it: `K.addIcons({ receipt: 'M18 17H6v-2h12v2zm0-4H6v-2h12v2z...' })`. It works
because `build.js` and `content.js` load the same kit file. Use filled paths only.

## SVG diagrams (flows, timelines, decision trees)

```js
let G = '';
G += K.gbox(20, 110, 150, 56, 'b-ai', ['AI answer', 'arrives']);   // two lines: title, sub
G += K.arr('M170 138 H206');                                        // arrow with a head
G += K.lbl(420, 50, 'PASSES');                                      // a small caps label on an arrow
const pic = K.big(K.svg('0 0 860 320', 'one-sentence aria label', G, 'caption sentence', true));
```

- Use `gbox` (spaced for the larger type) inside `big(...)`; `box` is for dense developer diagrams.
- `svg(..., true)` is the narrow variant: it scrolls sideways on phones below 560px instead of shrinking
  the text to nothing. Keep the viewBox 860-960 wide.
- Labels three words or fewer; explanations go in the caption.
- Put arrow labels in the gap between boxes, never over a box. Leave 30+ px between boxes for them.
- Icons inside a diagram: `<path class="ok-ic" transform="translate(x y) scale(2)" d="' + K.P.review + '"/>`
  (classes `ok-ic`, `bad-ic`, `send-ic`).
- A timeline is hand-built (there is no timeline block): per row, a label `text` and an `axis` line, then
  markers (`dot-ai`, `dot-crm`, `dot-send`, `dia-ai`),
  a `band`/`band2` rect for a window, `grid` lines for months, one x scale for every mark
  (`x = d => X0 + d * pxPerDay`). Label each marker in the gap beside it.

## Icons (`K.P`, all filled)

login bulb pen review send sync yes part no ai store person group event shield chart moneyoff sms range
warn wrench block doc flag play bolt dash key trend mega info jump cached list clock mood forum task bell

`K.ic(name, extraClass?)` draws one inline. Need another? Add a filled Material path to `P`; never use an
outlined variant.
