import fs from 'node:fs'
import { encodeQr, decodeQr } from './src/lib/qr.ts'
import { encodePng, decodePng } from './src/lib/png.ts'

const png = fs.readFileSync('tests/zz-test123.png')
const { width, height, gray } = decodePng(new Uint8Array(png))
console.log('fixture decoded w', width, 'h', height)
const out = decodeQr(gray, width, height)
console.log('decodeQr =>', JSON.stringify(out))

const m = encodeQr('Test123')
const p = encodePng(m.size, m.dark)
const d = decodePng(p)
console.log('roundtrip =>', JSON.stringify(decodeQr(d.gray, d.width, d.height)))
