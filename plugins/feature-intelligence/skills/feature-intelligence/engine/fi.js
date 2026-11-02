#!/usr/bin/env node
'use strict';
// fi: the feature-intelligence engine. `node fi.js help` lists the commands.
const { main } = require('./lib/cli');

process.exitCode = main(process.argv.slice(2), {
  cwd: process.cwd(), env: process.env, stdout: process.stdout, stderr: process.stderr,
});
