// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/color-math 0.1.0: snapshot of lacuna-components colorMath at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export interface RGB { r: number; g: number; b: number; }
export interface HSL { h: number; s: number; l: number; }
export interface OKLCH { l: number; c: number; h: number; }

const clamp255 = (v: number): number => Math.min(255, Math.max(0, Math.round(v)));

export function hexToRgb(hex: string): RGB {
  const h = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(h) && !/^[0-9a-fA-F]{3}$/.test(h)) {
    throw new Error(`invalid hex color: ${hex}`);
  }
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  const to2 = (v: number): string => clamp255(v).toString(16).padStart(2, '0');
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`;
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6; break;
  }
  return { h, s, l };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h;
  const s = hsl.s;
  const l = hsl.l;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clamp255(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clamp255(hue2rgb(p, q, h) * 255),
    b: clamp255(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function rgbToOklch(rgb: RGB): OKLCH {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(a * a + bb * bb);
  let hh = Math.atan2(bb, a) * (180 / Math.PI);
  if (hh < 0) hh += 360;
  return { l: L, c, h: hh };
}

export function oklchToRgb(oklch: OKLCH): RGB {
  const { l, c, h } = oklch;
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const gam = (v: number): number => {
    const cl = Math.min(1, Math.max(0, v));
    return cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
  };
  return {
    r: clamp255(gam(lr) * 255),
    g: clamp255(gam(lg) * 255),
    b: clamp255(gam(lb) * 255),
  };
}

export function relativeLuminance(rgb: RGB): number {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function contrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(fg: RGB, bg: RGB, largeText = false): boolean {
  return contrastRatio(fg, bg) >= (largeText ? 3 : 4.5);
}

export function generatePalette(base: RGB, count: number, type: 'analogous' | 'complementary' | 'triadic'): RGB[] {
  if (count <= 0) return [];
  const hsl = rgbToHsl(base);
  const out: RGB[] = [];
  for (let i = 0; i < count; i++) {
    let h: number;
    if (type === 'analogous') {
      const spread = 30;
      h = (hsl.h * 360 + (i - (count - 1) / 2) * spread + 360 * (count + 1)) % 360 / 360;
    } else if (type === 'complementary') {
      h = count === 1 ? hsl.h : (i % 2 === 0 ? hsl.h : (hsl.h + 0.5) % 1);
    } else {
      h = (hsl.h + (i % 3) / 3) % 1;
    }
    out.push(hslToRgb({ h, s: hsl.s, l: hsl.l }));
  }
  return out;
}

export function generateGradient(stops: RGB[], steps: number): RGB[] {
  if (stops.length === 0) return [];
  if (steps <= 1) return stops.map((s) => ({ r: s.r, g: s.g, b: s.b }));
  if (stops.length === 1) {
    return Array.from({ length: steps }, () => ({ r: stops[0]!.r, g: stops[0]!.g, b: stops[0]!.b }));
  }
  const out: RGB[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1) * (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(t));
    const f = t - idx;
    const a = stops[idx]!;
    const b = stops[idx + 1]!;
    out.push({
      r: clamp255(a.r + (b.r - a.r) * f),
      g: clamp255(a.g + (b.g - a.g) * f),
      b: clamp255(a.b + (b.b - a.b) * f),
    });
  }
  return out;
}
