'use strict';

// Exit codes: 1 = a check failed (validation, a missing workspace file); 2 = the command was used wrongly.
// cli.js turns any other exception into exit code 3.
class SpError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SpError';
    this.code = code;
  }
}

const checkError = (message) => new SpError(message, 1);
const usageError = (message) => new SpError(message, 2);

module.exports = { SpError, checkError, usageError };
