---
name: how-to-guide
description: Write a complete customer-facing how-to guide for one feature of a B2B software product (scheduling, invoicing, field service, healthcare, retail or any other B2B SaaS) to a researched standard, and build it as a branded PDF. Use this skill whenever the user wants to write, draft, update, condense or review a feature guide, user guide, help guide, training PDF or "how-to" for the people who use their product, apply a reviewer's or support team's feedback to one, rebuild a guide PDF, set up a brand profile (logo, colours, font) for guides, or pick a cover, even if they only say "document this feature for our customers" or "make a PDF guide for our customers' admins". Not for release notes, API reference, user stories, or internal developer docs.
---

# How-to guide

A how-to guide is everything a reader needs to understand one feature and use all of it, in one PDF they can keep. The reader works at a business that uses the product: an account admin, a front desk, an office manager, an owner. So the guide is plain, warm and exact, and every sentence in it is something they will act on.

This skill bundles:

| Path | What it is |
| --- | --- |
| `references/standard.md` | The standard every guide follows. The source of truth for structure, voice and words. |
| `references/example-guide.md` | A finished guide for a fictional feature. Read it for voice and density. |
| `references/brand-profile.md` | The brand profile: what each field in `howto-brand.json` does. |
| `references/screenshots.md` | Taking demo-data screenshots and drawing callouts. |
| `assets/template.md` | The starting file for a new guide. |
| `assets/howto-brand.example.json` | A starting brand profile. |
| `assets/images/placeholder.svg` | A stand-in screenshot until a real one exists. |
| `scripts/build.mjs` + `scripts/theme/` | Markdown to branded PDF through local Chrome, with checks against the standard. |
| `scripts/shots/` | A screenshot driver and a callout tool. |
| `scripts/detect-brand.mjs` | Drafts a brand profile from the product's code, for the user to confirm. |

`<skill>` below means this skill's folder.

## Workflow

### 1. Find the brand profile and house rules

The build looks for `howto-brand.json` in the guide's folder or any folder above it (or takes `--brand=<file>`). It sets the product name, logo, colours, font, default cover and the closing help line, and can point to a `rules` file of house rules. Read `references/brand-profile.md` for the fields.

