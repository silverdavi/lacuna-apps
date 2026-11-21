// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/password-generate 0.1.0: snapshot of lacuna-components passwordGenerate at d422a73 by sync-toolbox-components.py; a change gets a new version.
import {
  mulberry32,
  randomInt,
  type Rng,
} from '@lacuna/random';

export interface PasswordRules {
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  appendNumber: boolean;
}

export interface GenerateResult {
  value: string;
  entropy: number;
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIGUOUS = '0O1lI';

const WORDS = [
  'apple',
  'brave',
  'candy',
  'delta',
  'ember',
  'fable',
  'granite',
  'harbor',
  'indigo',
  'jazz',
  'kiwi',
  'lantern',
  'marble',
  'nectar',
  'orbit',
  'pearl',
  'quartz',
  'rocket',
  'sable',
  'tulip',
  'umber',
  'violet',
  'walnut',
  'xenon',
  'yarn',
  'zephyr',
];

function buildPool(rules: PasswordRules): string {
  let pool = '';
  if (rules.upper) pool += UPPER;
  if (rules.lower) pool += LOWER;
  if (rules.digits) pool += DIGITS;
  if (rules.symbols) pool += SYMBOLS;
  if (rules.excludeAmbiguous) {
    pool = pool
      .split('')
      .filter((ch) => !AMBIGUOUS.includes(ch))
      .join('');
  }
  return pool;
}

function makeRng(seed?: number): Rng {
  return typeof seed === 'number' ? mulberry32(seed) : cryptoRngLocal();
}

function cryptoRngLocal(): Rng {
  const bytes = new Uint32Array(1);
  return () => {
    crypto.getRandomValues(bytes);
    return (bytes[0] ?? 0) / 4294967296;
  };
}

function distinctChars(value: string): number {
  const seen = new Set<string>();
  for (const ch of value) seen.add(ch);
  return seen.size;
}

export function generatePassword(
  length: number,
  rules: PasswordRules,
  seed?: number,
): GenerateResult {
  if (length <= 0) {
    throw new Error('length must be a positive number');
  }
  const pool = buildPool(rules);
  if (pool.length === 0) {
    throw new Error('at least one character class must be enabled');
  }
  const rng = makeRng(seed);
  const chars: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const idx = randomInt(rng, 0, pool.length - 1);
    const ch = pool[idx];
    if (ch === undefined) throw new Error('pool index out of range');
    chars.push(ch);
  }
  const value = chars.join('');
  const entropy = length * Math.log2(pool.length);
  return { value, entropy };
}

export function generatePassphrase(
  options: PassphraseOptions,
  seed?: number,
): GenerateResult {
  const { wordCount, separator, capitalize, appendNumber } = options;
  if (wordCount <= 0) {
    throw new Error('wordCount must be a positive number');
  }
  const rng = makeRng(seed);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i += 1) {
    const idx = randomInt(rng, 0, WORDS.length - 1);
    const word = WORDS[idx];
    if (word === undefined) throw new Error('word list index out of range');
    words.push(capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word);
  }
  let value = words.join(separator);
  let entropy = wordCount * Math.log2(WORDS.length);
  if (appendNumber) {
    const digit = randomInt(rng, 0, 9);
    value += String(digit);
    entropy += Math.log2(10);
  }
  return { value, entropy };
}

export function estimateEntropy(value: string): number {
  if (value.length === 0) return 0;
  const distinct = distinctChars(value);
  if (distinct <= 1) return 0;
  return Math.log2(distinct) * value.length;
}
