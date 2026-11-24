'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');

// The mods catalog (spec 9): the formats, the mods that take one option each (the default first), and the
// walkthrough patterns. An option marked r2 arrives in release 2.
const CATALOG = JSON.parse(readText(fs.readFileSync(path.join(__dirname, '..', 'catalog', 'mods.json'))));
const FORMAT_IDS = CATALOG.formats.map((f) => f.id);

const formatOf = (id) => CATALOG.formats.find((f) => f.id === id);

module.exports = { CATALOG, FORMAT_IDS, formatOf };
