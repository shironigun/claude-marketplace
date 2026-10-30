#!/usr/bin/env node
// Builds one feature-explainer page from a content module.
//   node build.js <content.js> <out.html>
// The content module exports { title, brand, meta, hero, pages, glossary, footer } (see
// references/page-recipe.md) and builds its page HTML with the blocks in ../assets/vzkit.js.
// The output is a page body for the Artifact tool: no <!doctype>/<head> (the tool adds them).
'use strict';
const fs = require('fs'), path = require('path');
const ASSETS = path.join(__dirname, '..', 'assets');
const K = require(path.join(ASSETS, 'vzkit.js'));
const [, , contentPath, outPath] = process.argv;
if (!contentPath || !outPath) { console.error('usage: node build.js <content.js> <out.html>'); process.exit(2); }
const C = require(path.resolve(contentPath));
const esc = K.esc;

// ---- house-style lint for the page's audience (references/audiences.md): a fail stops the build
const findings = require('./lint-content.js').lint(C);
findings.forEach((r) => console.log((r.level === 'fail' ? 'FAIL ' : 'warn ') + r.page + ': ' + r.msg));
if (findings.some((r) => r.level === 'fail')) { console.error('lint failed for audience "' + (C.audience || 'all') + '": fix the FAIL lines above, then build again'); process.exit(1); }

// ---- sanity checks on the content: these mistakes broke earlier pages
const ids = C.pages.map((p) => p.id);
ids.forEach((id, i) => { if (ids.indexOf(id) !== i) throw new Error('duplicate page id ' + id); });
if (!/^[a-z][a-z0-9-]*$/.test(ids.join('-'))) throw new Error('page ids must be lowercase letters, digits and hyphens');
['settings', 'sidebar', 'customize', 'upgrade', 'downloads'].forEach((r) => { if (ids.indexOf(r) >= 0) throw new Error('page id "' + r + '" is reserved by the viewer'); });
if (!C.title || C.title.split(/\s+/).length > 5) throw new Error('title should be a 2-4 word name');

// ---- sidebar: groups in first-seen order
const groups = [];
C.pages.forEach((p) => { let g = groups.find((x) => x.name === p.group); if (!g) groups.push(g = { name: p.group, pages: [] }); g.pages.push(p); });
const chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
const side = '<aside class="sidenav" id="sidenav" aria-label="Pages">' +
  '<div class="sn-head"><button type="button" class="sn-toggle" id="railBtn" aria-label="Collapse the menu" title="Collapse the menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/></svg></button></div>' +
  groups.map((g) => '<div class="sn-group"><button type="button" class="sn-label" aria-expanded="true">' + esc(g.name) + chev + '</button><div class="sn-items">' +
    g.pages.map((p) => '<a href="#' + p.id + '" data-p="' + p.id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (K.P[p.icon] || K.P.doc) + '"/></svg>' + esc(p.label) + (p.tag ? '<span class="sn-tag">' + esc(p.tag) + '</span>' : '') + '</a>').join('') +
    '</div></div>').join('') +
  (C.meta ? '<div class="sn-meta">' + C.meta + '</div>' : '') + '</aside>';

// ---- hero (shown on the first page only)
const H = C.hero;
const hero = '<header class="hero"><div class="wrap"><span class="eyebrow">' + H.eyebrow + '</span><h1>' + H.h1 + '</h1><p class="lede">' + H.lede + '</p>' +
  (H.links ? '<p class="lede" style="font-size:15px;margin-top:10px">' + H.links + '</p>' : '') +
  '<div class="metarow">' + (H.chips || []).map((c) => '<span class="chip' + (c[2] ? ' live' : '') + '"><span class="k">' + c[0] + '</span><b>' + c[1] + '</b></span>').join('') + '</div></div></header>';

