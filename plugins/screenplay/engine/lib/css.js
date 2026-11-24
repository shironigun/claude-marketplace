'use strict';

// CSS text with its line ends as CSS reads them (CSS Syntax 3.3): CRLF, CR and FF are each one newline.
const lineEnds = (text) => text.replace(/\r\n?|\f/g, '\n');

// The character a hex escape names, or U+FFFD for a number that names none.
function fromHex(hex) {
  const code = parseInt(hex, 16);
  return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : '�';
}

// CSS text with its escapes decoded, as a browser reads it (`\75 rl(` is `url(`), so a check for what loads from
// outside cannot be spelled around (spec 5.11). Line ends are read first, as CSS reads them, so no caller can leave a
// CRLF that an escape would take as one space and a newline.
function decodeCssEscapes(text) {
  return lineEnds(text).replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n]?|([^\n]))/g, (m, hex, ch) => ch ?? fromHex(hex));
}

// The code point classes of CSS Syntax 4.2: a name takes letters, digits, `-`, `_` and anything past ASCII.
const isDigit = (c) => c >= '0' && c <= '9';
const isHex = (c) => isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
const isNameStart = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c >= '\u0080';
const isName = (c) => isNameStart(c) || isDigit(c) || c === '-';
const isSpace = (c) => c === ' ' || c === '\t' || c === '\n';
const isNonPrinting = (c) => c <= '\u0008' || c === '\u000b' || (c >= '\u000e' && c <= '\u001f') || c === '\u007f';