- **There's a profile:** read it, and read its `rules` file in full. House rules win over this skill wherever they're more specific: product spelling, what the readers are called, plan and platform names, where the code lives and which branch is production, a team demo kit, the output folder.
- **There isn't one, and you have the product's code:** draft one from the code. Run `node "<skill>/scripts/detect-brand.mjs" "<repo>"`. It reads the code only and prints JSON: a `draft` profile, every `candidate` with the file it came from, and `brands` when the code holds more than one brand. Then:
  1. Show the user the draft: the product name, the logo images themselves (open them, don't just list paths), each colour with the file it came from, and the font. If there are several brands, ask which one this guide is for; each brand gets its own profile.
  2. Let them confirm or correct each field. A repo holds old logos, partner logos and app icons, and the theme's secondary colour isn't always the brand's accent, so never write a field they haven't seen.
  3. Write `howto-brand.json` in the guides folder, never in the product's repo or in this plugin, and copy the chosen images into a `brand/` folder next to it.
  4. If the font is only a web-font link, ask before downloading it, and check its licence allows embedding in a PDF. Without a file the guide uses the system font.
  5. Ask for the `help` line (it isn't in the code) and offer to start a `rules` file.
- **There isn't one and there's no code:** ask the user once whether to set one up. If yes, copy `assets/howto-brand.example.json` next to the guide folder, fill it from what they give you (logo file, brand colour, help line), and offer to start a `rules` file. If no, the guide builds with a neutral look and no product name.

Never put a profile, logo or rules file inside this plugin: they belong to the user's organisation and stay with their files.

### 2. Pin down the feature and where the guide goes

Name the feature as readers know it, and who the readers are. Unless the house rules or the user name a place, write to `how-to-guides/<feature-slug>/` in the current folder, with screenshots in an `images/` folder next to the Markdown file.

### 3. Read the standard before writing

Read `references/standard.md` in full every time. Skim `references/example-guide.md` for how the sections feel at the right length. The standard's choices are deliberate: saying where something is on screen ("at the top-right of the list") is encouraged, and only "see above" or "see below" is banned.

### 4. Learn the feature from the source, not from names

Readers act on every sentence, and support answers the calls when a sentence is wrong. So confirm each behaviour before writing it down:

- **The code**, read only: never edit, commit or switch branches for a guide. Use a search agent for broad sweeps. Write to what the readers' version does: if the house rules name a production branch, read it (`git show <branch>:<path>`), because the checked-out branch can have screens readers don't have yet. Then spot-check the facts the guide leans on hardest, such as exact messages, limits and times.
- **The app** with demo data, when a local or test build is running.
- **The existing help content**, such as a knowledge base, for wording readers already know.

Look hardest at what a reader will assume: exactly what the feature reads (which messages, which channels), what a number includes and excludes, what happens on its own and what needs a person, whose name a message to a customer goes out under, limits and queues, what is empty until someone sets it up, and the exact text of every error. In real reviews, a support team assumed a revenue figure included invoices (it didn't), that items closed themselves (they didn't) and that a list of reasons came pre-filled (it didn't); a summary's "quotes, callbacks and updates" read as if the feature scanned quotes; and nobody had said a reply goes out from the sender, not the assigned colleague. Each would have been a wrong sentence.

Keep three lists for the user, never guesses in the guide:

- **Questions for product**: anything you can't confirm.
- **Change requests for product**: every required setup step (could it come with defaults the reader can turn off or add to?) and every gap the guide has to work around ("resolve it yourself, because it doesn't"). The guide still describes today's app.
- **Bugs**: a UI bug or a confusing label the code shows. Don't document around it silently.

### 5. Write the guide

Copy `assets/template.md` to `<folder>/<feature-slug>.md` and replace every placeholder. The template's examples model the standard's rules, so keep its patterns: the three-part step, the icon described by shape and position, the filters note, merged tasks with one heading each.

Things that matter most:

- **About 10 pages after the cover.** Merge small tasks that happen in the same place, put filters and sorting in a note, use one screenshot per screen, and leave out what the reader can't act on.
- **Front matter:** `version: 1.0` only. No `updated:` date and no product release number: readers don't use them, and a date makes an accurate guide look stale.
- **Summary:** name exactly what the feature works from, and leave out nouns that are other screens (quotes, orders, tasks) unless it reads them.
- **Availability:** a callout whenever the feature isn't on every plan, platform or integration, with exclusions said plainly. Don't name a package unless product confirms it's how they sell today.
- **Help readers find things:** describe a wordless button by its shape and where it sits, pair a colour with something else, and name a side panel "the X drawer".
- **Real life:** customers get answers by phone, at the counter and in person, so cover those where a task depends on what happened.
- **AI features:** an `[!AI]` callout in Before you begin that opens "*Feature* is an AI feature." and says it can be wrong, plus a one-line reminder wherever the AI rates, explains or drafts something. Say what it does on its own and what it doesn't.
- **Sending:** any step that sends to a customer says who it goes out from.
- **Questions heading:** name it after the readers, such as **Questions office managers ask**.

### 6. Screenshots

Use demo data only: no real customer, phone number, email or address, and never production. Crop to the part that matters, with no browser bar and no mouse pointer. Point to a small or wordless element with a 1.5 pt circle and an arrow in callout red `#FF1744`. Captions are full sentences that say what to notice.

Read `references/screenshots.md` to take them with `scripts/shots/`. If there's no safe source yet, copy `assets/images/placeholder.svg` into the guide's `images/` folder, point the figure at it, and list each missing screenshot for the user.

### 7. Build and check

```powershell
node "<skill>/scripts/build.mjs" "<folder>/<feature-slug>.md"
```

If `<skill>/scripts/node_modules` is missing, run `npm ci` in `<skill>/scripts/` first. The build needs Google Chrome installed. Set a timeout of a few minutes.

The PDF lands next to the Markdown file. The build names the brand profile it used, then prints the checks against the standard; fix every warning rather than accepting it, because each one is a rule a reviewer would flag. Then look at the pages themselves: render them (for example with `pymupdf` at about 60 dpi) and check the page count, half-empty pages, a heading stranded at the foot of a page, and screenshots too small to read.

### 8. Deliver

Send the PDF to the user. In the reply, list:

- what the guide covers and its page count;
- the questions for product that block publishing;
- the change requests for product (setup that could have defaults, gaps the guide works around);
- any placeholder screenshots still to replace;
- any product bugs found along the way.

The guide is a draft until the people who support the readers review it. Don't send it to anyone or publish it on the user's behalf.

## Markdown the build understands

| Write | You get |
| --- | --- |
| Front matter `feature:`, `title:`, `subtitle:`, `type: how-to`, `appliesTo:`, `audience:`, `version:` | Cover (feature name large, title under it), summary, details row and contents. `type: how-to` turns the checks on. `typeLabel:` overrides the label on the cover. |
| `## Heading` | A numbered section and a contents entry. `###` for sub-sections and merged tasks. |
| Numbered list | Step markers. Lettered sub-steps for choices inside a step. |
| A paragraph starting "You'll see" | The result line under a step. |
| `*Optional:*` at the start of a step | An optional step. |
| `![Full sentence caption.](images/x.png)` alone on a line | A framed, numbered figure. |
| `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`, `[!DONE]`, `[!AVAILABILITY]`, `[!AI]` | Callouts. `[!DONE]` ends a task with what the reader sees when it worked. `[!AI]` is the purple "AI feature" note; the build warns when a guide mentions AI without one. |
| `**Bold**` | On-screen text, spelled exactly as the app spells it. The word checks skip bold text. |

The build adds the closing help line ("Still stuck?") from the brand profile's `help`.

## Covers

The default cover is the brand profile's `cover`, or `classic`. Set another with `cover: <style>` in the front matter or `--cover=<style>` on the command line. `--covers` prints a labelled catalog of the styles to choose from (`--covers=orbit,hexagon` for a few).

The brochure styles (`orbit`, `hexagon`, `facets`, `profile`) frame a product screenshot: add `coverImage: images/<file>.png` to the front matter, a wide crop of the feature's main screen (about 2:1) with demo data. The `corner`, `watermark` and `tint` styles need a `mark` (a square brand symbol) in the brand profile. Every style takes the brand's colours.
