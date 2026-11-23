// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/money 0.1.0: snapshot of lacuna-components money at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// Includes logic adapted from the open-source project credited in NOTICE.md, under its licence.
export type MinorUnits = number; // integer, e.g. cents

export interface MoneyOptions {
  /** ISO 4217 currency code, e.g. 'USD'. Default 'USD'. */
  currency?: string;
  /** Locale for formatting, e.g. 'en-US'. Default 'en-US'. */
  locale?: string;
}

const SCALE = 100;
const SCALE_BIG = 100n;
const MINOR_DIGITS = 2;

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function truncToBigInt(value: number): bigint {
  if (!isFiniteNumber(value)) {
    throw new RangeError(`Not a finite number: ${value}`);
  }
  return BigInt(Math.trunc(value));
}

function parseMajorString(major: string): number {
  if (major === '' || major === '-' || major === '.') {
    throw new RangeError(`Not a finite number: ${major}`);
  }
  let value = major;
  let sign = 1;
  if (value[0] === '-') {
    sign = -1;
    value = value.slice(1);
  } else if (value[0] === '+') {
    value = value.slice(1);
  }
  if (value === '' || !/^\d*\.?\d*$/.test(value)) {
    throw new RangeError(`Not a finite number: ${major}`);
  }
  const dot = value.indexOf('.');
  const integerPart = dot === -1 ? value : value.slice(0, dot);
  const fractionalPart = dot === -1 ? '' : value.slice(dot + 1);
  const whole = BigInt(integerPart === '' ? '0' : integerPart);
  const minor = BigInt(
    fractionalPart.length === 0
      ? '0'
      : fractionalPart.slice(0, MINOR_DIGITS).padEnd(MINOR_DIGITS, '0') || '0',
  );
  return sign * Number(whole * SCALE_BIG + minor);
}

export function toMinorUnits(major: number, _currency?: string): MinorUnits {
  if (!isFiniteNumber(major)) {
    throw new RangeError(`Not a finite number: ${major}`);
  }
  return parseMajorString(String(major));
}

export function fromMinorUnits(minor: MinorUnits, _currency?: string): number {
  if (!isFiniteNumber(minor)) {
    throw new RangeError(`Not a finite number: ${minor}`);
  }
  const value = Math.trunc(minor);
  const negative = value < 0;
  const digits = String(Math.abs(value)).padStart(MINOR_DIGITS + 1, '0');
  const integerPart = digits.slice(0, -MINOR_DIGITS);
  const fractionalPart = digits.slice(-MINOR_DIGITS);
  const minorSuffix = fractionalPart === '00' ? '' : `.${fractionalPart}`;
  const magnitude = integerPart === '0' ? `0${minorSuffix}` : `${integerPart}${minorSuffix}`;
  return negative ? -Number(magnitude) : Number(magnitude);
}

export function add(a: MinorUnits, b: MinorUnits): MinorUnits {
  return Number(truncToBigInt(a) + truncToBigInt(b));
}

export function sub(a: MinorUnits, b: MinorUnits): MinorUnits {
  return Number(truncToBigInt(a) - truncToBigInt(b));
}

/**
 * Multiply a minor-unit amount by a whole-number multiplier.
 */
export function mul(a: MinorUnits, b: number): MinorUnits {
  return Number(truncToBigInt(a) * truncToBigInt(b));
}

/**
 * Divide a minor-unit amount by a whole-number divisor, truncating the
 * resulting fractional minor units toward zero.
 */
export function div(a: MinorUnits, b: number): MinorUnits {
  const divisor = truncToBigInt(b);
  if (divisor === 0n) {
    throw new RangeError('Division by zero');
  }
  const dividend = truncToBigInt(a);
  const negative = (dividend < 0n) !== (divisor < 0n);
  const quotient = (dividend < 0n ? -dividend : dividend) / (divisor < 0n ? -divisor : divisor);
  return Number(negative ? -quotient : quotient);
}

export function roundMinor(
  minor: MinorUnits,
  mode: 'half-up' | 'half-even' | 'truncate' = 'half-up',
): MinorUnits {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs);
  const remainder = abs - whole;
  let result: number;
  if (mode === 'truncate') {
    result = whole;
  } else if (remainder < 0.5) {
    result = whole;
  } else if (remainder > 0.5) {
    result = whole + 1;
  } else if (mode === 'half-even') {
    result = whole % 2 === 0 ? whole : whole + 1;
  } else {
    result = whole + 1;
  }
  return negative ? -result : result;
}

/**
 * Split `total` minor units across `parts` weights using the largest remainder
 * method, so the returned values are integers that sum exactly to `total`.
 */
export function allocate(total: MinorUnits, parts: readonly number[]): MinorUnits[] {
  const weights: number[] = [];
  let sum = 0;
  for (const weight of parts) {
    if (!isFiniteNumber(weight) || weight < 0) {
      throw new RangeError('Weights must be finite and non-negative');
    }
    weights.push(weight);
    sum += weight;
  }
  const n = weights.length;
  if (n === 0) {
    return [];
  }
  const totalBigInt = BigInt(Math.trunc(total));
  const results: MinorUnits[] = new Array(n).fill(0);
  if (sum === 0) {
    if (totalBigInt === 0n) {
      return results;
    }
    throw new RangeError('Cannot allocate a non-zero total across zero weights');
  }
  const sumBigInt = BigInt(Math.trunc(sum));
  let allocated = 0n;
  const fractional: Array<{ index: number; fraction: number }> = [];
  for (let i = 0; i < n; i += 1) {
    const weight = weights[i];
    if (weight === undefined) continue;
    const scaled = BigInt(Math.trunc(weight)) * totalBigInt;
    const base = scaled / sumBigInt;
    const rem = scaled % sumBigInt;
    results[i] = Number(base);
    allocated += base;
    if (rem > 0n) {
      fractional.push({ index: i, fraction: Number(rem) / Number(sumBigInt) });
    }
  }
  let remaining = Number(totalBigInt - allocated);
  fractional.sort((left, right) => {
    if (right.fraction !== left.fraction) {
      return right.fraction - left.fraction;
    }
    return left.index - right.index;
  });
  for (const entry of fractional) {
    if (remaining <= 0) break;
    results[entry.index] = (results[entry.index] ?? 0) + 1;
    remaining -= 1;
  }
  return results;
}

export function format(minor: MinorUnits, options?: MoneyOptions): string {
  const currency = options?.currency ?? 'USD';
  const locale = options?.locale ?? 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fromMinorUnits(minor));
  const normalized = Array.from(formatted, (ch) => (ch === '\u00a0' ? ' ' : ch)).join('');
  if (minor < 0 && normalized.startsWith('-') && /^[^0-9,.\s]/.test(normalized[1] ?? '')) {
    return normalized.slice(1, 2) + '-' + normalized.slice(2);
  }
  return normalized;
}
