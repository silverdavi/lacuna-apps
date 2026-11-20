import fs from 'node:fs'
import { encodeQr, decodeQr } from './src/lib/qr.ts'
import { encodePng, decodePng } from './src/lib/png.ts'

// Replicate the test's qrPng exactly
async function qrPng(text) {
  const data = [];
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i));
  const bits = [];
  const putBits = (v, n) => { for (let k = n-1; k >= 0; k--) bits.push((v >>> k) & 1); };
  const dataCw = 13;
  putBits(0b0100, 4);
  putBits(data.length, 8);
  for (const b of data) putBits(b, 8);
  const cap = 8 * dataCw;
  putBits(0, Math.min(4, cap - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  for (let pad = 0xec; bits.length < cap; pad = pad === 0xec ? 0x11 : 0xec) putBits(pad, 8);
  
  // RS
  const gexp = new Array(512).fill(0);
  const glog = new Array(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i++) { gexp[i] = x; glog[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) gexp[i] = gexp[i - 255];
  const gmul = (a, b) => (a === 0 || b === 0) ? 0 : gexp[(glog[a] + glog[b]) % 255];
  
  const rsBits = bitsToBytes(bits);
  let gen = [1];
  const eccLen = 6;
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) { next[j] ^= gen[j]; next[j+1] ^= gmul(gen[j], gexp[i]); }
    gen = next;
  }
  const res = new Array(eccLen).fill(0);
  for (const b of rsBits) {
    const fb = b ^ res.shift();
    res.push(0);
    for (let j = 0; j < eccLen; j++) res[j] ^= gmul(gen[j+1], fb);
  }
  const payload = rsBits.concat(res);
  
  const size = 21;
  const mod = new Array(size*size).fill(false);
  const reserved = new Array(size*size).fill(false);
  const set = (x2, y2, v, isRes = false) => { mod[y2*size+x2] = v; if (isRes) reserved[y2*size+x2] = true; };
  const isReserved = (x2, y2) => reserved[y2*size+x2];
  
  const finder = (ox, oy) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const x2 = ox+c, y2 = oy+r;
      if (x2 < 0 || y2 < 0 || x2 >= size || y2 >= size) continue;
      const d = (r>=0&&r<=6&&(c===0||c===6)) || (c>=0&&c<=6&&(r===0||r===6)) || (r>=2&&r<=4&&c>=2&&c<=4);
      set(x2, y2, d, true);
    }
  };
  finder(0, 0); finder(size-7, 0); finder(0, size-7);
  for (let i = 0; i < size; i++) { set(6, i, i%2===0, true); set(i, 6, i%2===0, true); }
  const alignment = (cx, cy) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      set(cx+dx, cy+dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true);
  };
  alignment(size-7, size-7);
  
  const stream = [];
  for (const b of payload) for (let k = 7; k >= 0; k--) stream.push((b >> k) & 1);
  let p = 0, up = true;
  for (let col = size-1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let cnt = 0; cnt < size; cnt++) {
      const row = up ? size-1-cnt : cnt;
      for (let c = 0; c < 2; c++) {
        const x2 = col - c;
        if (!isReserved(x2, row) && p < stream.length) { set(x2, row, stream[p]===1); p++; }
      }
    }
    up = !up;
  }
  
  const maskFns = [
    (x2, y2) => (x2+y2)%2===0,
    (x2, y2) => y2%2===0,
    (x2, y2) => x2%3===0,
    (x2, y2) => (x2+y2)%3===0,
    (x2, y2) => (Math.floor(x2/3)+Math.floor(y2/2))%2===0,
    (x2, y2) => ((x2*y2)%2)+((x2*y2)%3)===0,
    (x2, y2) => (((x2*y2)%2)+((x2*y2)%3))%2===0,
    (x2, y2) => (((x2+y2)%2)+((x2*y2)%3))%2===0,
  ];
  
  const penalty = (grid, sz) => {
    let pen = 0;
    for (let y2 = 0; y2 < sz; y2++) {
      let runX = 1, runY = 1;
      for (let x2 = 1; x2 < sz; x2++) {
        runX = grid[y2*sz+x2] === grid[y2*sz+x2-1] ? runX+1 : 1;
        if (runX === 5) pen++; else if (runX > 5) pen++;
      }
      for (let x2 = 1; x2 < sz; x2++) {
        runY = grid[y2*sz+x2] === grid[(y2-1)*sz+x2] ? runY+1 : 1;
        if (runY === 5) pen++; else if (runY > 5) pen++;
      }
    }
    for (let y2 = 0; y2 < sz-1; y2++) for (let x2 = 0; x2 < sz-1; x2++) {
      const c = grid[y2*sz+x2];
      if (c === grid[y2*sz+x2+1] && c === grid[(y2+1)*sz+x2] && c === grid[(y2+1)*sz+x2+1]) pen += 3;
    }
    const pA = [true,false,true,true,true,false,true,false,false,false,false];
    const pB = [...pA].reverse();
    for (let y2 = 0; y2 < sz; y2++) for (let x2 = 0; x2 < sz-10; x2++) {
      let a = true, b = true;
      for (let k = 0; k < 11; k++) {
        const v = grid[y2*sz+x2+k];
        if (v !== pA[k]) a = false;
        if (v !== pB[k]) b = false;
      }
      if (a) pen += 40; if (b) pen += 40;
    }
    for (let x2 = 0; x2 < sz; x2++) for (let y2 = 0; y2 < sz-10; y2++) {
      let a = true, b = true;
      for (let k = 0; k < 11; k++) {
        const v = grid[(y2+k)*sz+x2];
        if (v !== pA[k]) a = false;
        if (v !== pB[k]) b = false;
      }
      if (a) pen += 40; if (b) pen += 40;
    }
    let dark = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i]) dark++;
    const pct = (dark * 100) / grid.length;
    const lower = Math.floor(pct / 10) * 10;
    const upper = lower + 10;
    pen += (Math.min(Math.abs(pct - lower), Math.abs(upper - pct)) / 10) * 10;
    return pen;
  };
  
  let best = 0, bestPen = Infinity;
  for (let m = 0; m < 8; m++) {
    const mfn = maskFns[m];
    const grid = [];
    for (let y2 = 0; y2 < size; y2++) for (let x2 = 0; x2 < size; x2++)
      grid.push(mod[y2*size+x2] ^ (mfn(x2,y2) ? 1 : 0));
    const pen = penalty(grid, size);
    if (pen < bestPen) { bestPen = pen; best = m; }
  }
  
  const fmt = formatBits(0, best);
  const placeFmt = (bit, x2, y2) => set(x2, y2, bit);
  const f = [fmt[0],fmt[1],fmt[2],fmt[3],fmt[4],fmt[5],fmt[6],fmt[7]];
  placeFmt(f[0], 8, 0); placeFmt(f[1], 8, 1); placeFmt(f[2], 8, 2);
  placeFmt(f[3], 8, 3); placeFmt(f[4], 8, 4); placeFmt(f[5], 8, 5);
  placeFmt(f[6], 8, 7); placeFmt(f[7], 8, 8);
  placeFmt(f[7], 7, 8); placeFmt(f[6], 5, 8); placeFmt(f[5], 4, 8);
  placeFmt(f[4], 3, 8); placeFmt(f[3], 2, 8); placeFmt(f[2], 1, 8);
  placeFmt(f[1], 0, 8);
  placeFmt(f[0], size-8, size-1);
  for (let i = 0; i < 7; i++) placeFmt(f[i], size-1-i, size-8);
  
  const mfn = maskFns[best];
  const raw = [];
  for (let y2 = 0; y2 < size; y2++) {
    raw.push(0);
    for (let x2 = 0; x2 < size; x2++) {
      const v = mod[y2*size+x2] ^ (mfn(x2,y2) && !isReserved(x2,y2) ? 1 : 0);
      raw.push(v ? 0 : 255);
    }
  }
  
  // Return as gray array
  const gray = new Uint8Array(size * size);
  for (let y2 = 0; y2 < size; y2++)
    for (let x2 = 0; x2 < size; x2++)
      gray[y2 * size + x2] = raw[1 + y2 * size + x2];
  
  return { gray, size, bestMask: best, mod, reserved };
}

