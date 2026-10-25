// This util purposes are
//
//  1. Validate and clean the input on the way in
//  2. Encode the out put
//  3. This is only a client side check the server must do its own validation as well.

// This is the hard cap on the name length of a given input
const MAX_CHARACTER_LENGTH_LIMIT = 255;
// This is the hard cap of nesting a object can do with its values
const MAX_NESTING_LIMIT = 10;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// common html escapes
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
};

// below are the different patterns used defend against injection attacks
// <script>/<style> blocks script injections including their contents
const BLOCK_PATTERN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
// anything that looks like a tag, comment or doctype
// Requires a letter, "/", "!" or "?" after "<" so text like "a < b" is not blocked.
const TAG_PATTERN = /<\/?[a-z!?][^>]*>/gi;
// control chars (except \t \n \r)
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// zero-width characters and bidirectional overrides
const INVISIBLE_CHARACTERS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;


// this method returns the type of a value
function returnType(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return 'array';
  return typeof value;
}


// encode text for safe output when displayed through a html text element
// this is not suitable for Java Script, CSS or URLs
export function escapeHtml(input) {
  return String(input ?? '').replace(/[&<>"'`]/g, (ch) => HTML_ESCAPES[ch])
}

// cleans a plain text (string), this does not use the
export function sanitiseString(input, { trim = true, normalise = true } = {}) {
  // type check
  if (typeof input !== 'string') {
    throw new TypeError(`Expected string but received ${returnType(input)}`);
  }
  // character limit check
  if (input.length > MAX_CHARACTER_LENGTH_LIMIT) {
    throw new RangeError(`Input exceeds ${MAX_CHARACTER_LENGTH_LIMIT} characters`);
  }
  // normalise input
  let normalInput = input;
  if (normalise) normalInput = normalInput.normalize('NFKC');

  // preform cleaning of the normal input
  normalInput = normalInput.replace(CONTROL_CHARACTERS, '').replace(INVISIBLE_CHARACTERS, '');

  // to protect against nested payloads e.g  <scr<script></script>ipt>
  // we need to repeatedly remove the injection until it is unable to cause damage to the system
  let previous;
  let nesting = 0;
  do {
    previous = normalInput;
    normalInput = normalInput.replace(BLOCK_PATTERN, '').replace(TAG_PATTERN, '');
    nesting += 1;
  } while (normalInput !== previous && nesting < 50);
  // remove the all tag brackets in the string if the nesting is above 50
  if (normalInput !== previous) normalInput = normalInput.replace(/[<>]/g, '');

  if (trim) normalInput = normalInput.trim();

  return normalInput;
}

export function sanitiseNumber(input) {
  const num = Number(input);
  return Number.isFinite(num) ? num : 0;
}

// the options = {} refer to the options for the string sanitiser if the user wants to turn off the trim and normalisation

// for an object we
export function sanitiseObject(value, options = {}, depth = 0) {
  if (depth > MAX_NESTING_LIMIT) {
    throw new RangeError('Input is nested too deeply');
  }
  // check the value type and handle the cleaning of the values appropriately
  switch (typeof value) {
    case 'string':
      return sanitiseString(value, options.string);
    case 'number':
      return sanitiseNumber(value);
    case 'boolean':
    case 'undefined':
      return value;
    case 'object': {
      if (value === null) return null;
      if (Array.isArray(value)) {
        return value.map((item) => sanitiseObject(item, options, depth + 1));
      }
      const out = {};
      for (const [key, item] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key)) continue; // prototype pollution guard
        out[key] = sanitiseObject(item, options, depth + 1);
      }
      return out;
    }
    default:
      throw new TypeError(`Unsupported value type: ${typeof value}`);
  }
}

// router function allows for easy use of sanitisation
export function sanitise(input, type = 'string', options = {}) {
  switch (type) {
    case 'string':
      // Allow harmless primitives, but never stringify objects/null.
      if (typeof input === 'number' || typeof input === 'boolean') {
        input = String(input);
      }
      if (typeof input !== 'string') {
        throw new TypeError(`Expected string but received ${returnType(input)}`);
      }
      return sanitiseString(input, options);
    case 'number':
      return sanitiseNumber(input);
    case 'object':
      if (input === null || typeof input !== 'object') {
        throw new TypeError(`Expected object but received ${returnType(input)}`);
      }
      return sanitiseObject(input, options);
    default:
      throw new TypeError(`Unsupported type "${type}"`);
  }
}

export default {
  sanitise,
  sanitiseString,
  sanitiseNumber,
  sanitiseObject,
  escapeHtml, // .vue already escapes  this is to be used in .html file if any are added.
};
