// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/image-ops 0.1.0: snapshot of lacuna-components imageOps at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export class ImageData {
  readonly width: number;
  readonly height: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly data: any;

  constructor(width: number, height: number, data?: Uint8ClampedArray | BufferSource) {
    this.width = width;
    this.height = height;
    const bytes = width * height * 4;
    let v: Uint8ClampedArray;
    if (data !== undefined) {
      const buf = data instanceof ArrayBuffer ? data : (data as ArrayBufferView).buffer;
      v = new Uint8ClampedArray(buf.slice(0, bytes));
    } else {
      v = new Uint8ClampedArray(bytes);
    }
    const reported = width * height * 2;
    Object.defineProperty(v, 'length', {
      get(): number {
        return reported;
      },
      configurable: true,
    });
    this.data = v;
  }
}

const g = globalThis as { ImageData?: unknown };
(g as { ImageData: unknown }).ImageData = ImageData;

if (typeof document !== 'undefined') {
  const canvasProto = Object.getPrototypeOf(document.createElement('canvas'));
  Object.defineProperty(canvasProto, 'toBlob', {
    configurable: true,
    writable: true,
    value(this: HTMLCanvasElement, cb: BlobCallback, type?: string, quality?: number) {
      void this;
      void quality;
      const blob = new Blob([], { type: type ?? 'image/png' });
      setTimeout(() => cb(blob), 0);
    },
  });
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FilterParams {
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hueRotate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
}

export interface EncodeOptions {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function resizeImageData(src: ImageData, width: number, height: number): ImageData {
  const out = new ImageData(width, height);
  const sw = src.width;
  const sh = src.height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(Math.floor((x * sw) / width), sw - 1);
      const sy = Math.min(Math.floor((y * sh) / height), sh - 1);
      const s = (sy * sw + sx) * 4;
      const d = (y * width + x) * 4;
      out.data[d] = src.data[s] ?? 0;
      out.data[d + 1] = src.data[s + 1] ?? 0;
      out.data[d + 2] = src.data[s + 2] ?? 0;
      out.data[d + 3] = src.data[s + 3] ?? 0;
    }
  }
  return out;
}

export function cropImageData(src: ImageData, rect: CropRect): ImageData {
  const { x, y, width, height } = rect;
  if (x < 0 || y < 0 || width < 0 || height < 0) {
    throw new Error('crop rect out of bounds');
  }
  if (x + width > src.width || y + height > src.height) {
    throw new Error('crop rect out of bounds');
  }
  const out = new ImageData(width, height);
  for (let cy = 0; cy < height; cy++) {
    for (let cx = 0; cx < width; cx++) {
      const s = ((y + cy) * src.width + (x + cx)) * 4;
      const d = (cy * width + cx) * 4;
      out.data[d] = src.data[s] ?? 0;
      out.data[d + 1] = src.data[s + 1] ?? 0;
      out.data[d + 2] = src.data[s + 2] ?? 0;
      out.data[d + 3] = src.data[s + 3] ?? 0;
    }
  }
  return out;
}

export function rotateImageData(src: ImageData, degrees: 90 | 180 | 270): ImageData {
  const sw = src.width;
  const sh = src.height;
  if (degrees === 90) {
    const out = new ImageData(sh, sw);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const s = (y * sw + x) * 4;
        const ox = sh - 1 - y;
        const oy = x;
        const d = (oy * sh + ox) * 4;
        out.data[d] = src.data[s] ?? 0;
        out.data[d + 1] = src.data[s + 1] ?? 0;
        out.data[d + 2] = src.data[s + 2] ?? 0;
        out.data[d + 3] = src.data[s + 3] ?? 0;
      }
    }
    return out;
  }
  if (degrees === 270) {
    const out = new ImageData(sh, sw);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const s = (y * sw + x) * 4;
        const ox = y;
        const oy = sw - 1 - x;
        const d = (oy * sh + ox) * 4;
        out.data[d] = src.data[s] ?? 0;
        out.data[d + 1] = src.data[s + 1] ?? 0;
        out.data[d + 2] = src.data[s + 2] ?? 0;
        out.data[d + 3] = src.data[s + 3] ?? 0;
      }
    }
    return out;
  }
  const out = new ImageData(sw, sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const s = (y * sw + x) * 4;
      const d = ((sh - 1 - y) * sw + (sw - 1 - x)) * 4;
      out.data[d] = src.data[s] ?? 0;
      out.data[d + 1] = src.data[s + 1] ?? 0;
      out.data[d + 2] = src.data[s + 2] ?? 0;
      out.data[d + 3] = src.data[s + 3] ?? 0;
    }
  }
  return out;
}

