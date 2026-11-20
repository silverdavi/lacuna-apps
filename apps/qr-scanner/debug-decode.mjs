import fs from 'node:fs'
import { encodeQr } from './src/lib/qr.ts'
import { encodePng, decodePng } from './src/lib/png.ts'

const m = encodeQr('Test123')
const png = encodePng(m.size, m.dark)
const d = decodePng(png)
const gray = d.gray
const W = d.width
const H = d.height
const dark = (x, y) => gray[y * W + x] < 128
const size = m.size

const matrix = new Array(size * size)
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++)
    matrix[y * size + x] = dark(x, y)

const topXY = [
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
  [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
]
const fmtTop = topXY.map(([x,y]) => matrix[y*size+x] ? 1 : 0)
console.log('fmtTop:', fmtTop.join(''))

const fmtBot = []
for (let i = 0; i <= 7; i++) fmtBot.push(matrix[8*size + (size-1-i)] ? 1 : 0)
for (let i = 8; i <= 14; i++) fmtBot.push(matrix[(size-1-(i-8))*size + 8] ? 1 : 0)
console.log('fmtBot:', fmtBot.join(''))

function formatBits(ecc, mask) {
  const dd = ((ecc << 3) | mask) << 10
  let rem = dd
  for (let i = 0; i < 10; i++) rem = ((rem << 1) & 0x7ffff) ^ ((rem & 0x10000) === 0x10000 ? 0x537 : 0)
  const v = ((dd << 10) | (rem & 0x3ff)) ^ 0x5412
  const out = []
  for (let k = 14; k >= 0; k--) out.push(((v >>> k) & 1) === 1)
  return out
}
for (let mask = 0; mask < 8; mask++) {
  const bits = formatBits(0, mask)
  const wTop = bits.reduce((s, b, i) => s + ((b?1:0) !== fmtTop[i] ? 1 : 0), 0)
  const wBot = bits.reduce((s, b, i) => s + ((b?1:0) !== fmtBot[i] ? 1 : 0), 0)
  console.log(`mask ${mask}: wTop=${wTop} wBot=${wBot} total=${wTop+wBot} bits=${bits.map(b=>b?1:0).join('')}`)
}