// CSS read in one pass as a browser tokenizes it (CSS Syntax 4), so every check reads the tokens the browser reads:
// comments come out; a backslash makes any character but a newline part of a name, wherever it stands; a string ends
// at its own quote, or at a raw newline as a bad string; and `url(` with an unquoted address is one token to its `)`,
// escapes honoured, or a bad url. Each token has its `type` (`space`, `ident`, `function`, `at`, `hash`, `string`,
// `bad-string`, `url`, `bad-url`, `number`, `percentage`, `dimension`, `delim`, `cdo`, `cdc`, or the character of a
// bracket, `,`, `:` or `;`), its `value` with the escapes decoded, and its `raw` text. A string or url that the end of
// the CSS cuts short is `open`.
function readCss(css) {
  const s = lineEnds(css).replace(/\0/g, '�');
  let i = 0;
  const validEscape = (k) => s[k] === '\\' && s[k + 1] !== '\n';
  const startsName = (k) => (s[k] === '-' ? isNameStart(s[k + 1]) || s[k + 1] === '-' || validEscape(k + 1)
    : isNameStart(s[k]) || validEscape(k));
  const startsNumber = (k) => {
    const j = s[k] === '+' || s[k] === '-' ? k + 1 : k;
    return isDigit(s[j]) || (s[j] === '.' && isDigit(s[j + 1]));
  };
  // The character an escape stands for, read from just after its backslash: up to six hex digits and one space
  // after them, or any other character as itself.
  const escaped = () => {
    if (i >= s.length) return '�';
    if (!isHex(s[i])) return s[i++];
    const start = i;
    while (i - start < 6 && isHex(s[i])) i += 1;
    const ch = fromHex(s.slice(start, i));
    if (isSpace(s[i])) i += 1;
    return ch;
  };
  // A name: its characters and escapes.
  const name = () => {
    let value = '';
    for (;;) {
      if (isName(s[i])) {
        value += s[i];
        i += 1;
      } else if (validEscape(i)) {
        i += 1;
        value += escaped();
      } else {
        return value;
      }
    }
  };
  // A string, read from just after its quote: a backslash and a newline drop out of it, and other escapes are
  // decoded. A raw newline ends it as a bad string, and the end of the CSS leaves it open.
  const string = (quote) => {
    let value = '';
    for (;;) {
      const c = s[i];
      if (c === undefined) return { type: 'string', value, open: true };
      if (c === '\n') return { type: 'bad-string', value };
      i += 1;
      if (c === quote) return { type: 'string', value };
      if (c !== '\\') value += c;
      else if (s[i] === '\n') i += 1;
      else if (i < s.length) value += escaped();
    }
  };
  // The rest of a bad url, to its `)`; an escaped `)` does not end it.
  const badUrl = (value) => {
    for (;;) {
      const c = s[i];
      i += 1;
      if (c === undefined || c === ')') return { type: 'bad-url', value };
      if (c === '\\' && s[i] !== '\n') escaped();
    }
  };
  // An unquoted url, read from just after `url(` to its `)`, escapes honoured. A space before its end, a quote, a `(`,
  // a character that does not print, or a backslash before a newline make it a bad url.
  const url = () => {
    while (isSpace(s[i])) i += 1;
    let value = '';
    for (;;) {
      const c = s[i];
      i += 1;
      if (c === ')') return { type: 'url', value };
      if (c === undefined) return { type: 'url', value, open: true };
      if (isSpace(c)) {
        while (isSpace(s[i])) i += 1;
        if (s[i] === undefined) return { type: 'url', value, open: true };
        if (s[i] !== ')') return badUrl(value);
        i += 1;
        return { type: 'url', value };
      }
      if (c === '"' || c === "'" || c === '(' || isNonPrinting(c)) return badUrl(value);
      if (c === '\\' && s[i] === '\n') return badUrl(value);
      value += c === '\\' ? escaped() : c;
    }
  };
  // An ident, or a function when `(` follows it; `url(` with an unquoted address after it is a url instead. A name is
  // compared in ASCII lower case, as CSS compares the names it knows.
  const identLike = () => {
    const value = name();
    if (s[i] !== '(') return { type: 'ident', value };
    i += 1;
    if (value.replace(/[A-Z]/g, (c) => c.toLowerCase()) === 'url') {
      while (isSpace(s[i]) && isSpace(s[i + 1])) i += 1;
      const quote = isSpace(s[i]) ? s[i + 1] : s[i];
      if (quote !== '"' && quote !== "'") return url();
    }
    return { type: 'function', value };
  };
  // A number, and the `%` or the unit's name after it.
  const number = () => {
    const digits = () => {
      while (isDigit(s[i])) i += 1;
    };
    if (s[i] === '+' || s[i] === '-') i += 1;
    digits();
    if (s[i] === '.' && isDigit(s[i + 1])) {
      i += 1;
      digits();
    }
    const sign = s[i + 1] === '+' || s[i + 1] === '-' ? 1 : 0;
    if ((s[i] === 'e' || s[i] === 'E') && isDigit(s[i + 1 + sign])) {
      i += 1 + sign;
      digits();
    }
    if (startsName(i)) return { type: 'dimension', value: name() };
    if (s[i] !== '%') return { type: 'number' };
    i += 1;
    return { type: 'percentage' };
  };
  // The token that starts at i.
  const next = () => {
    const c = s[i];
    if (isSpace(c)) {
      while (isSpace(s[i])) i += 1;
      return { type: 'space' };
    }
    if (c === '"' || c === "'") {
      i += 1;
      return string(c);
    }
    if (startsNumber(i)) return number();
    if (s.startsWith('-->', i)) {
      i += 3;
      return { type: 'cdc' };
    }
    if (startsName(i)) return identLike();
    i += 1;
    if (c === '#' && (isName(s[i]) || validEscape(i))) return { type: 'hash', value: name() };
    if (c === '@' && startsName(i)) return { type: 'at', value: name() };
    if (c === '<' && s.startsWith('!--', i)) {
      i += 3;
      return { type: 'cdo' };
    }
    return '()[]{},:;'.includes(c) ? { type: c } : { type: 'delim', value: c };
  };
  const tokens = [];
  while (i < s.length) {
    if (s.startsWith('/*', i)) {
      const end = s.indexOf('*/', i + 2);
      i = end < 0 ? s.length : end + 2;
    } else {
      const start = i;
      const token = next();
      token.raw = s.slice(start, i);
      tokens.push(token);
    }
  }
  return tokens;
}

module.exports = { decodeCssEscapes, readCss };
