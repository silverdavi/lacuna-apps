// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/codecs 0.1.0: snapshot of lacuna-components codecs at d422a73 by sync-toolbox-components.py; a change gets a new version.
function utf8Encode(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    // surrogate pair
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = (c - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0x10000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return Uint8Array.from(bytes);
}

function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i]!;
    let code: number;
    if (b < 0x80) {
      code = b;
      i += 1;
    } else if ((b & 0xe0) === 0xc0) {
      code = ((b & 0x1f) << 6) | (bytes[i + 1]! & 0x3f);
      i += 2;
    } else if ((b & 0xf0) === 0xe0) {
      code = ((b & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f);
      i += 3;
    } else {
      code = ((b & 0x07) << 18) | ((bytes[i + 1]! & 0x3f) << 12) | ((bytes[i + 2]! & 0x3f) << 6) | (bytes[i + 3]! & 0x3f);
      i += 4;
    }
    if (code >= 0x10000) {
      code -= 0x10000;
      out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    } else {
      out += String.fromCharCode(code);
    }
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64Encode(input: string): string {
  const bytes = utf8Encode(input);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += B64.charAt(b0 >> 2);
    out += B64.charAt(((b0 & 3) << 4) | (b1 >> 4));
    out += i + 1 < bytes.length ? B64.charAt(((b1 & 15) << 2) | (b2 >> 6)) : '=';
    out += i + 2 < bytes.length ? B64.charAt(b2 & 63) : '=';
  }
  return out;
}

export function base64Decode(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]!);
    const c1 = i + 1 < clean.length ? B64.indexOf(clean[i + 1]!) : 0;
    const c2 = i + 2 < clean.length ? B64.indexOf(clean[i + 2]!) : 0;
    const c3 = i + 3 < clean.length ? B64.indexOf(clean[i + 3]!) : 0;
    bytes.push(((c0 << 2) | (c1 >> 4)) & 0xff);
    if (i + 2 < clean.length) bytes.push(((c1 << 4) | (c2 >> 2)) & 0xff);
    if (i + 3 < clean.length) bytes.push(((c2 << 6) | c3) & 0xff);
  }
  return utf8Decode(Uint8Array.from(bytes));
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

export function toHex(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    out += input.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return out;
}

export function fromHex(input: string): string {
  if (!/^[0-9a-fA-F]*$/.test(input) || input.length % 2 !== 0) {
    throw new Error(`invalid hex string: ${input}`);
  }
  let out = '';
  for (let i = 0; i < input.length; i += 2) {
    out += String.fromCharCode(parseInt(input.slice(i, i + 2), 16));
  }
  return out;
}

export function toBase(input: number, base: number): string {
  if (!Number.isInteger(input) || input < 0) {
    throw new Error(`invalid number: ${input}`);
  }
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new Error(`invalid base: ${base}`);
  }
  if (input === 0) return '0';
  let n = input;
  let out = '';
  while (n > 0) {
    const digit = n % base;
    out = digit.toString(base) + out;
    n = Math.floor(n / base);
  }
  return out;
}

export function fromBase(input: string, base: number): number {
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new Error(`invalid base: ${base}`);
  }
  if (input.length === 0) return 0;
  if (!/^[0-9a-z]+$/i.test(input)) {
    throw new Error(`invalid base-${base} string: ${input}`);
  }
  let result = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!.toLowerCase();
    const value = c >= 'a' ? c.charCodeAt(0) - 87 : c.charCodeAt(0) - 48;
    if (value < 0 || value >= base) {
      throw new Error(`digit out of range for base ${base}: ${input}`);
    }
    result = result * base + value;
  }
  return result;
}

const ROMAN: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(input: number): string {
  if (!Number.isInteger(input) || input < 1 || input > 3999) {
    throw new Error(`invalid Roman numeral value: ${input}`);
  }
  let n = input;
  let out = '';
  for (const [value, numeral] of ROMAN) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

const ROMAN_MAP: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

// Pre-compute the canonical forms for 1–3999 from toRoman. fromRoman only
// accepts strings that toRoman can produce, so it rejects malformed inputs
// (wrong letters, out-of-range values, repeated hundreds like 'MMMI').
const VALID_ROMAN: Set<string> = (() => {
  const s = new Set<string>();
  for (let n = 1; n <= 3999; n++) {
    s.add(toRoman(n));
  }
  return s;
})();

export function fromRoman(input: string): number {
  if (input.length === 0) {
    throw new Error('empty Roman numeral');
  }
  if (!VALID_ROMAN.has(input)) {
    throw new Error(`invalid Roman numeral: ${input}`);
  }
  let total = 0;
  for (let i = input.length - 1; i >= 0; i--) {
    const value = ROMAN_MAP[input[i]!]!;
    const nextValue = i < input.length - 1 ? ROMAN_MAP[input[i + 1]!] : undefined;
    if (nextValue !== undefined && value < nextValue) {
      total -= value;
    } else {
      total += value;
    }
  }
  return total;
}