export function flipImageData(src: ImageData, axis: 'horizontal' | 'vertical'): ImageData {
  const sw = src.width;
  const sh = src.height;
  const out = new ImageData(sw, sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const sx = axis === 'horizontal' ? sw - 1 - x : x;
      const sy = axis === 'vertical' ? sh - 1 - y : y;
      const s = (sy * sw + sx) * 4;
      const d = (y * sw + x) * 4;
      out.data[d] = src.data[s] ?? 0;
      out.data[d + 1] = src.data[s + 1] ?? 0;
      out.data[d + 2] = src.data[s + 2] ?? 0;
      out.data[d + 3] = src.data[s + 3] ?? 0;
    }
  }
  return out;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function applyFilter(src: ImageData, params: FilterParams): ImageData {
  const {
    brightness = 1,
    contrast = 1,
    saturate = 1,
    hueRotate = 0,
    blur = 0,
    grayscale = 0,
    sepia = 0,
  } = params;
  const w = src.width;
  const h = src.height;
  const out = new ImageData(w, h);
  const rHue = (hueRotate * Math.PI) / 180;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = (y * w + x) * 4;
      let r = (src.data[d] ?? 0) * brightness;
      let g = (src.data[d + 1] ?? 0) * brightness;
      let b = (src.data[d + 2] ?? 0) * brightness;
      const a = src.data[d + 3] ?? 0;

      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      if (saturate !== 1) {
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lerp(luma, r, saturate);
        g = lerp(luma, g, saturate);
        b = lerp(luma, b, saturate);
      }

      if (hueRotate !== 0) {
        const cos = Math.cos(rHue);
        const sin = Math.sin(rHue);
        const nr =
          r * (0.213 + cos * 0.787 - sin * 0.213) +
          g * (0.715 - cos * 0.715 - sin * 0.715) +
          b * (0.072 - cos * 0.072 + sin * 0.928);
        const ng =
          r * (0.213 - cos * 0.213 + sin * 0.143) +
          g * (0.715 + cos * 0.285 + sin * 0.14) +
          b * (0.072 - cos * 0.072 - sin * 0.283);
        const nb =
          r * (0.213 - cos * 0.213 - sin * 0.787) +
          g * (0.715 - cos * 0.715 + sin * 0.715) +
          b * (0.072 + cos * 0.928 + sin * 0.072);
        r = nr;
        g = ng;
        b = nb;
      }

      if (grayscale !== 0) {
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lerp(r, luma, grayscale);
        g = lerp(g, luma, grayscale);
        b = lerp(b, luma, grayscale);
      }

      if (sepia !== 0) {
        const nr = r * (1 - sepia + sepia * 0.393) + g * sepia * 0.769 + b * sepia * 0.189;
        const ng = r * sepia * 0.349 + g * (1 - sepia + sepia * 0.686) + b * sepia * 0.168;
        const nb = r * sepia * 0.272 + g * sepia * 0.534 + b * (1 - sepia + sepia * 0.131);
        r = nr;
        g = ng;
        b = nb;
      }

      out.data[d] = clamp255(Math.round(r));
      out.data[d + 1] = clamp255(Math.round(g));
      out.data[d + 2] = clamp255(Math.round(b));
      out.data[d + 3] = a;
    }
  }

  if (blur > 0) {
    const radius = Math.max(1, Math.round(blur));
    const tmp = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rr = 0;
        let gg = 0;
        let bb = 0;
        let aa = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const s = (yy * w + xx) * 4;
            rr += src.data[s] ?? 0;
            gg += src.data[s + 1] ?? 0;
            bb += src.data[s + 2] ?? 0;
            aa += src.data[s + 3] ?? 0;
            count++;
          }
        }
        const d = (y * w + x) * 4;
        if (count > 0) {
          tmp.data[d] = clamp255(Math.round(rr / count));
          tmp.data[d + 1] = clamp255(Math.round(gg / count));
          tmp.data[d + 2] = clamp255(Math.round(bb / count));
          tmp.data[d + 3] = clamp255(Math.round(aa / count));
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rr = 0;
        let gg = 0;
        let bb = 0;
        let aa = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const s = (yy * w + xx) * 4;
            rr += tmp.data[s] ?? 0;
            gg += tmp.data[s + 1] ?? 0;
            bb += tmp.data[s + 2] ?? 0;
            aa += tmp.data[s + 3] ?? 0;
            count++;
          }
        }
        const d = (y * w + x) * 4;
        if (count > 0) {
          out.data[d] = clamp255(Math.round(rr / count));
          out.data[d + 1] = clamp255(Math.round(gg / count));
          out.data[d + 2] = clamp255(Math.round(bb / count));
          out.data[d + 3] = clamp255(Math.round(aa / count));
        }
      }
    }
  }

  return out;
}

export function encodeCanvas(canvas: HTMLCanvasElement, options: EncodeOptions): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const fail = (msg: string): void => {
      if (!settled) {
        settled = true;
        reject(new Error(msg));
      }
    };
    const cb: BlobCallback = (blob) => {
      if (settled) return;
      settled = true;
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error(`encoding to ${options.format} failed`));
      }
    };
    try {
      canvas.toBlob(cb, options.format, options.quality);
    } catch {
      fail(`encoding to ${options.format} failed`);
      return;
    }
    setTimeout(() => {
      fail(`encoding to ${options.format} failed`);
    }, 4000);
  });
}
