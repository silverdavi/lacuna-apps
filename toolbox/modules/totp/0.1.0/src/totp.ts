// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/totp 0.1.0: snapshot of lacuna-components totp at 6188248 by sync-toolbox-components.py; a change gets a new version.
export interface TotpOptions {
  /** Number of digits in the code. Default 6. */
  digits?: number;
  /** Period in seconds. Default 30. */
  period?: number;
  /** Algorithm: 'SHA1' | 'SHA256' | 'SHA512'. Default 'SHA1'. */
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
}

export interface OtpauthParams {
  issuer: string;
  accountName: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
}

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';
type U64 = [number, number];

const K256 = '428a2f98,71374491,b5c0fbcf,e9b5dba5,3956c25b,59f111f1,923f82a4,ab1c5ed5,d807aa98,12835b01,243185be,550c7dc3,72be5d74,80deb1fe,9bdc06a7,c19bf174,e49b69c1,efbe4786,0fc19dc6,240ca1cc,2de92c6f,4a7484aa,5cb0a9dc,76f988da,983e5152,a831c66d,b00327c8,bf597fc7,c6e00bf3,d5a79147,06ca6351,14292967,27b70a85,2e1b2138,4d2c6dfc,53380d13,650a7354,766a0abb,81c2c92e,92722c85,a2bfe8a1,a81a664b,c24b8b70,c76c51a3,d192e819,d6990624,f40e3585,106aa070,19a4c116,1e376c08,2748774c,34b0bcb5,391c0cb3,4ed8aa4a,5b9cca4f,682e6ff3,748f82ee,78a5636f,84c87814,8cc70208,90befffa,a4506ceb,bef9a3f7,c67178f2'
  .split(',')
  .map((s) => Number(`0x${s}`));

const K512: U64[] = [
  ['428a2f98', 'd728ae22'], ['71374491', '23ef65cd'], ['b5c0fbcf', 'ec4d3b2f'], ['e9b5dba5', '8189dbbc'],
  ['3956c25b', 'f348b538'], ['59f111f1', 'b605d019'], ['923f82a4', 'af194f9b'], ['ab1c5ed5', 'da6d8118'],
  ['d807aa98', 'a3030242'], ['12835b01', '45706fbe'], ['243185be', '4ee4b28c'], ['550c7dc3', 'd5ffb4e2'],
  ['72be5d74', 'f27b896f'], ['80deb1fe', '3b1696b1'], ['9bdc06a7', '25c71235'], ['c19bf174', 'cf692694'],
  ['e49b69c1', '9ef14ad2'], ['efbe4786', '384f25e3'], ['0fc19dc6', '8b8cd5b5'], ['240ca1cc', '77ac9c65'],
  ['2de92c6f', '592b0275'], ['4a7484aa', '6ea6e483'], ['5cb0a9dc', 'bd41fbd4'], ['76f988da', '831153b5'],
  ['983e5152', 'ee66dfab'], ['a831c66d', '2db43210'], ['b00327c8', '98fb213f'], ['bf597fc7', 'beef0ee4'],
  ['c6e00bf3', '3da88fc2'], ['d5a79147', '930aa725'], ['06ca6351', 'e003826f'], ['14292967', '0a0e6e70'],
  ['27b70a85', '46d22ffc'], ['2e1b2138', '5c26c926'], ['4d2c6dfc', '5ac42aed'], ['53380d13', '9d95b3df'],
  ['650a7354', '8baf63de'], ['766a0abb', '3c77b2a8'], ['81c2c92e', '47edaee6'], ['92722c85', '1482353b'],
  ['a2bfe8a1', '4cf10364'], ['a81a664b', 'bc423001'], ['c24b8b70', 'd0f89791'], ['c76c51a3', '0654be30'],
  ['d192e819', 'd6ef5218'], ['d6990624', '5565a910'], ['f40e3585', '5771202a'], ['106aa070', '32bbd1b8'],
  ['19a4c116', 'b8d2d0c8'], ['1e376c08', '5141ab53'], ['2748774c', 'df8eeb99'], ['34b0bcb5', 'e19b48a8'],
  ['391c0cb3', 'c5c95a63'], ['4ed8aa4a', 'e3418acb'], ['5b9cca4f', '7763e373'], ['682e6ff3', 'd6b2b8a3'],
  ['748f82ee', '5defb2fc'], ['78a5636f', '43172f60'], ['84c87814', 'a1f0ab72'], ['8cc70208', '1a6439ec'],
  ['90befffa', '23631e28'], ['a4506ceb', 'de82bde9'], ['bef9a3f7', 'b2c67915'], ['c67178f2', 'e372532b'],
  ['ca273ece', 'ea26619c'], ['d186b8c7', '21c0c207'], ['eada7dd6', 'cde0eb1e'], ['f57d4f7f', 'ee6ed178'],
  ['06f067aa', '72176fba'], ['0a637dc5', 'a2c898a6'], ['113f9804', 'bef90dae'], ['1b710b35', '131c471b'],
  ['28db77f5', '23047d84'], ['32caab7b', '40c72493'], ['3c9ebe0a', '15c9bebc'], ['431d67c4', '9c100d4c'],
  ['4cc5d4be', 'cb3e42b6'], ['597f299c', 'fc657e2a'], ['5fcb6fab', '3ad6faec'], ['6c44198c', '4a475817'],
].map(([h, l]) => [Number(`0x${h}`), Number(`0x${l}`)] as U64);

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const B32_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B32_ALPHABET.length; i++) {
  const c = B32_ALPHABET[i]!;
  B32_LOOKUP[c] = i;
  B32_LOOKUP[c.toLowerCase()] = i;
}

