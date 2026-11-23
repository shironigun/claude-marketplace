# Brand profile

The plugin ships no brand. Each organisation keeps its own `howto-brand.json`, with its logo and house rules, in its own files. The build finds the nearest `howto-brand.json` in the guide's folder or any folder above it, so one profile at the top of a guides folder brands every guide under it. `--brand=<file>` picks one explicitly.

Paths in the profile are relative to the profile file. Every field is optional.

```json
{
  "product": "Your product",
  "logo": "brand/logo.png",
  "logoOnDark": "brand/logo-white.png",
  "mark": "brand/mark.svg",
  "colors": { "primary": "#2b59c3", "accent": "#f0b323", "ink": "#263238" },
  "font": { "family": "Your Font", "file": "brand/your-font.woff2" },
  "cover": "classic",
  "help": "**Still stuck?** Select the chat button in the app to reach our support team, or visit [our help centre](https://example.com/help).",
  "rules": "house-rules.md"
}
```

| Field | What it does | Without it |
| --- | --- | --- |
| `product` | The product name in the page footer, and in the header and on the cover when there's no logo. | No name anywhere. |
| `logo` | The cover logo and the small logo at the top-left of every page. PNG or SVG, wide rather than tall. | The product name as text. |
| `logoOnDark` | A white version for the covers with a coloured top (`orbit`, `hexagon`, `profile`). | The logo turned white with a filter. |
| `mark` | A square brand symbol for the `corner`, `watermark` and `tint` covers. | Those three covers are hidden. |
| `colors.primary` | The brand colour: headings' numbers, step markers, links, table headers, covers. Lighter and darker shades are worked out from it. | A neutral blue. |
| `colors.accent` | Small accents: the dot in the kicker, the rule under the cover title. | Amber. |
| `colors.ink` | Body text. | Near-black blue grey. |
| `colors.deep`, `tint`, `ring`, `soft` | Override a worked-out shade when the brand guide names one. | Worked out from `primary`. |
| `font` | A web font for the whole guide: `family`, and `file` (WOFF2). Check its licence allows embedding in PDFs. | The system font (Segoe UI, system-ui). |
| `cover` | The default cover style. | `classic`. |
| `help` | The closing line on every how-to guide and walkthrough. Markdown links work. | "**Still stuck?** Contact our support team." |
| `rules` | A Markdown file of house rules the skill reads after the standard. | Only the standard applies. |

Colours must be six-digit hex (`#1a2b3c`); anything else is ignored with a warning, because they go straight into the page's CSS.

## What goes in the house rules

The standard is general. The `rules` file holds what only your organisation knows, so the skill gets it right without asking every time:

- What readers are called ("clients", "clinics", "account admins") and what their customers are called.
- The product's name and how it's spelled, and other words to spell one way.
- Plans, add-ons, platforms or integrations, and how to write them in an Availability callout.
- Where the code lives, which branch is what readers have, and anything read-only.
- Where help lives (a chat button, a help centre), for the `help` line.
- A team demo kit for screenshots, if there is one, and the fictional business it uses.
- The default output folder for guides.
- Decisions from past reviews, so the next guide doesn't repeat a fixed mistake.

Keep the profile, logos and rules file somewhere your team controls, such as a private repository. They aren't part of this plugin.
