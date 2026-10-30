// In-browser check for a built feature-explainer page. Paste this file's whole text into the browser
// tool's JavaScript runner (it is one expression and returns a report). It opens every page in turn and
// reports what a reviewer would otherwise only spot by eye:
//   overflow   page wider than the viewport on any page (on a phone copy, this means sideways scrolling)
//   overlaps   two SVG labels drawn on top of each other
//   outOfBox   SVG text running past its box, or past the drawing's edge
// An empty list everywhere means the page passes. Fix what it reports, rebuild, and run it again.
await (async () => {
  const W = document.documentElement.clientWidth, report = { viewport: W, pages: {} };
  const ids = [...document.querySelectorAll('#sidenav a[data-p]')].map((a) => a.getAttribute('data-p'));
  for (const id of ids) {
    location.hash = id;
    await new Promise((r) => setTimeout(r, 250));
    const sec = document.getElementById(id), r = { overflow: document.documentElement.scrollWidth - W, overlaps: [], outOfBox: [] };
    sec.querySelectorAll('svg.dg, svg.vz-mini').forEach((sv) => {
      const vb = sv.viewBox.baseVal, ts = [...sv.querySelectorAll('text')].map((t) => ({ t: t.textContent, b: t.getBBox(), g: t.closest('g[transform]') }));
      ts.forEach((a) => { if (!a.g && (a.b.x < 0 || a.b.x + a.b.width > vb.width + 0.5 || a.b.y + a.b.height > vb.height + 0.5)) r.outOfBox.push('edge: ' + a.t); });
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i].b, c = ts[j].b;
        if (!ts[i].g && !ts[j].g && a.x < c.x + c.width - 1 && c.x < a.x + a.width - 1 && a.y < c.y + c.height - 1 && c.y < a.y + a.height - 1) r.overlaps.push(ts[i].t + ' <> ' + ts[j].t);
      }
      sv.querySelectorAll('g > rect').forEach((rect) => { const rb = rect.getBBox();
        rect.parentNode.querySelectorAll('text').forEach((t) => { const b = t.getBBox(); if (b.x < rb.x + 2 || b.x + b.width > rb.x + rb.width - 2) r.outOfBox.push('box: ' + t.textContent); }); });
    });
    if (r.overflow > 0 || r.overlaps.length || r.outOfBox.length) report.pages[id] = r;
  }
  location.hash = ids[0];
  report.ok = Object.keys(report.pages).length === 0;
  return report;
})()
