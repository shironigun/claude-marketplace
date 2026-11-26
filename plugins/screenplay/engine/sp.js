#!/usr/bin/env node
'use strict';
// sp: the screenplay engine. `node sp.js help` lists the commands.
const { main } = require('./lib/cli');

Promise.resolve(main(process.argv.slice(2), {
  cwd: process.cwd(), env: process.env, stdout: process.stdout, stderr: process.stderr,
})).then((code) => {
  process.exitCode = code;
});
