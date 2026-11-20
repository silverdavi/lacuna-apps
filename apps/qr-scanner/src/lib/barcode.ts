// 1D barcode encoders. EAN-13 computes the check digit from 12 input digits.
// Code 128 auto-selects the start code by the leading character set.
// Each encoder returns a single row of dark/light bars; the caller scales it
// into a square module grid so the existing PNG encoder can render it.

export interface BarcodeRow {
  dark: boolean[]
}

const EAN_DIGIT: string[] = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
]
const EAN_PARITY: string[] = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL',
  'LGLGLG', 'LGLGGL', 'LGGLGL',
]

export function ean13CheckDigit(d12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

export function encodeEan13(digits: string): string {
  if (!/^\d{12}$/.test(digits)) throw new Error('EAN-13 needs 12 digits')
  return digits + ean13CheckDigit(digits)
}

const GUARD = '01010'
const CENTER = '0101010'
const END = '101'

function reverse(s: string): string {
  return s.split('').reverse().join('')
}

// Render a 1D code as a single dark/light row (width in modules).
function buildRow(groups: string[]): boolean[] {
  const row: boolean[] = []
  for (const g of groups) for (const ch of g) row.push(ch === '1')
  return row
}

export function ean13Row(digits: string): BarcodeRow {
  const code = /^\d{13}$/.test(digits) ? digits : encodeEan13(digits)
  const left = EAN_PARITY[Number(code[0])]
  const parts = [GUARD]
  for (let i = 1; i <= 6; i++) {
    const d = Number(code[i])
    let bits = EAN_DIGIT[d]
    if (left[i - 1] === 'R') bits = reverse(bits).replace(/[01]/g, (c) => (c === '0' ? '1' : '0'))
    parts.push(bits)
  }
  parts.push(CENTER)
  for (let i = 7; i <= 12; i++) parts.push(EAN_DIGIT[Number(code[i])])
  parts.push(END)
  return { dark: buildRow(parts) }
}

// Code 128. 103 value patterns, each 6 alternating bar/space widths (1..4),
// summing to 11 modules. The stop is a 7-element pattern (sum 13) that ends
// with a 2-module final bar.
const C128: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 1, 2], [1, 2, 1, 2, 2, 3],
  [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2],
  [1, 3, 2, 2, 1, 2], [1, 2, 2, 2, 2, 3], [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2],
  [1, 2, 2, 1, 3, 2], [1, 1, 3, 1, 2, 3], [1, 3, 3, 1, 1, 2], [1, 2, 3, 2, 1, 2],
  [2, 2, 1, 1, 3, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [1, 1, 2, 1, 3, 3],
  [1, 1, 2, 2, 3, 1], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1], [1, 3, 2, 2, 3, 1],
  [1, 3, 2, 3, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 2, 2, 3], [2, 1, 2, 3, 2, 2],
  [2, 2, 2, 1, 2, 3], [2, 2, 2, 2, 2, 3], [2, 2, 2, 3, 2, 2], [2, 1, 3, 2, 2, 2],
  [2, 2, 3, 2, 1, 2], [2, 2, 3, 1, 2, 2], [2, 2, 3, 2, 2, 1], [3, 1, 2, 1, 3, 1],
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 1, 2], [3, 2, 1, 2, 2, 1],
  [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [3, 2, 2, 2, 2, 1],
  [2, 1, 2, 1, 3, 1], [2, 1, 2, 2, 3, 1], [2, 1, 2, 3, 1, 1], [2, 1, 3, 1, 2, 1],
  [2, 1, 3, 2, 1, 1], [2, 1, 3, 3, 1, 1], [2, 2, 3, 1, 1, 1], [2, 2, 1, 1, 3, 1],
  [2, 2, 1, 2, 3, 1], [2, 2, 1, 3, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1],
  [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1],
  [1, 1, 4, 1, 1, 3], [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1],
  [1, 1, 3, 1, 4, 1], [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1],
  [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1],
  [2, 1, 1, 3, 1, 3], [2, 1, 3, 1, 1, 3], [2, 1, 3, 1, 3, 1], [2, 1, 3, 3, 1, 1],
  [2, 1, 4, 1, 3, 1], [2, 1, 4, 3, 1, 1], [4, 3, 1, 1, 3, 1], [1, 1, 1, 2, 4, 2],
  [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 4, 1, 2], [1, 4, 1, 1, 1, 2],
  [1, 4, 1, 2, 1, 1], [1, 1, 2, 1, 4, 2], [1, 1, 2, 4, 1, 2], [1, 2, 4, 1, 1, 2],
  [1, 2, 4, 2, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1],
  [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 2], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 2],
  [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 2],
  [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1], [1, 1, 2, 1, 2, 4], [1, 1, 2, 4, 2, 1],
  [1, 2, 2, 1, 1, 4], [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 1], [2, 1, 2, 1, 1, 4],
  [2, 1, 4, 1, 1, 2], [2, 2, 4, 1, 1, 1], [4, 1, 3, 1, 1, 1], [1, 1, 1, 1, 2, 4],
  [1, 1, 1, 2, 4, 1], [1, 2, 1, 1, 1, 4], [1, 1, 4, 1, 1, 2], [1, 1, 1, 4, 1, 2],
  [1, 2, 1, 1, 4, 1], [1, 2, 1, 4, 1, 1], [1, 4, 1, 1, 1, 2], [1, 4, 1, 2, 1, 1],
  [2, 1, 1, 1, 1, 4], [2, 1, 1, 4, 1, 1], [2, 1, 4, 1, 1, 1], [1, 1, 1, 1, 4, 2],
]
const STOP = [2, 3, 3, 1, 1, 1, 2]

export function encodeCode128(text: string): number[] {
  if (!text) throw new Error('Code 128 needs text')
  if ([...text].some((c) => c.charCodeAt(0) > 127)) {
    throw new Error('Code 128 here encodes ASCII only')
  }
  const values: number[] = [105]
  for (const c of text) values.push(c.charCodeAt(0))
  let check = 105
  for (let k = 1; k < values.length; k++) check += k * values[k]
  values.push(check % 103)
  return values
}

export function code128Row(text: string): BarcodeRow {
  const values = encodeCode128(text)
  const widths: number[] = []
  for (const v of values) {
    const p = C128[v]
    for (let b = 0; b < 6; b++) widths.push(p[b])
  }
  for (const w of STOP) widths.push(w)
  const row: boolean[] = []
  for (let b = 0; b < widths.length; b++) {
    for (let u = 0; u < widths[b]; u++) row.push(b % 2 === 0)
  }
  return { dark: row }
}
