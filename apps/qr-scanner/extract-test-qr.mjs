import fs from 'node:fs'
// Extract lines 106-430 from the spec (the qrPng function and all helpers)
const spec = fs.readFileSync('tests/acceptance.spec.ts', 'utf-8')
const lines = spec.split('\n')
// Lines 106-430 (1-indexed) = indices 105-429
const extracted = lines.slice(105, 430).join('\n')

// Remove TypeScript type annotations
let code = extracted
  // Remove ': Promise<Buffer>'
  .replace('): Promise<Buffer> {', ') {')
  // Remove union types FIRST (before individual types)
  .replace(/: number\[\] \| null/g, '')
  .replace(/: \w+(\[\])? \| null/g, '')
  // Remove ': number[]' annotations
  .replace(/: number\[\]/g, '')
  // Remove ': boolean[]'
  .replace(/: boolean\[\]/g, '')
  // Remove ': number'
  .replace(/: number/g, '')
  // Remove ': boolean'
  .replace(/: boolean/g, '')
  // Remove ': string'
  .replace(/: string/g, '')
  // Remove 'as number'
  .replace(/ as number/g, '')
  // Remove type imports
  .replace(/import.*from.*\n/g, '')

// Add the PNG decode at the end
code += `
const buf = await qrPng('Test123')
// Parse the PNG to get the raw pixel data
// We need to inflate the IDAT chunk
import zlib from 'node:zlib'
// Find IDAT chunk
let offset = 8 // skip PNG signature
let idat = []
while (offset < buf.length) {
  const len = buf.readUInt32BE(offset)
  const type = buf.toString('ascii', offset + 4, offset + 8)
  if (type === 'IDAT') {
    idat.push(Buffer.from(buf.slice(offset + 8, offset + 8 + len)))
  }
  offset += 12 + len
}
const raw = zlib.inflateSync(Buffer.concat(idat))
// raw is filter-byte + pixel rows
const size = 21
const gray = new Uint8Array(size * size)
for (let y = 0; y < size; y++) {
  const filter = raw[y * (size + 1)]
  for (let x = 0; x < size; x++) {
    gray[y * size + x] = raw[y * (size + 1) + 1 + x]
  }
}
console.log('TEST grid:')
for (let y = 0; y < size; y++)
  console.log(y, Array.from({length:size},(_,x)=>gray[y*size+x]<128?'#':'.').join(''))
fs.writeFileSync('/tmp/test-qr-gray.bin', Buffer.from(gray))
console.log('Saved gray data')
`

fs.writeFileSync('/tmp/run-test-qr.mjs', code)
console.log('Script written to /tmp/run-test-qr.mjs')