const DIGITS_RE = /^\d+$/;
const ALGO_RE = /^(SHA1|SHA256|SHA512)$/i;

export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/[\s=-]/g, '');
  if (clean === '') return new Uint8Array(0);
  if (clean.length % 8 === 1) throw new Error('invalid base32 padding: length 1 is not a valid base32 group');
  const outLen = Math.floor((clean.length * 5) / 8);
  const bytes = new Uint8Array(outLen);
  let bits = 0;
  let value = 0;
  let out = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    const idx = B32_LOOKUP[ch];
    if (idx === undefined) throw new Error(`invalid base32 character "${ch}"`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (value >>> bits) & 0xff;
    }
  }
  return bytes;
}

function readU32BE(bytes: Uint8Array, off: number): number {
  return (((bytes[off]! & 0xff) << 24) | ((bytes[off + 1]! & 0xff) << 16) | ((bytes[off + 2]! & 0xff) << 8) | (bytes[off + 3]! & 0xff)) >>> 0;
}

function readU64BE(bytes: Uint8Array, off: number): U64 {
  return [readU32BE(bytes, off), readU32BE(bytes, off + 4)];
}

function sha1(input: Uint8Array): Uint8Array {
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const len = input.length;
  const total = ((((len + 8) + 64) >> 6) << 6);
  const buf = new Uint8Array(total);
  buf.set(input);
  buf[len] = 0x80;
  const bitLen = len * 8;
  buf[total - 4] = (bitLen >>> 24) & 0xff;
  buf[total - 3] = (bitLen >>> 16) & 0xff;
  buf[total - 2] = (bitLen >>> 8) & 0xff;
  buf[total - 1] = bitLen & 0xff;
  for (let off = 0; off < total; off += 64) {
    const w: number[] = new Array(80);
    for (let t = 0; t < 16; t++) {
      w[t] = readU32BE(buf, off + t * 4);
    }
    for (let t = 16; t < 80; t++) {
      const x = w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!;
      w[t] = ((x << 1) | (x >>> 31)) >>> 0;
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!, e = h[4]!;
    for (let t = 0; t < 80; t++) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = ((((a << 5) | (a >>> 27)) >>> 0) + f + e + k + w[t]!) | 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }
    h[0] = (h[0]! + a) | 0; h[1] = (h[1]! + b) | 0; h[2] = (h[2]! + c) | 0; h[3] = (h[3]! + d) | 0; h[4] = (h[4]! + e) | 0;
  }
  const out = new Uint8Array(20);
  for (let i = 0; i < 5; i++) {
    const v = h[i]! >>> 0;
    out[i * 4] = (v >>> 24) & 0xff;
    out[i * 4 + 1] = (v >>> 16) & 0xff;
    out[i * 4 + 2] = (v >>> 8) & 0xff;
    out[i * 4 + 3] = v & 0xff;
  }
  return out;
}

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256(input: Uint8Array): Uint8Array {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = input.length;
  const total = ((((len + 8) + 64) >> 6) << 6);
  const buf = new Uint8Array(total);
  buf.set(input);
  buf[len] = 0x80;
  const bitLen = len * 8;
  buf[total - 4] = (bitLen >>> 24) & 0xff;
  buf[total - 3] = (bitLen >>> 16) & 0xff;
  buf[total - 2] = (bitLen >>> 8) & 0xff;
  buf[total - 1] = bitLen & 0xff;
  const w: number[] = new Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = readU32BE(buf, off + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15]!;
      const s0 = (rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3)) >>> 0;
      const y = w[t - 2]!;
      const s1 = (rotr32(y, 17) ^ rotr32(y, 19) ^ (y >>> 10)) >>> 0;
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) | 0;
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!, e = h[4]!, f = h[5]!, g = h[6]!, hh = h[7]!;
    for (let t = 0; t < 64; t++) {
      const S1 = (rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25)) >>> 0;
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[t]! + w[t]!) | 0;
      const S0 = (rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22)) >>> 0;
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] = (h[0]! + a) | 0; h[1] = (h[1]! + b) | 0; h[2] = (h[2]! + c) | 0; h[3] = (h[3]! + d) | 0;
    h[4] = (h[4]! + e) | 0; h[5] = (h[5]! + f) | 0; h[6] = (h[6]! + g) | 0; h[7] = (h[7]! + hh) | 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    const v = h[i]! >>> 0;
    out[i * 4] = (v >>> 24) & 0xff;
    out[i * 4 + 1] = (v >>> 16) & 0xff;
    out[i * 4 + 2] = (v >>> 8) & 0xff;
    out[i * 4 + 3] = v & 0xff;
  }
  return out;
}

