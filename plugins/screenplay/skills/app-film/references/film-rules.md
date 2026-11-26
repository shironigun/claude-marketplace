# Film rules

Always on; no mod turns them off (spec 8). The story already follows rules 4, 5, 6, 10 and 11; the screens, the
build and the checks hold a film to all twelve.

1. The app looks like its code: its own markup, classes, values and fonts, measured after layout, with scoped CSS, no
   stray scrollbars, and no outline, glow or tint the code does not have.
2. Nothing bleeds through an overlay. An overlay a beat opens opens wholly in the frame and has finished opening
   before the camera moves on, and a dialog or toast is never cut by the frame's edge.
3. Holds are still; the camera moves only between shots.
4. One thing at a time: a caption and its focus leave before the camera moves or the scene cuts, and scene text is
   gone before the next shot enters.
5. Point at the real control a user would touch (the navigation entry, not the page title).
6. Captions are plain "label: value" in the product's own words.
7. Small targets get a close-up.
8. A lifted card keeps 12 px padding on every side and holds only its target. Cards, chips and captions stay inside
   the safe area, 40 px from each frame edge at 1080p.
9. Leaders end on edges; the cursor stays on its target.
10. Nothing the app cannot do appears. Every caption traces to the ledger, and unreleased work carries a status
    chip.
11. Demo data only.
12. The same frame renders the same, cold or after scrubbing.
