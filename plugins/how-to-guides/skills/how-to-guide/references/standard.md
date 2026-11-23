---
feature: How-to guides
title: How to write a customer how-to guide
subtitle: The standard every how-to guide follows, so a busy reader at a customer business can finish a task on the first try.
type: reference
appliesTo: Customer-facing how-to guides for B2B software
audience: Anyone writing customer guides
version: 1.0
---

## What a how-to guide is for

A how-to guide is everything a reader needs to understand one feature of your product and use all of it. The reader works at a business that uses your software: a service manager at a dealership, a parts counter, a front desk, an office manager, an owner with a business to run. They read the guide once to learn the feature, then come back to it when they need one task.

This standard says **reader** for that person, and **their customers** for the people the reader serves. Your house rules can name them, for example "dealers" and "customers".

So a guide:

- Covers **one feature completely**: what it is, how it works, and every task a reader does with it.
- Starts from the **reader's problem**, then explains how the feature fixes it.
- Explains the feature **once**, in a How it works section, using the exact words on screen. The task sections then stay pure steps.
- Gives each task its **own section**, with detailed steps, the one best way to do it, and what the reader sees after each action.
- Answers the **questions readers actually ask**, and helps them **recover** when something goes wrong, right where it happens.

A knowledge base often splits a feature across several short articles. The guide brings it together in one place a reader can keep.

## The shape of every guide

Every guide uses these parts, in this order. The build adds the cover, summary, details, contents and the closing help line.

| Part | What goes in it | Required |
| --- | --- | --- |
| Feature and title | `feature:` is the product area readers know. `title:` is what the reader gets done. | Yes |
| Summary | One sentence: what the reader can do when they finish, and exactly what the feature works from. | Yes |
| Before you begin | The reader's problem in two lines, who can use it, what must be set up, an Availability callout when the feature isn't on every plan or platform, and an AI callout for an AI feature. | Yes |
| How it works | What the feature does, where it gets its information, and every term and label on screen, with screenshots. No steps here. | Yes |
| Tasks | One `##` section per task, named with a verb: *Review a request*, *Assign a request*. Detailed steps, and a `[!DONE]` callout where the task ends. | Yes |
| Tips to work faster | One to three habits that save time. | When useful |
| Questions readers ask | Short answers to the real questions: does it contact customers, can it be wrong, who can see it. Name the heading after your readers, such as **Questions dealers ask**. | Yes |
| If something goes wrong | A table: what you see, what to do. | Yes |
| Next steps | Related guides and knowledge base articles. | When useful |
| Still stuck? | Added by the build from the brand profile: where to get help. | Automatic |

### Keep it short enough to read

A complete guide still has to be one a reader will open. Aim for **about 10 pages after the cover** per feature:

- Merge small tasks that happen in the same place into one section, such as resolve, dismiss and restore.
- Put choices that change a view, like filters and sorting, in a short note, not in the steps.
- Use one screenshot per screen. Don't repeat a screen.
- Leave out anything the reader can't act on.

The first reviewer of an 18-page guide asked one thing before anything else: will anyone read this? Merging took that guide to 12 pages without losing a fact.

### Say exactly what the feature works from

Readers take every noun in the summary as something the feature touches. "Find the quotes, callbacks and updates your team promised" reads as if the feature scans quotes. So name the source plainly, "your team's text conversations", and say it again in **Before you begin**. Don't list things that are also the names of other screens, such as quotes, orders, tasks or invoices, unless the feature really reads them.

### Setup is a barrier

Every setup step is a reason a business doesn't turn a feature on. So:

- Say first what works with no setup at all.
- When a step is required, say why, who does it, and keep it to one section.
- When the feature comes with defaults, say what's there from the start, and present setup as optional changes.
- Raise every required setup step with product before you publish: could it come with defaults the reader can turn off or add to?

### Versions and dates