function formatBits(ecc, mask) {
  const d = ((ecc << 3) | mask) << 10;
  let rem = d;
  for (let i = 0; i < 10; i++) rem = ((rem << 1) & 0x7ffff) ^ ((rem & 0x10000) ? 0x537 : 0);
  const v = ((d << 10) | (rem & 0x3ff)) ^ 0x5412;
  const out = [];
  for (let k = 14; k >= 0; k--) out.push((v >>> k) & 1);
  return out;
}

function bitsToBytes(bits) {
  const out = [];
  for (let i = 0; i + 7 < bits.length + 1; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i+k] ?? 0);
    out.push(b);
  }
  return out;
}

// Generate test QR
const testQr = await qrPng('Test123');
console.log('test qrPng mask:', testQr.bestMask);

// Generate app QR
const appM = encodeQr('Test123');
const appPng = encodePng(appM.size, appM.dark);
const appD = decodePng(appPng);
const appGray = new Uint8Array(appD.width * appD.height);
for (let i = 0; i < appGray.length; i++) appGray[i] = appD.gray[i];

// Compare
let diffs = 0;
for (let i = 0; i < testQr.gray.length; i++)
  if (testQr.gray[i] !== appGray[i]) { diffs++; if (diffs < 20) console.log(`diff at px ${i}: test=${testQr.gray[i]} app=${appGray[i]}`); }
console.log('total pixel diffs:', diffs);

// Print both grids
const sz = 21;
console.log('\nTEST grid:');
for (let y = 0; y < sz; y++)
  console.log(y, Array.from({length:sz},(_,x)=>testQr.gray[y*sz+x]<128?'#':'.').join(''));
console.log('\nAPP grid:');
for (let y = 0; y < sz; y++)
  console.log(y, Array.from({length:sz},(_,x)=>appGray[y*sz+x]<128?'#':'.').join(''));
// Check app encoder's format info
const size = 21;
const appDark = (x, y) => appGray[y * size + x] < 128;
const topXY = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
console.log('app fmtTop:', topXY.map(([x,y]) => appDark(x,y)?1:0).join(''));

// Decode both
console.log('decode test qr:', decodeQr(testQr.gray, size, size));
console.log('decode app qr:', decodeQr(appGray, size, size));