// ---- glossary page: cards rendered here, searched by the page script
function glossary(G) {
  const slug = (s) => 'g-' + s.toLowerCase().replace(/[^a-z]+/g, '-');
  return '<div class="gbar"><label for="gq" class="gsearch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"/></svg><input id="gq" type="search" placeholder="Search terms" autocomplete="off"></label><span class="gcount" id="gcount"></span></div>' +
    '<div class="gjump" id="gjump">' + G.map((g) => '<a href="#terms" data-g="' + slug(g[0]) + '">' + esc(g[0]) + '<span>' + g[1].length + '</span></a>').join('') + '</div>' +
    '<div id="glist">' + G.map((g) => '<div class="ggroup" id="' + slug(g[0]) + '"><h3 class="sub">' + esc(g[0]) + '</h3><div class="gcards">' +
      g[1].map((t) => '<div class="gterm"><b>' + t[0] + '</b><p>' + t[1] + '</p>' + (t[2] ? '<span>Where: ' + t[2] + '</span>' : '') + '</div>').join('') + '</div></div>').join('') + '</div>' +
    '<p class="note" id="gnone" hidden>No term matches. Try a shorter word.</p>';
}
const sections = C.pages.map((p, i) => '<section id="' + p.id + '"' + (i % 2 ? ' class="alt"' : '') + '><div class="wrap">' +
  (typeof p.html === 'function' ? p.html() : p.html) + (p.id === 'terms' && C.glossary ? glossary(C.glossary) : '') + '</div></section>').join('\n');

