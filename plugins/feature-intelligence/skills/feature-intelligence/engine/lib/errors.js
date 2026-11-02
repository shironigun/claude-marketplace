'use strict';

// Exit codes: 1 = a check failed (validation, threshold, conflict); 2 = the command was used wrongly.
class FiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FiError';
    this.code = code;
  }
}

const checkError = (message) => new FiError(message, 1);
const usageError = (message) => new FiError(message, 2);

module.exports = { FiError, checkError, usageError };
