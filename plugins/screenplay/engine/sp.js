#!/usr/bin/env node
'use strict';
// sp: the screenplay engine. `node sp.js help` lists the commands.
const { main } = require('./lib/cli');

process.exitCode = main(process.argv.slice(2), {
  cwd: process.cwd(), env: process.env, stdout: process.stdout, stderr: process.stderr,
});
