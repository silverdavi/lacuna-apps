// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/quantity-parse 0.1.0: snapshot of lacuna-components quantityParse at d422a73 by sync-toolbox-components.py; a change gets a new version.
export interface ParsedQuantity {
  /** The numeric value as a floating-point number. */
  value: number;
  /** The unit string (lowercased, trimmed), or empty string if no unit. */
  unit: string;
  /** The original input string. */
  raw: string;
}

const NUMBER = String.raw`\d+(?:\.\d+)?`;
const FRACTION = String.raw`(\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)`;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function parseQuantity(input: string): ParsedQuantity {
  const raw = input;
  const trimmed = input.trim();
  if (trimmed === '') {
    throw new SyntaxError(`Cannot parse quantity: "${input}"`);
  }

  const unitMatch = trimmed.match(/\s+([a-zA-Z][a-zA-Z0-9°]*)$/);
  let unit = '';
  let quantityPart = trimmed;
  if (unitMatch && unitMatch[1] !== undefined && unitMatch.index !== undefined) {
    unit = unitMatch[1].toLowerCase();
    quantityPart = trimmed.slice(0, unitMatch.index).trim();
  }

  const parts = quantityPart.split(/\s+/);
  const fracRegex = new RegExp(`^${FRACTION}$`);
  const numberRegex = new RegExp(`^${NUMBER}$`);

  let value: number | undefined;
  if (parts.length === 1) {
    const tok = parts[0];
    if (tok !== undefined) {
      const frac = tok.match(fracRegex);
      if (frac) {
        const num = frac[1];
        const den = frac[2];
        if (num !== undefined && den !== undefined && Number(den) !== 0) {
          value = Number(num) / Number(den);
        }
      } else if (numberRegex.test(tok)) {
        value = Number(tok);
      }
    }
  } else if (parts.length === 2) {
    const whole = parts[0];
    const fracTok = parts[1];
    if (whole !== undefined && fracTok !== undefined) {
      const frac = fracTok.match(fracRegex);
      if (frac && numberRegex.test(whole)) {
        const num = frac[1];
        const den = frac[2];
        if (num !== undefined && den !== undefined && Number(den) !== 0) {
          value = Number(whole) + Number(num) / Number(den);
        }
      }
    }
  }

  if (value === undefined || !Number.isFinite(value)) {
    throw new SyntaxError(`Cannot parse quantity: "${input}"`);
  }

  return { value, unit, raw };
}

export function scaleQuantity(qty: ParsedQuantity, factor: number): ParsedQuantity {
  if (!Number.isFinite(factor) || factor === 0) {
    throw new RangeError(`Scale factor must be finite and non-zero: ${factor}`);
  }
  return { value: qty.value * factor, unit: qty.unit, raw: qty.raw };
}

export function addQuantities(a: ParsedQuantity, b: ParsedQuantity): ParsedQuantity {
  if (a.unit.toLowerCase() !== b.unit.toLowerCase()) {
    throw new TypeError(`Units do not match: "${a.unit}" vs "${b.unit}"`);
  }
  const unit = a.unit || b.unit;
  return { value: a.value + b.value, unit, raw: '' };
}

export function toFractionString(value: number, maxDenominator = 16): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Value must be a finite number: ${value}`);
  }
  if (maxDenominator < 1) {
    throw new RangeError(`maxDenominator must be at least 1: ${maxDenominator}`);
  }

  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const frac = abs - whole;

  let bestNum = 0;
  let bestDen = 1;
  let bestDiff = Infinity;
  for (let d = 1; d <= maxDenominator; d += 1) {
    const rounded = Math.round(frac * d);
    const diff = Math.abs(frac - rounded / d);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestNum = rounded;
      bestDen = d;
    }
  }

  if (bestNum === 0) {
    return (negative ? '-' : '') + String(whole);
  }

  const g = gcd(bestNum, bestDen);
  const num = bestNum / g;
  const den = bestDen / g;
  const core = whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
  return negative ? `-${core}` : core;
}

export function isValidQuantity(input: string): boolean {
  try {
    parseQuantity(input);
    return true;
  } catch {
    return false;
  }
}
