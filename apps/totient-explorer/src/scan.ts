// Range scans on plain numbers (n up to 10^9). Segmented factor sieve, then cheap verdicts.

export const MAX_WIDTH = 200000
export const MAX_UPPER = 1_000_000_000

export interface ScanRow {
  n: number
  factors: [number, number][]
  phi: number
  prime: boolean
  carmichael: boolean
  radimichael: boolean
  /** Smallest k <= 8 with phi | (n-1)^k, composites only. */
  k: number | null
  fermat2: boolean
}

function gcdN(a: number, b: number): number {
  while (b) [a, b] = [b, a % b]
  return a
}

function lcmN(a: number, b: number): number {
  return (a / gcdN(a, b)) * b
}

/** a*b mod m for m < 2^31, exact in doubles. */
function mulMod(a: number, b: number, m: number): number {
  const hi = Math.floor(b / 32768)
  const lo = b % 32768
  return (((a * hi) % m) * 32768 + a * lo) % m
}

function powMod(base: number, exp: number, m: number): number {
  let r = 1 % m
  let b = base % m
  let e = exp
  while (e > 0) {
    if (e % 2 === 1) r = mulMod(r, b, m)
    b = mulMod(b, b, m)
    e = Math.floor(e / 2)
  }
  return r
}

export function smallPrimes(limit: number): number[] {
  const s = new Uint8Array(limit + 1)
  const out: number[] = []
  for (let i = 2; i <= limit; i++) {
    if (!s[i]) {
      out.push(i)
      for (let j = i * i; j <= limit; j += i) s[j] = 1
    }
  }
  return out
}

/** Factor every n in [lo, hi] with a segmented sieve over primes up to sqrt(hi). */
export function sieveSegment(lo: number, hi: number, primes: number[]): [number, number][][] {
  const len = hi - lo + 1
  const rem = new Float64Array(len)
  const fac: [number, number][][] = new Array(len)
  for (let i = 0; i < len; i++) {
    rem[i] = lo + i
    fac[i] = []
  }
  for (const p of primes) {
    if (p * p > hi) break
    let start = Math.ceil(lo / p) * p
    for (let m = start; m <= hi; m += p) {
      const i = m - lo
      let e = 0
      while (rem[i] % p === 0) {
        rem[i] /= p
        e++
      }
      if (e) fac[i].push([p, e])
    }
  }
  for (let i = 0; i < len; i++) if (rem[i] > 1) fac[i].push([rem[i], 1])
  return fac
}

export function scanRow(n: number, f: [number, number][]): ScanRow {
  const prime = f.length === 1 && f[0][1] === 1
  let phi = 1
  let lambda = 1
  for (const [p, k] of f) {
    const t = Math.pow(p, k - 1) * (p - 1)
    phi *= t
    const l = p === 2 ? (k === 1 ? 1 : k === 2 ? 2 : Math.pow(2, k - 2)) : t
    lambda = lcmN(lambda, l)
  }
  const m = n - 1
  const carmichael = !prime && m % lambda === 0
  let rest = phi
  let d = gcdN(rest, m)
  while (d > 1) {
    rest /= d
    d = gcdN(rest, m)
  }
  const radimichael = !prime && rest === 1
  let k: number | null = null
  if (!prime && radimichael) {
    let pw = 1
    for (let i = 1; i <= 8; i++) {
      pw = mulMod(pw, m % phi, phi)
      if (pw === 0) {
        k = i
        break
      }
    }
  }
  const fermat2 = !prime && n % 2 === 1 && powMod(2, m, n) === 1
  return { n, factors: f, phi, prime, carmichael, radimichael, k, fermat2 }
}

export function formatNumberFactors(f: [number, number][]): string {
  return f.map(([p, k]) => (k > 1 ? `${p}^${k}` : `${p}`)).join(' x ')
}

/** Carmichael numbers in [lo, hi] (Korselt test on a segmented sieve). */
export function carmichaelSegment(lo: number, hi: number, primes: number[]): { n: number; factors: [number, number][] }[] {
  const fac = sieveSegment(lo, hi, primes)
  const out: { n: number; factors: [number, number][] }[] = []
  for (let i = 0; i < fac.length; i++) {
    const n = lo + i
    const f = fac[i]
    if (n % 2 === 0 || f.length < 3) continue
    let ok = true
    for (const [p, e] of f) {
      if (e > 1 || (n - 1) % (p - 1) !== 0) {
        ok = false
        break
      }
    }
    if (ok) out.push({ n, factors: f })
  }
  return out
}
