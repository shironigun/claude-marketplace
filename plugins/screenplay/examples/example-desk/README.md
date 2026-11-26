# Example Desk

A tiny two-brand web app with a reminders queue. It has no dependencies.

    node server.js

Then open http://127.0.0.1:5317 for Harbor, or http://127.0.0.1:5317/partner for Lumen. Set `workspace.partner`
to `true` in `config.json` to show Lumen everywhere. Pages: Dashboard, Reminders, Customers.

## Analysing it

Copy this folder outside any git repository and make the copy a repository of its own:

    git init
    git add -A
    git commit -m "example-desk"

Then run screenplay from the copy.