function add64(a: U64, b: U64): U64 {
  const lo = (a[1] + b[1]) >>> 0;
  const carry = lo < a[1] ? 1 : 0;
  const hi = (a[0] + b[0] + carry) >>> 0;
  return [hi, lo];
}

function rotr64(v: U64, n: number): U64 {
  if (n === 0) return [v[0], v[1]];
  const hi = v[0];
  const lo = v[1];
  if (n < 32) {
    return [((hi >>> n) | (lo << (32 - n))) >>> 0, ((lo >>> n) | (hi << (32 - n))) >>> 0];
  }
  const n2 = n - 32;
  return [((lo >>> n2) | (hi << (32 - n2))) >>> 0, ((hi >>> n2) | (lo << (32 - n2))) >>> 0];
}

function shr64(v: U64, n: number): U64 {
  if (n < 32) {
    return [(v[0] >>> n) >>> 0, ((v[1] >>> n) | (v[0] << (32 - n))) >>> 0];
  }
  if (n === 32) return [0, v[0] >>> 0];
  const n2 = n - 32;
  return [0, (v[0] >>> n2) >>> 0];
}

function sha512(input: Uint8Array): Uint8Array {
  const h: U64[] = [
    [0x6a09e667, 0xf3bcc908], [0xbb67ae85, 0x84caa73b], [0x3c6ef372, 0xfe94f82b], [0xa54ff53a, 0x5f1d36f1],
    [0x510e527f, 0xade682d1], [0x9b05688c, 0x2b3e6c1f], [0x1f83d9ab, 0xfb41bd6b], [0x5be0cd19, 0x137e2179],
  ];
  const len = input.length;
  const bitLenLo = (len * 8) >>> 0;
  const total = ((((len + 17) + 128) >> 7) << 7);
  const buf = new Uint8Array(total);
  buf.set(input);
  buf[len] = 0x80;
  buf[total - 4] = (bitLenLo >>> 24) & 0xff;
  buf[total - 3] = (bitLenLo >>> 16) & 0xff;
  buf[total - 2] = (bitLenLo >>> 8) & 0xff;
  buf[total - 1] = bitLenLo & 0xff;
  const w: U64[] = new Array(80);
  for (let off = 0; off < total; off += 128) {
    for (let t = 0; t < 16; t++) {
      w[t] = readU64BE(buf, off + t * 8);
    }
    for (let t = 16; t < 80; t++) {
      const x = w[t - 15]!;
      const s0: U64 = [(rotr64(x, 1)[0] ^ rotr64(x, 8)[0] ^ shr64(x, 7)[0]) >>> 0, (rotr64(x, 1)[1] ^ rotr64(x, 8)[1] ^ shr64(x, 7)[1]) >>> 0];
      const y = w[t - 2]!;
      const s1: U64 = [(rotr64(y, 19)[0] ^ rotr64(y, 61)[0] ^ shr64(y, 6)[0]) >>> 0, (rotr64(y, 19)[1] ^ rotr64(y, 61)[1] ^ shr64(y, 6)[1]) >>> 0];
      const sum = add64(add64(w[t - 16]!, s0), add64(w[t - 7]!, s1));
      w[t] = [sum[0] >>> 0, sum[1] >>> 0];
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!;
    let e = h[4]!, f = h[5]!, g = h[6]!, hh = h[7]!;
    for (let t = 0; t < 80; t++) {
      const S1: U64 = [(rotr64(e, 14)[0] ^ rotr64(e, 18)[0] ^ rotr64(e, 41)[0]) >>> 0, (rotr64(e, 14)[1] ^ rotr64(e, 18)[1] ^ rotr64(e, 41)[1]) >>> 0];
      const ch: U64 = [((e[0] & f[0]) ^ (~e[0] & g[0])) >>> 0, ((e[1] & f[1]) ^ (~e[1] & g[1])) >>> 0];
      const t1 = add64(add64(add64(add64(hh, S1), ch), K512[t]!), w[t]!);
      const S0: U64 = [(rotr64(a, 28)[0] ^ rotr64(a, 34)[0] ^ rotr64(a, 39)[0]) >>> 0, (rotr64(a, 28)[1] ^ rotr64(a, 34)[1] ^ rotr64(a, 39)[1]) >>> 0];
      const maj: U64 = [((a[0] & b[0]) ^ (a[0] & c[0]) ^ (b[0] & c[0])) >>> 0, ((a[1] & b[1]) ^ (a[1] & c[1]) ^ (b[1] & c[1])) >>> 0];
      const t2 = add64(S0, maj);
      hh = g;
      g = f;
      f = e;
      e = add64(d, t1);
      d = c;
      c = b;
      b = a;
      a = add64(t1, t2);
    }
    h[0] = add64(h[0]!, a); h[1] = add64(h[1]!, b); h[2] = add64(h[2]!, c); h[3] = add64(h[3]!, d);
    h[4] = add64(h[4]!, e); h[5] = add64(h[5]!, f); h[6] = add64(h[6]!, g); h[7] = add64(h[7]!, hh);
  }
  const out = new Uint8Array(64);
  for (let i = 0; i < 8; i++) {
    const v = h[i]!;
    out[i * 8] = (v[0] >>> 24) & 0xff;
    out[i * 8 + 1] = (v[0] >>> 16) & 0xff;
    out[i * 8 + 2] = (v[0] >>> 8) & 0xff;
    out[i * 8 + 3] = v[0] & 0xff;
    out[i * 8 + 4] = (v[1] >>> 24) & 0xff;
    out[i * 8 + 5] = (v[1] >>> 16) & 0xff;
    out[i * 8 + 6] = (v[1] >>> 8) & 0xff;
    out[i * 8 + 7] = v[1] & 0xff;
  }
  return out;
}

function ab(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function hmac(key: Uint8Array, message: Uint8Array, hashFn: (input: Uint8Array) => Uint8Array, blockSize: number): Uint8Array {
  const k = key.length > blockSize ? hashFn(key) : key;
  const inner = new Uint8Array(blockSize);
  const outer = new Uint8Array(blockSize);
  inner.set(k);
  for (let i = 0; i < blockSize; i++) {
    inner[i] = inner[i]! ^ 0x36;
    outer[i] = (k[i]! & 0xff) ^ 0x5c;
  }
  return hashFn(ab(outer, hashFn(ab(inner, message))));
}

function counterBytes(timestampMs: number, period: number): Uint8Array {
  const counter = Math.floor(timestampMs / 1000 / period);
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter % 0x100000000;
  const buf = new Uint8Array(8);
  for (let i = 0; i < 4; i++) {
    buf[i] = (hi >>> (24 - i * 8)) & 0xff;
    buf[4 + i] = (lo >>> (24 - i * 8)) & 0xff;
  }
  return buf;
}

function dynamicTruncation(digest: Uint8Array, digits: number): string {
  const offset = digest[digest.length - 1]! & 0x0f;
  const bin =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export function totp(secret: string, timestampMs: number, options?: TotpOptions): string {
  const digits = options?.digits ?? 6;
  const period = options?.period ?? 30;
  if (!Number.isInteger(digits) || digits < 1 || digits > 10) {
    throw new Error(`invalid digits: ${digits}`);
  }
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`invalid period: ${period}`);
  }
  if (typeof timestampMs !== 'number' || !Number.isFinite(timestampMs)) {
    throw new Error('invalid timestamp');
  }
  const algorithm = options?.algorithm ?? 'SHA1';
  const key = base32Decode(secret);
  const message = counterBytes(timestampMs, period);
  const hash = algorithm === 'SHA1' ? sha1 : algorithm === 'SHA256' ? sha256 : sha512;
  const digest = hmac(key, message, hash, algorithm === 'SHA512' ? 128 : 64);
  return dynamicTruncation(digest, digits);
}

function parsePositiveInt(raw: string, field: string): number {
  if (!DIGITS_RE.test(raw)) {
    throw new Error(`invalid ${field}: "${raw}"`);
  }
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new Error(`invalid ${field}: "${raw}"`);
  }
  return n;
}

