# Checking the page before publishing

Each check here exists because an earlier page shipped with exactly that problem.

## The loop

1. **Build**: `node scripts/build.js content.js out/page.html`. It runs the audience lint first and stops
   on a FAIL; it also refuses duplicate or reserved page ids and a title that isn't a short name. Read the
   warn lines too: a prose budget warning means a paragraph should become a picture.
2. **Serve**: `python scripts/serve.py out <port>` in the background, on any free port. Use this server, not
   `python -m http.server`: the page has no charset of its own (the publisher adds it), and a plain server
   makes the browser misread it, which shows up as mojibake and as script errors like
   "Invalid regular expression … Range out of order". If you see those, check the server first.
3. **Desktop, dark**: open `http://127.0.0.1:<port>/page.html`, read the console (errors only), then pass
   the whole text of `scripts/page-check.js`, comment lines included, to the browser's JavaScript runner:
   the file is one `await` expression and returns the report. Expect `ok: true`.
4. **Phone, light**: `node scripts/phone-copy.js out/page.html out/_phone.html`, set the viewport to a
   phone (375 wide) and open `_phone.html`. The copy carries the viewport tag the publisher adds; without
   it the browser lays the page out at desktop width and the phone check means nothing. Run
   `page-check.js` again: `overflow` must be 0 on every page.
5. **Click through**: the role buttons (`#how-journey`, `#how-qa`, `#how-dev`) must land on their
   sections; the developer block must open from its button; the glossary search must filter.
6. **Look**: one screenshot per long page is enough. Look for text squeezed into boxes, a card alone in a
   row, a diagram whose labels are too small to read, low contrast in dark mode. To reach a section, set
   `location.hash` to its id (the router scrolls there) or use the browser tool's scroll action:
   `scrollIntoView` and `window.scrollTo` from the JavaScript runner are undone by the router.
7. Fix, rebuild, repeat from 3. Delete `_phone.html` and stop the server when done.

## Known traps

| Symptom | Cause | Fix |
|---|---|---|
| Page wider than a phone, nothing visibly too wide | an absolutely positioned element (often a screen-reader-only label) escaped its scroll container | give the cell `position:relative`; the kit's `.sr` and `.vz-mtx td` already do |
| `getBBox()` returns zeros | the section is hidden (one page shows at a time) | `page-check.js` opens each page before measuring |
| Overlapping two-line box labels | larger diagram type with `box` spacing | use `gbox` inside `big()` |
| A label sticks out of the drawing | long text near the viewBox edge | shorten it, or anchor it `start`/`end` |
| A link jumps to the top instead of its section | the id isn't inside a page section, or it's misspelt | ids must be inside the page's `<section>` |
| A row of cards with one left alone | a hand-built card row without a column count | wrap it with `cards()` or `cols(n)`; the kit's own rows already size themselves |
| White text on a pale bar in dark mode | a mock used `--accent-2` as a solid fill | use `--solid` / `--on-solid` |
| Dots or chips spill out of a card | too many marks for the width | use `dots` with class `sm`, or wrap |

## Honesty check (read the page as a reviewer)

- Every number on the page appears in the research notes with a source.
- Every issue has a date and a place, and you saw it (or the source states it).
- Sample data is labelled as an example, and invents nothing the surrounding example doesn't contain.
- The developer block still holds everything technical that the old prose had.
- No token, password or key appears anywhere, including in example commands.
