import fs from 'node:fs'
import { encodeQr, decodeQr } from './src/lib/qr.ts'
import { encodePng, decodePng } from './src/lib/png.ts'

const m = encodeQr('Test123')
const png = encodePng(m.size, m.dark)
const d = decodePng(png)
const gray = d.gray
const W = d.width
const H = d.height
const dark = (x, y) => gray[y * W + x] < 128

// Print full matrix
console.log('Full matrix (# = dark):')
for (let y = 0; y < H; y++) console.log(Array.from({length:W},(_,x)=>dark(x,y)?'#':'.').join(''))

console.log('decodeQr =>', JSON.stringify(decodeQr(gray, W, H)))
