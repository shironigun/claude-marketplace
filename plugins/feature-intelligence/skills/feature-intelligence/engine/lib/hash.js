'use strict';
const crypto = require('crypto');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const shortHash = (data) => sha256(data).slice(0, 12);

module.exports = { sha256, shortHash };
