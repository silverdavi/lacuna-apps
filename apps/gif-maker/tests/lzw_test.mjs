// Test LZW encoder with a simple pattern and decode with Python's built-in.
const LZW_MAX_CODE = 4096
function lzwEncode(data) {
  const out = []
  let cur = 0, nbits = 0, codeSize = 9, nextCode = 258
  const dict = new Int32Array(LZW_MAX_CODE * 256).fill(-1)
  const put = (v, len) => {
    cur |= (v & ((1 << len) - 1)) << nbits
    nbits += len
    if (nbits >= 8) { out.push(cur & 0xff); cur >>= 8; nbits -= 8 }
  }
  let k = -1
  for (let i = 0; i < data.length; i++) {
    const c = data[i]
    if (k === -1) { k = c; continue }
    const key = k * 256 + c
    const p = key < dict.length ? dict[key] : -1
    if (p === -1) {
      put(k, codeSize)
      if (nextCode < LZW_MAX_CODE) {
        const v = nextCode
        dict[key] = v
        nextCode += 1
        if (v === (1 << codeSize) - 1 && codeSize < 12) codeSize += 1
      }
      k = c
    } else k = p
  }
  if (k !== -1) put(k, codeSize)
  put(257, codeSize)
  if (nbits > 0) out.push(cur & 0xff)
  return Uint8Array.from(out)
}

// Test 1: simple "ABABABAB..." pattern
const data1 = []
for (let i = 0; i < 20; i++) data1.push(i % 2 === 0 ? 65 : 66) // "ABABAB..."
const enc1 = lzwEncode(new Uint8Array(data1))
console.log('Test1 (ABABAB x20):', Array.from(enc1))

// Test 2: all same byte
const data2 = new Array(30).fill(42)
const enc2 = lzwEncode(new Uint8Array(data2))
console.log('Test2 (42 x30):', Array.from(enc2))

// Test 3: sequential 0..25, 25..50
const data3 = []
for (let i = 0; i < 50; i++) data3.push(i % 25)
const enc3 = lzwEncode(new Uint8Array(data3))
console.log('Test3 (0..24, 0..24):', Array.from(enc3))