// ---- the page script: theme, tabs, copy, pages router (with in-page anchors), menu, glossary search
const PAGES = C.pages.map((p) => [p.id, p.group, p.label]);
const script = `(function(){
  var $=function(id){return document.getElementById(id);};
  var root=document.documentElement, tb=$('themeBtn'), ti=$('themeIcon');
  var sun='M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1';
  var moon='M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-8.54-6.54C12.92 3.04 12.46 3 12 3Z';
  function stored(){try{return localStorage.getItem('fx-theme')}catch(e){return null}}
  function sysDark(){return window.matchMedia&&matchMedia('(prefers-color-scheme:dark)').matches}
  function paint(t){var d=t==='dark';ti.innerHTML='<path d="'+(d?sun:moon)+'"'+(d?' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"':'')+'/>';}
  var init=stored(); if(init)root.setAttribute('data-theme',init); paint(init||(sysDark()?'dark':'light'));
  tb.addEventListener('click',function(){var c=root.getAttribute('data-theme')||(sysDark()?'dark':'light'),n=c==='dark'?'light':'dark';root.setAttribute('data-theme',n);paint(n);try{localStorage.setItem('fx-theme',n)}catch(e){}});
  document.querySelectorAll('[data-tabs]').forEach(function(g){var bs=g.querySelectorAll('[data-tab]');bs.forEach(function(b){b.addEventListener('click',function(){bs.forEach(function(x){var on=x===b;x.setAttribute('aria-selected',String(on));var p=$(x.getAttribute('data-tab'));if(p)p.hidden=!on;});});});});
  function sel(el){try{var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}}
  document.querySelectorAll('.copybtn').forEach(function(b){b.addEventListener('click',function(){var el=b.hasAttribute('data-copy-group')?b.closest('[data-tabs]').querySelector('pre:not([hidden])'):document.querySelector(b.getAttribute('data-copy'));if(!el)return;var o=b.textContent,done=function(){b.textContent='Copied';setTimeout(function(){b.textContent=o;},1400);};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(el.textContent).then(done).catch(function(){sel(el);done();});else{sel(el);done();}});});
  var PAGES=${JSON.stringify(PAGES)}, hero=document.querySelector('header.hero');
  var e2=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');};
  function idx(id){for(var i=0;i<PAGES.length;i++)if(PAGES[i][0]===id)return i;return -1;}
  function menu(o){document.body.classList.toggle('menu-open',o);$('scrim').hidden=!o;$('menuBtn').setAttribute('aria-expanded',String(o));}
  function show(id){
    var i=idx(id), target=null;
    if(i<0&&id){var el=document.getElementById(id),sec=el&&el.closest('section[id]');if(sec&&idx(sec.id)>=0){i=idx(sec.id);target=el;}}
    if(i<0)i=0; var p=PAGES[i], cur=p[0];
    PAGES.forEach(function(q){var s=$(q[0]);if(s)s.hidden=q[0]!==cur;});
    hero.hidden=i!==0;
    document.querySelectorAll('#sidenav a[data-p]').forEach(function(a){if(a.getAttribute('data-p')===cur)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('crumb').innerHTML='&middot; '+e2(p[1])+' &rsaquo; <b>'+e2(p[2])+'</b>';
    var pr=PAGES[i-1], nx=PAGES[i+1];
    $('pager').innerHTML=(pr?'<a href="#'+pr[0]+'"><span>&larr; Previous</span><b>'+e2(pr[2])+'</b></a>':'')+(nx?'<a class="next" href="#'+nx[0]+'"><span>Next &rarr;</span><b>'+e2(nx[2])+'</b></a>':'');
    menu(false);
    if(target){if(target.tagName==='DETAILS')target.open=true;setTimeout(function(){target.scrollIntoView({block:'start',behavior:'instant'});},60);return;}
    window.scrollTo({top:0,behavior:'instant'});
  }
  function go(id){if(idx(id)<0)return;if(location.hash.slice(1)===id)show(id);else location.hash=id;}
  window.fxGo=go;
  addEventListener('hashchange',function(){show(location.hash.slice(1));});
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;var id=a.getAttribute('href').slice(1);if(idx(id)<0)return;e.preventDefault();go(id);});
  var rb=$('railBtn');
  function rail(on){document.body.classList.toggle('rail',on);var t=on?'Expand the menu':'Collapse the menu';rb.setAttribute('aria-label',t);rb.title=t;try{localStorage.setItem('fx-rail',on?'1':'0');}catch(e){}}
  document.querySelectorAll('#sidenav a[data-p]').forEach(function(a){a.title=a.textContent.trim();});
  rb.addEventListener('click',function(){rail(!document.body.classList.contains('rail'));});
  var ro=false;try{ro=localStorage.getItem('fx-rail')==='1';}catch(e){} rail(ro);
  document.querySelectorAll('#sidenav .sn-label').forEach(function(b){b.addEventListener('click',function(){var it=b.nextElementSibling,o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(o));it.hidden=!o;});});
  $('menuBtn').addEventListener('click',function(){menu(!document.body.classList.contains('menu-open'));});
  $('scrim').addEventListener('click',function(){menu(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('menu-open'))menu(false);});
  if($('gq')){
    var cards=[].slice.call(document.querySelectorAll('#glist .gterm')),total=cards.length;
    var gf=function(){var q=$('gq').value.trim().toLowerCase(),n=0;cards.forEach(function(c){var h=!q||c.textContent.toLowerCase().indexOf(q)>=0;c.hidden=!h;if(h)n++;});document.querySelectorAll('#glist .ggroup').forEach(function(g){g.hidden=!g.querySelector('.gterm:not([hidden])');});$('gcount').textContent=q?n+' of '+total+' terms':total+' terms';$('gnone').hidden=n>0;};
    $('gq').addEventListener('input',gf);
    $('gjump').addEventListener('click',function(e){var a=e.target.closest('[data-g]');if(!a)return;e.preventDefault();e.stopPropagation();$('gq').value='';gf();var el=$(a.getAttribute('data-g'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});});
    gf();
  }
  show(location.hash.slice(1)||PAGES[0][0]);
})();`;

const css = fs.readFileSync(path.join(ASSETS, 'shell.css'), 'utf8');
const html = [
  '<title>' + esc(C.title) + '</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@600;700&display=swap">',
  '<style>', css, (C.css || ''), '</style>',
  '<nav class="top"><div class="wrap">' +
    '<button type="button" class="tgl menu-btn" id="menuBtn" aria-label="Open the menu" aria-controls="sidenav" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z"/></svg></button>' +
    '<span class="brand"><span class="dot"></span>' + esc(C.brand || C.title) + '</span><span class="crumb" id="crumb"></span>' +
    '<button type="button" class="tgl" id="themeBtn" aria-label="Toggle light or dark" title="Toggle theme" style="margin-left:auto"><svg id="themeIcon" viewBox="0 0 24 24" aria-hidden="true"></svg></button></div></nav>',
  '<div class="scrim" id="scrim" hidden></div>', side,
  '<main id="pages">', hero, sections,
  '<nav class="wrap pager" id="pager" aria-label="Previous and next page"></nav>',
  '<footer class="foot"><div class="wrap">' + (C.footer || '') + '</div></footer>', '</main>',
  '<script>', script, '</script>', ''
].join('\n');
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log('wrote', outPath, (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB,', C.pages.length, 'pages');
