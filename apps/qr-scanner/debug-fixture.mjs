import fs from 'node:fs'
import { encodeQr, decodeQr } from './src/lib/qr.ts'
import { encodePng, decodePng } from './src/lib/png.ts'

// Check the fixture
const pngBuf = fs.readFileSync('./tests/zz-test123.png')
const d = decodePng(pngBuf)
console.log('fixture w', d.width, 'h', d.height)
const dark = (x, y) => d.gray[y * d.width + x] < 128

// Print fixture matrix
console.log('Fixture matrix:')
for (let y = 0; y < d.height; y++)
  console.log(Array.from({length:d.width},(_,x)=>dark(x,y)?'#':'.').join(''))

// Compare with encoder output
const m = encodeQr('Test123')
const png2 = encodePng(m.size, m.dark)
const d2 = decodePng(png2)
const dark2 = (x, y) => d2.gray[y * d2.width + x] < 128

console.log('\nEncoder matrix:')
for (let y = 0; y < d2.height; y++)
  console.log(Array.from({length:d2.width},(_,x)=>dark2(x,y)?'#':'.').join(''))

// Diff
let diffs = 0
for (let y = 0; y < Math.min(d.height, d2.height); y++)
  for (let x = 0; x < Math.min(d.width, d2.width); x++)
    if (dark(x,y) !== dark2(x,y)) { diffs++; console.log(`diff at (${x},${y}): fixture=${dark(x,y)} encoder=${dark2(x,y)}`) }
console.log('\ntotal diffs:', diffs)
