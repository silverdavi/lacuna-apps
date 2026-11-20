import { decodeQr } from './src/lib/qr.ts'


// Re-build the test's exact QR (same code as before but just the QR part)
const maskFns = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]
function formatBits(ecc, mask) {
  const d = ((ecc << 3) | mask) << 10
  let rem = d
  for (let i = 0; i < 10; i++)
    rem = ((rem << 1) & 0x7ffff) ^ ((rem & 0x10000) ? 0x537 : 0)
  const v = ((d << 10) | (rem & 0x3ff)) ^ 0x5412
  const out = []
  for (let k = 14; k >= 0; k--) out.push((v >>> k) & 1)
  return out
}

// Build the test QR for 'Test123'
const text = 'Test123'
const data = []
for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i))
const bits = []
const putBits = (v, n) => { for (let k = n-1; k >= 0; k--) bits.push((v>>>k)&1) }
const dataCw = 13
putBits(0b0100, 4)
putBits(data.length, 8)
for (const b of data) putBits(b, 8)
const cap = 8 * dataCw
putBits(0, Math.min(4, cap - bits.length))
while (bits.length % 8 !== 0) bits.push(0)
for (let pad = 0xec; bits.length < cap; pad = pad === 0xec ? 0x11 : 0xec) putBits(pad, 8)
const bitsToBytes = (bits) => {
  const out = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i+k] || 0)
    out.push(b)
  }
  return out
}
const gfExp = new Uint8Array(512), gfLog = new Uint8Array(256)
let x = 1
for (let i = 0; i < 255; i++) { gfExp[i] = x; gfLog[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d }
for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255]
const gmul = (a, b) => (a === 0 || b === 0) ? 0 : gfExp[gfLog[a] + gfLog[b]]
function reedSolomon(data, eccLen) {
  let gen = [1]
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) { next[j] ^= gen[j]; next[j+1] ^= gmul(gen[j], gfExp[i]) }
    gen = next
  }
  const ecc = new Array(eccLen).fill(0)
  for (const b of data) {
    const factor = b ^ ecc.shift()
    ecc.push(0)
    if (factor !== 0) for (let j = 0; j < gen.length - 1; j++) ecc[j] ^= gmul(gen[j+1], factor)
  }
  return ecc
}
const rs = bitsToBytes(bits)
const ecc = reedSolomon(rs, 6)
const payload = rs.concat(ecc)
const size = 21
const mod = new Array(size * size).fill(false)
const reserved = new Array(size * size).fill(false)
const set = (x, y, v, isRes = false) => { mod[y*size+x] = v; if (isRes) reserved[y*size+x] = true }
const isReserved = (x, y) => reserved[y*size+x]
const finder = (ox, oy) => {
  for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
    const xx = ox+c, yy = oy+r
    if (xx<0||yy<0||xx>=size||yy>=size) continue
    const dark = (r>=0&&r<=6&&(c===0||c===6))||(c>=0&&c<=6&&(r===0||r===6))||(r>=2&&r<=4&&c>=2&&c<=4)
    set(xx, yy, dark, true)
  }
}
finder(0,0); finder(size-7,0); finder(0,size-7)
for (let i = 0; i < size; i++) { set(6,i,i%2===0,true); set(i,6,i%2===0,true) }
const alignment = (cx,cy) => { for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1,true) }
alignment(size-7,size-7)
const stream = []
for (const b of payload) for (let k=7;k>=0;k--) stream.push((b>>k)&1)
let p=0, up=true
for (let col=size-1; col>0; col-=2) {
  if (col===6) col--
  for (let cnt=0;cnt<size;cnt++) {
    const row = up ? size-1-cnt : cnt
    for (let c=0;c<2;c++) { const xx=col-c; if (!isReserved(xx,row)&&p<stream.length){set(xx,row,stream[p]===1);p++} }
  }
  up=!up
}
let best=0, bestPen=Infinity
const penalty=(grid,sz)=>{let pen=0;for(let y=0;y<sz;y++){let rx=1,ry=1;for(let xx=1;xx<sz;xx++){rx=grid[y*sz+xx]===grid[y*sz+xx-1]?rx+1:1;if(rx===5)pen++;else if(rx>5)pen++;ry=grid[y*sz+xx]===grid[(y-1)*sz+xx]?ry+1:1;if(ry===5)pen++;else if(ry>5)pen++}}return pen}
for (let m=0;m<8;m++){const mfn=maskFns[m];const grid=[];for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++)grid.push(mod[y*size+xx]^(mfn(xx,y)?1:0));const pen=penalty(grid,size);if(pen<bestPen){bestPen=pen;best=m}}
const fmt = formatBits(0, best)
const f = [fmt[0],fmt[1],fmt[2],fmt[3],fmt[4],fmt[5],fmt[6],fmt[7]]
const placeFmt=(bit,x,y)=>set(x,y,bit)
placeFmt(f[0],8,0);placeFmt(f[1],8,1);placeFmt(f[2],8,2);placeFmt(f[3],8,3);placeFmt(f[4],8,4);placeFmt(f[5],8,5);placeFmt(f[6],8,7);placeFmt(f[7],8,8)
placeFmt(f[7],7,8);placeFmt(f[6],5,8);placeFmt(f[5],4,8);placeFmt(f[4],3,8);placeFmt(f[3],2,8);placeFmt(f[2],1,8);placeFmt(f[1],0,8)
placeFmt(f[0],size-8,size-1)
for (let i=0;i<7;i++) placeFmt(f[i],size-1-i,size-8)
const mfn = maskFns[best]
const finalMod = new Array(size*size)
for (let y=0;y<size;y++) for (let xx=0;xx<size;xx++) finalMod[y*size+xx] = mod[y*size+xx] ^ (mfn(xx,y) && !isReserved(xx,y) ? 1 : 0)