Readers don't know or use your release numbers, and a printed date makes an accurate guide look out of date. So the cover and the details carry only the **guide's own version number** (`version: 1.0`). Raise it when the guide changes. Leave `updated:` out of customer guides.

## Writing steps

Each step follows the same three beats:

1. **The action.** Say where, then what: "In **Reminders**, select **New Reminder**." One action per step.
2. **What you'll see.** Start a new line with "You'll see": "You'll see a drawer open with the name and the schedule." The build styles this line as a result.
3. **Why, in a few words, when it isn't obvious.** "This sets the basics before you write the message."

Also:

1. Bold every screen, button, tab and field exactly as the screen spells it.
2. Write a path with the › sign: **Settings › General**.
3. Start an optional step with *Optional:* in italics.
4. Use lettered sub-steps for choices inside a step.
5. Keep each stage to **10 steps or fewer**.
6. Use *must*, *can* and *may* exactly. If a step is required, don't write "you can".

### Help readers find things on screen

A name alone often isn't enough, especially on a large screen or for a reader with poor eyesight. So say **what it looks like and where it is**, then its name:

- "Select the circular arrow at the right end of the toolbar, next to **Location**."
- A button with no words is an **icon**. Describe its shape, and add a screenshot with a callout pointing to it.
- Pair a colour with something else: "the blue plus sign button", never "the blue button".
- A panel that opens on the right of the screen is a **drawer**, named by its title: the **Customer Details** drawer.

### Say who a message comes from

Whenever a step sends something to the reader's customers, say whose name or number it goes out under. Readers often act on a conversation that belongs to a colleague, and the customer may expect to hear from that colleague: "The reply goes out from you, not from the person the conversation is assigned to."

> [!TIP]
> Do the task in the app while you read your steps out loud. Any step where you hesitate needs a location or a "You'll see" line.

## Voice

How a good guide sounds to a busy reader:

- **Problem, then benefit, then steps.** Open with what gets easier for the business: fewer calls asking for status, no more phone tag, every request tracked.
- **Plain, warm, second person.** Short sentences. Contractions are fine. Talk the way a helpful colleague would.
- **Confident.** State what happens. One real limitation, said calmly, is fine. A list of edge cases is not.
- **The reader's words.** Use the words of their trade (repair order, walk-in, appointment, account), not software or engineering terms. Your house rules list them.
- **Name the exact screen.** "On the **Inventory** screen", not "in inventory".
- **Benefit names, not internal names.** "Send reminders to a second contact", not the name your team uses for the work behind it.
- **Reassure when something moved.** "Everything you used before is still here."
- **Team, not a person.** "Our support team", "our webinars". Never one person's name.
- **Real life, not only the app.** Customers get answers by phone, at the counter and in person too. When a task depends on what happened, cover those cases.
- **Few em-dashes.** A page full of them reads as machine-written. Use a period or a comma.
- **Don't tell readers how to feel.** Say what changed. They decide how they feel about it.

## Availability

Some features depend on the reader's plan, add-ons, platform or integrations (for a dealership, often the dealer management system). A reader finding out afterwards that a feature isn't on their account is the top support complaint the guide can prevent.

- Put a `[!AVAILABILITY]` callout in **Before you begin** whenever a feature isn't on every plan or platform.
- State exclusions plainly: "Not available on the Starter plan at this time."
- **Don't name a plan or package** unless product confirms it's how you sell today. Package names change. Until then, write "an add-on" or "contact our support team to add it".
- Name another company's product only in the Availability callout, or in a guide about working with that product.
- If you aren't sure, ask product before you publish. Never guess.

## AI features

AI features suggest. Readers decide. Every guide for an AI feature says so:

