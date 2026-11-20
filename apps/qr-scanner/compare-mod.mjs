// Extract the mod array from BOTH the test's qrPng and the app's encodeQr
// for 'Test123' and compare them cell by cell.

import fs from 'node:fs'

// ===== TEST ENCODER (from acceptance.spec.ts) =====
function testEncode(text) {
  const data = []
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i))
  const bits = []
  const putBits = (v, n) => { for (let k = n - 1; k >= 0; k--) bits.push((v >>> k) & 1) }
  const dataCw = 13
  putBits(0b0100, 4)
  putBits(data.length, 8)
  for (const b of data) putBits(b, 8)
  const cap = 8 * dataCw
  putBits(0, Math.min(4, cap - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  for (let pad = 0xec; bits.length < cap; pad = pad === 0xec ? 0x11 : 0xec) putBits(pad, 8)
  const rs = bitsToBytes(bits)
  const ecc = reedSolomon(rs, 6)
  const payload = rs.concat(ecc)
  const size = 21
  const mod = new Array(size * size).fill(false)
  const reserved = new Array(size * size).fill(false)
  const set = (x, y, v, isRes = false) => { mod[y * size + x] = v; if (isRes) reserved[y * size + x] = true }
  const isReserved = (x, y) => reserved[y * size + x]
  const finder = (ox, oy) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const x = ox + c, y = oy + r
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      const dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      set(x, y, dark, true)
    }
  }
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7)
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0, true); set(i, 6, i % 2 === 0, true) }
  const alignment = (cx, cy) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true)
  }
  alignment(size - 7, size - 7)
  const stream = []
  for (const b of payload) for (let k = 7; k >= 0; k--) stream.push((b >> k) & 1)
  let p = 0, up = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let cnt = 0; cnt < size; cnt++) {
      const row = up ? size - 1 - cnt : cnt
      for (let c = 0; c < 2; c++) {
        const x = col - c
        if (!isReserved(x, row) && p < stream.length) { set(x, row, stream[p] === 1); p++ }
      }
    }
    up = !up
  }
  // Return mod BEFORE format info and masking
  return { mod, reserved, size, payload, stream }
}

// ===== APP ENCODER (from src/lib/qr.ts) =====
function appEncode(text) {
  const data = []
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i) & 0xff)
  const L_DATA = [13, 34, 55, 80, 108, 136, 156, 194, 232, 274]
  const L_TOTAL = [19, 44, 70, 100, 134, 172, 196, 242, 292, 346]
  let version = 0
  for (let v = 1; v <= L_DATA.length; v++) {
    const bitsNeeded = 4 + 8 + 8 * data.length
    if (bitsNeeded <= 8 * L_DATA[v - 1]) { version = v; break }
  }
  const cap = L_DATA[version - 1]
  const bits = []
  const putBits = (v, n) => { for (let k = n - 1; k >= 0; k--) bits.push((v >>> k) & 1) }
  putBits(0b0100, 4)
  putBits(data.length, 8)
  for (const b of data) putBits(b, 8)
  const capBits = 8 * cap
  putBits(0, Math.min(4, capBits - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  for (let pad = 0xec; bits.length < capBits; pad = pad === 0xec ? 0x11 : 0xec) putBits(pad, 8)
  const dataCw = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]
    dataCw.push(b)
  }
  const ecc = reedSolomon(dataCw, L_TOTAL[version - 1] - cap)
  const payload = dataCw.concat(ecc)
  const size = 17 + version * 4
  const mod = new Array(size * size).fill(false)
  const reserved = new Array(size * size).fill(false)
  const set = (x, y, v, isRes = false) => { mod[y * size + x] = v; if (isRes) reserved[y * size + x] = true }
  const isReserved = (x, y) => reserved[y * size + x]
  const finder = (ox, oy) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const x = ox + c, y = oy + r
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      if (r < 0 || r > 6 || c < 0 || c > 6) { set(x, y, false, true); continue }
      const dark = (r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      set(x, y, dark, true)
    }
  }
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7)
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0, true); set(i, 6, i % 2 === 0, true) }
  const alignment = (cx, cy) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true)
  }
  alignment(size - 7, size - 7)
  const stream = []
  for (const b of payload) for (let k = 7; k >= 0; k--) stream.push((b >> k) & 1)
  let p = 0, up = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let cnt = 0; cnt < size; cnt++) {
      const row = up ? size - 1 - cnt : cnt
      for (let c = 0; c < 2; c++) {
        const x = col - c
        if (!isReserved(x, row) && p < stream.length) { set(x, row, stream[p] === 1); p++ }
      }
    }
    up = !up
  }
  return { mod, reserved, size, payload, stream, version, dataCw }
}

// ===== Shared helpers =====
function bitsToBytes(bits) {
  const out = []
  for (let i = 0; i + 7 < bits.length + 1; i += 8) {
    let b = 0
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i + k] ?? 0)
    out.push(b)
  }
  return out
}
const gexp = new Array(512).fill(0)
const glog = new Array(256).fill(0)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    gexp[i] = x; glog[x] = i; x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) gexp[i] = gexp[i - 255]
}
function gmul(a, b) {
  if (a === 0 || b === 0) return 0
  return gexp[(glog[a] + glog[b]) % 255]
}
function reedSolomon(data, eccLen) {
  let gen = [1]
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j]
      next[j + 1] ^= gmul(gen[j], gexp[i])
    }
    gen = next
  }
  const res = new Array(eccLen).fill(0)
  for (const b of data) {
    const fb = b ^ res.shift()
    res.push(0)
    for (let j = 0; j < eccLen; j++) res[j] ^= gmul(gen[j + 1], fb)
  }
  return res
}

// ===== Compare =====
const text = 'Test123'
const t = testEncode(text)
const a = appEncode(text)

console.log('Test payload:', t.payload.map(b => b.toString(16).padStart(2, '0')).join(' '))
console.log('App  payload:', a.payload.map(b => b.toString(16).padStart(2, '0')).join(' '))
console.log('Payload match:', JSON.stringify(t.payload) === JSON.stringify(a.payload))
console.log('Stream match:', JSON.stringify(t.stream) === JSON.stringify(a.stream))
console.log('Version:', a.version, 'Size:', a.size)

// Compare reserved
let resDiff = 0
for (let i = 0; i < t.reserved.length; i++) {
  if (t.reserved[i] !== a.reserved[i]) {
    resDiff++
    const x = i % 21, y = Math.floor(i / 21)
    if (resDiff <= 10) console.log(`  Reserved diff at (${x},${y}): test=${t.reserved[i]} app=${a.reserved[i]}`)
  }
}
console.log('Reserved diffs:', resDiff)

// Compare mod (before format info + masking)
let modDiff = 0
const diffs = []
for (let i = 0; i < t.mod.length; i++) {
  if (t.mod[i] !== a.mod[i]) {
    modDiff++
    if (modDiff <= 20) {
      const x = i % 21, y = Math.floor(i / 21)
      const isRes = t.reserved[i]
      diffs.push({ x, y, test: t.mod[i], app: a.mod[i], reserved: isRes })
    }
  }
}
console.log('Mod diffs (before fmt+mask):', modDiff)
for (const d of diffs) {
  console.log(`  (${d.x},${d.y}) test=${d.test ? '#' : '.'} app=${d.app ? '#' : '.'} ${d.reserved ? '[RESERVED]' : '[data]'}`)
}
