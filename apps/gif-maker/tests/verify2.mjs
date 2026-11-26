// Debug: dump the LZW bit stream and decode with a reference decoder.
const MIN_CODE_SIZE = 8
const LZW_EOI = 257
const LZW_MAX_CODE = 4096
function lzwEncode(data) {
  const out = []
  let cur = 0, nbits = 0, codeSize = 9, nextCode = 258
  const dict = new Int32Array(LZW_MAX_CODE * 256).fill(-1)
  const put = (v, len) => {
    cur |= (v & ((1 << len) - 1)) << nbits
    nbits += len
    if (nbits >= 8) { out.push(cur & 255); cur >>= 8; nbits -= 8 }
  }
  let k = -1
  for (let i = 0; i < data.length; i++) {
    const c = data[i]
    if (k === -1) { k = c; continue }
    const p = dict[k * 256 + c]
    if (p === -1) {
      put(k, codeSize)
      if (nextCode < LZW_MAX_CODE) {
        const v = nextCode
        dict[k * 256 + c] = v
        nextCode += 1
        if (v === (1 << codeSize) - 1 && codeSize < 12) codeSize += 1
      }
      k = c
    } else k = p
  }
  if (k !== -1) put(k, codeSize)
  put(257, codeSize)
  if (nbits > 0) out.push(cur & 255)
  return Uint8Array.from(out)
}
// data: 20 bytes alternating 1,2
const data = []
for (let i = 0; i < 20; i++) data.push(i % 2 === 0 ? 1 : 2)
const bytes = lzwEncode(new Uint8Array(data))
console.log('encoded bytes:', Array.from(bytes))