- **Say it's AI, in its own callout.** Put an `[!AI]` callout in **Before you begin** that opens with "*Feature* is an AI feature." and says its suggestions can be wrong. A line about AI inside a general note gets missed: reviewers asked for a disclaimer that was already there, folded into a note. The build warns when a guide mentions AI without one.
- **Remind them where the AI decides.** Where the guide explains something the AI works out, such as a rating, a reason or a suggested reply, add a short line that it can be wrong and what to check.
- **You stay in control.** Nothing is sent, changed or closed until the reader reviews it.
- **History isn't a forecast.** Past spend tells you who a customer is, not what they will buy.
- **Missing data stays missing.** When something isn't on file, say so. Never fill it in.
- **Say what it does on its own and what it doesn't.** Readers assume AI does more than it does. If something only happens when a person acts, say so.

## Screenshots

- Add a screenshot where something is hard to find, or where the reader needs to confirm they're in the right place.
- Crop to the part that matters, with as little empty space as possible. Never use a screenshot instead of a written step.
- Leave out the browser bar and the mouse pointer.
- Use demo data only. Never include a real customer's names, phone numbers, emails or addresses, and never capture production.
- Point to a small or wordless element with a callout: a circle or rectangle with a 1.5 pt outline and a solid arrow, in callout red **#FF1744**.
- Write the caption as a full sentence that says what to notice.

## When things go wrong

- Put a `[!WARNING]` right after the step where people make mistakes: how to notice it and how to fix it.
- Use `[!CAUTION]` for anything that can't be undone, such as a message that has gone out.
- End with an **If something goes wrong** table. Give real numbers where they help: "Reminders go out in batches every 15 minutes."
- Only document a limit or an error you have confirmed with product or seen in the app.

### Describe today, raise the gaps

The guide describes what the app does now. When a sentence asks readers to make up for something the feature doesn't do, such as "It isn't added to Resolved, so resolve it yourself", keep the sentence and send the gap to product as a change request. When a later release fixes it, update the guide then. Never describe planned behaviour as if it had shipped.

## Words to use

| Instead of | Write | Why |
| --- | --- | --- |
| Click, tap, hit | Select | One word for the web app and the mobile app. |
| Shows | Displays | The screen displays information. You see it. |
| See above, see below | The section's name | The page may break between the two. |
| The blue button | The blue plus sign button | Colour alone isn't enough to find it. |
| Please, simply, just, easy | Leave it out | Steps are instructions. Stuck readers feel worse. |
| Should | What happens, or what to do | "Should" sounds unsure. |
| The user | You | Talk to the reader directly. |
| An internal feature name | What the reader can do | Readers know the action, not the subsystem. |

Spell these the same way every time: **drop-down**, **checkbox**, **tooltip**, **double-click**, and your product's own name exactly as your house rules spell it. Spell out an acronym the first time it appears.

## Before you publish

- The feature name, title and summary agree with each other, and the summary names exactly what the feature works from.
- Every required setup step and every gap the guide works around has gone to product.
- An AI feature has its `[!AI]` callout, and every step that sends something to a customer says who it comes from.
- Every step has one action, a location and, where it helps, a "You'll see" line.
- Every behaviour the guide describes, including limits and error messages, is confirmed in the app or by product.
- The Availability callout is right for every plan and platform, or product has confirmed it.
- You followed the guide in the app yourself, start to finish.
- Screenshots match the current app and use demo data only.
- The guide is about 10 pages after the cover, or there's a reason it isn't.
- The build reports no warnings.

## Sources

- [DITA task topic (OASIS)](https://docs.oasis-open.org/dita/dita/v1.3/os/part2-tech-content/archSpec/technicalContent/dita-task-topic.html)
- [Writing step-by-step instructions (Microsoft Writing Style Guide)](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions)
- [Procedures (Google developer documentation style guide)](https://developers.google.com/style/procedures)
- [How-to guides (Diátaxis)](https://diataxis.fr/how-to-guides/)
- [Minimalism, J. Carroll: error recognition and recovery](https://www.instructionaldesign.org/theories/minimalism/)
- Two rounds of review by a support team that writes a dealer knowledge base: the page target, where-it-is-on-screen help, the source named in the summary, setup as a barrier, the AI callout, and who a reply comes from.
