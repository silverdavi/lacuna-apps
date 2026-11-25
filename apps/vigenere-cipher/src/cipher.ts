// Vigenere cipher: shift each letter of the message by the key letter,
// repeating the key. Case is preserved; non-letters (spaces, digits,
// punctuation) pass through unchanged. Decode is the inverse shift.
const A = 'a'.charCodeAt(0)
const UPPER = 'A'.charCodeAt(0)
const SPAN = 26

function shiftIndex(index: number, amount: number): number {
  return ((index + amount) % SPAN + SPAN) % SPAN
}

/** Letters of the key, normalized to lowercase a-z. */
function keyLetters(key: string): string[] {
  return [...key.toLowerCase()].filter((c) => c >= 'a' && c <= 'z')
}

export function vigenere(text: string, key: string, decode: boolean): string {
  const letters = keyLetters(key)
  if (text === '' || letters.length === 0) return text
  const sign = decode ? -1 : 1
  let ki = 0
  let out = ''
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    let base: number
    if (code >= A && code < A + SPAN) base = A // a-z
    else if (code >= UPPER && code < UPPER + SPAN) base = UPPER // A-Z
    else {
      out += ch
      continue
    }
    out += String.fromCharCode(base + shiftIndex(code - base, sign * (letters[ki].charCodeAt(0) - A)))
    ki = (ki + 1) % letters.length
  }
  return out
}
