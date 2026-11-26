'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// The kit (spec 7.8), written fresh for the plugin: its scripts in the order they build on one another, and its CSS.
const KIT_DIR = path.join(__dirname, '..', '..', 'skills', 'app-film', 'kit');
const KIT_FILES = ['core', 'camera', 'world', 'cards', 'focus', 'pointer', 'typing', 'patterns', 'score'];

// The kit as one script, the Motion film's shared module: it defines `window.W` with the kit under `sp`, as the player
// asks of `shared.js`, and each kit file adds to the one namespace `SP`.
function kitBundle() {
  const files = KIT_FILES.map((f) => fs.readFileSync(path.join(KIT_DIR, `${f}.js`), 'utf8'));
  return `window.W = (function () {\n  const SP = {};\n${files.join('\n')}\n  return { sp: SP };\n})();\n`;
}

// The kit's CSS, which goes into each brand's base.css after the film's four colours.
const kitCss = () => fs.readFileSync(path.join(KIT_DIR, 'kit.css'), 'utf8');

// The kit as the player runs it, without a page: its pure parts, such as the score's cues, for the engine and the
// tests. Its values come from the sandbox's own realm.
function kitSandbox() {
  const ctx = { window: {} };
  vm.runInNewContext(kitBundle(), ctx);
  return ctx.window.W.sp;
}

module.exports = { KIT_DIR, KIT_FILES, kitBundle, kitCss, kitSandbox };