// Build gray
const gray = new Uint8Array(size*size)
for (let i=0;i<gray.length;i++) gray[i] = finalMod[i] ? 0 : 255

// Now manually trace the decode logic
const at = (xx,yy) => gray[yy*size+xx]
const dark = (xx,yy) => at(xx,yy) < 128

// Finder search
function looksLikeFinder(dark, xx, yy) {
  const pattern = [1,1,1,1,1,1,1, 1,0,0,0,0,0,1, 1,0,1,1,1,0,1, 1,0,1,1,1,0,1, 1,0,1,1,1,0,1, 1,0,0,0,0,0,1, 1,1,1,1,1,1,1]
  let mismatch = 0
  for (let dy=0;dy<7;dy++) for (let dx=0;dx<7;dx++)
    if (pattern[dy*7+dx] !== (dark(xx+dx,yy+dy)?1:0)) mismatch++
  return mismatch
}
const tl = {cx:3, cy:3, size:7}  // known
const tr = {cx:17, cy:3, size:7}
const bl = {cx:3, cy:17, size:7}

// Build matrix via direct sampling (since we know the exact positions)
const matrix = new Array(size*size)
for (let y=0;y<size;y++) for (let xx=0;xx<size;xx++) matrix[y*size+xx] = dark(xx,y)

// Read format info
const fmtTop = []
const topX = [8,8,8,8,8,8,8,8], topY = [0,1,2,3,4,5,7,8]
for (let i=0;i<8;i++) fmtTop.push(matrix[topY[i]*size+topX[i]]?1:0)
const fmtBot = []
const botX = [size-8,size-2,size-3,size-4,size-5,size-6,size-7,size-8]
const botY = [size-1,size-8,size-8,size-8,size-8,size-8,size-8,size-8]
for (let i=0;i<8;i++) fmtBot.push(matrix[botY[i]*size+botX[i]]?1:0)

console.log('fmtTop:', fmtTop.join(''))
console.log('fmtBot:', fmtBot.join(''))
console.log('expected fmt[0..7]:', f.join(''))

// Check: is the mask correct?
let mask = -1
for (let m=0;m<8;m++) {
  const bits = formatBits(0, m)
  let wTop=0, wBot=0
  for (let i=0;i<8;i++) { if(bits[i]!==fmtTop[i])wTop++; if(bits[i]!==fmtBot[i])wBot++ }
  if (wTop+wBot<=4) { mask=m; break }
}
console.log('detected mask:', mask, 'expected:', best)

// Unmask and read data
const isRes = (xx,yy) => {
  if (xx<=7&&yy<=7) return true
  if (xx>=size-8&&yy<=7) return true
  if (xx<=7&&yy>=size-8) return true
  if (xx===6||yy===6) return true
  if (xx===8&&yy<=8) return true
  if (yy===8&&xx<=8) return true
  if (xx===size-8&&yy===size-1) return true
  if (yy===size-8&&xx>=size-8) return true
  const ax=size-7, ay=size-7
  if (Math.abs(xx-ax)<=2&&Math.abs(yy-ay)<=2) return true
  return false
}
const dataBits = []
let up2=true
for (let col=size-1;col>0;col-=2) {
  if (col===6) col--
  for (let cnt=0;cnt<size;cnt++) {
    const row = up2?size-1-cnt:cnt
    for (let c=0;c<2;c++) {
      const xx=col-c
      if (isRes(xx,row)) continue
      const v = matrix[row*size+xx] ^ (mfn(xx,row)?1:0)
      dataBits.push(v?1:0)
    }
  }
  up2=!up2
}
console.log('data bits length:', dataBits.length, 'expected:', payload.length*8)

// Parse
let bitPos=0
const readBits=(n)=>{let v=0;for(let k=0;k<n;k++)v=(v<<1)|dataBits[bitPos++];return v}
const mode=readBits(4)
const count=readBits(8)
console.log('mode:', mode.toString(2), 'count:', count)
if (mode===0b0100) {
  const chars=[]
  for (let i=0;i<count;i++) chars.push(readBits(8))
  console.log('decoded:', String.fromCharCode(...chars))
}

// Compare with expected stream
let streamMatch = true
for (let i=0;i<stream.length;i++) {
  if (dataBits[i] !== stream[i]) { streamMatch=false; console.log(`stream mismatch at ${i}: got ${dataBits[i]} expected ${stream[i]}`); if (i>5) break }
}
console.log('stream match:', streamMatch)