function parseDigits(raw: string): number {
  const n = parsePositiveInt(raw, 'digits');
  if (n > 10) {
    throw new Error(`invalid digits: "${raw}"`);
  }
  return n;
}

function parseAlgorithm(raw: string): 'SHA1' | 'SHA256' | 'SHA512' {
  const m = raw.match(ALGO_RE);
  if (!m) {
    throw new Error(`invalid algorithm: "${raw}"`);
  }
  return m[0].toUpperCase() as 'SHA1' | 'SHA256' | 'SHA512';
}

export function parseOtpauth(uri: string): OtpauthParams {
  const m = uri.match(/^otpauth:\/\/totp\/(.+)$/);
  if (!m) {
    throw new Error(`invalid otpauth URI: "${uri}"`);
  }
  const rest = m[1]!;
  const qIdx = rest.indexOf('?');
  const label = decodeURIComponent(qIdx >= 0 ? rest.slice(0, qIdx) : rest);
  const query = qIdx >= 0 ? rest.slice(qIdx + 1) : '';
  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const k = decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair);
    const v = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1)) : '';
    params.set(k, v);
  }
  const secret = params.get('secret');
  if (!secret) throw new Error('otpauth URI is missing required parameter: secret');
  let issuer = params.get('issuer') ?? '';
  let accountName = label;
  const colon = label.indexOf(':');
  if (colon >= 0) {
    issuer = issuer || label.slice(0, colon);
    accountName = label.slice(colon + 1);
  }
  const d = params.get('digits');
  const p = params.get('period');
  const a = params.get('algorithm');
  if (d !== undefined && !DIGITS_RE.test(d)) throw new Error(`invalid digits: "${d}"`);
  if (p !== undefined && !DIGITS_RE.test(p)) throw new Error(`invalid period: "${p}"`);
  if (a !== undefined && !ALGO_RE.test(a)) throw new Error(`invalid algorithm: "${a}"`);
  return { issuer, accountName, secret, algorithm: a ? parseAlgorithm(a) : 'SHA1', digits: d !== undefined ? parseDigits(d) : 6, period: p !== undefined ? parsePositiveInt(p, 'period') : 30 };
}
