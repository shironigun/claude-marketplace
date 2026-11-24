# Demo-data screenshots

Guide screenshots come from your product running with made-up data: a local build, or a test environment that holds only demo data. Never take them from production, and never from a real customer's account. A screenshot is published to every reader, so anything real in it is a leak.

| File | What it does |
| --- | --- |
| `scripts/shots/drive.mjs` | Runs a plan (a JSON list of clicks and shots) in Chrome at 1440 x 900, 2x, and saves the shots. The step list is at the top of the file. It refuses a host that isn't local unless you pass `--allow-remote`. |
| `scripts/shots/callout.py` | Draws the callout-red circle or box, with an optional arrow, on a saved shot. Needs Python with Pillow. |

If your house rules (the brand profile's `rules` file) describe a team demo kit, such as a script that serves the app with fictional data, use that to start the app, then come back here for the plan and callouts.

## Run it

1. Start the app locally with demo data, and note its URL, such as `http://localhost:3100`.
2. Write a plan next to the guide, such as `shots.json`:

   ```json
   [
     {"go": "/reminders"},
     {"text": "Spring renewal", "wait": 2000},
     {"shot": "rm-list", "clip": [57, 50, 1383, 420]},
     {"text": "New Reminder", "exact": true},
     {"shot": "rm-new", "clip": [700, 60, 740, 520]}
   ]
   ```

3. Run it:

   ```powershell
   node "<skill>/scripts/shots/drive.mjs" shots.json --out "<guide folder>/images" --url http://localhost:3100
   ```

   Run `npm ci` in `scripts/` first if `node_modules` is missing. The driver needs Google Chrome.

## Get the crop right

- Start with `{"shot": "probe"}` and no clip to see the whole window, then set each `clip` (CSS pixels of the 1440 x 900 window).
- Crop wide, not tall. A figure fills the page width, so a narrow, tall crop (a drawer, a dialog) can take a whole page. Widen it with context, or leave the shot out when the steps already describe it.
- `{"eval": "..."}` runs JavaScript in the page and prints the result, which helps when a click doesn't land.
- `{"hide": {"sel": "[role=tab]", "text": "Beta"}}` removes elements before every later shot, for anything readers don't have yet. Taking shots from the version readers have avoids this.

## Add callouts

Use a `{"measure": {"text": "New Reminder", "clip": [x, y]}}` step to print an element's position in the shot (pass the shot's clip x and y). Then:

```powershell
python "<skill>/scripts/shots/callout.py" "<images>/rm-list.png" --box 10,258,145,40 --arrow-from 330,240
```

Use `--circle cx,cy,r` for a single icon. Coordinates are CSS pixels from the top-left of the saved image; the script doubles them for the 2x shot. Re-running the plan overwrites the shot, so draw callouts last.

## Make the data believable and fictional

- Invent the business, the people and the content. Use `example.com` email addresses and phone numbers in the 555-01xx range.
- Write content a real business would send, with dates near today and counts that add up.
- Never paste anything from a real database or a real account.

## Things that go wrong

- **A deep route opens a 404 page** when the app expects you to arrive by clicking. Reach it by clicking through, in the same plan.
- **Cards that aren't buttons** can't be selected by role. Use `{"text": ...}` on their title.
- **A tooltip in the shot**: the driver parks the pointer in the corner and waits before every shot; raise `"settle"` if one still shows.
- **A shot shows the wrong data**: check what the page loaded with `{"eval": ...}` before blaming the plan.
