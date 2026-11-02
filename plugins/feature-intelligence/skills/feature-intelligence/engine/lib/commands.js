'use strict';
const fs = require('fs');
const path = require('path');

// Each file in cmd/ is one command: {name, usage, summary, flags, run(ctx, args)}.
function loadCommands() {
  const dir = path.join(__dirname, 'cmd');
  const commands = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
    const cmd = require(path.join(dir, file));
    commands.set(cmd.name, cmd);
  }
  return commands;
}

module.exports = { loadCommands };
