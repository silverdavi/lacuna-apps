// Number theory around Euler's totient. Pure BigInt, no DOM, no network.

export const MAX_DIGITS = 24
export const MAX_N = 10n ** 24n
export const TIME_LIMIT_MS = 2000

export class TooLargeError extends Error {
  constructor() {
    super('too large')
    this.name = 'TooLargeError'
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('timed out')
    this.name = 'TimeoutError'
  }
}

export type Factor = [bigint, number]

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}

export function lcm(a: bigint, b: bigint): bigint {
  return a === 0n || b === 0n ? 0n : (a / gcd(a, b)) * b
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n
  let result = 1n
  let b = ((base % mod) + mod) % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

const MR_BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]

/** Miller-Rabin with the first twelve prime bases: deterministic below 3.3e24. */
export function isProbablePrime(n: bigint): boolean {
  if (n < 2n) return false
  for (const p of MR_BASES) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  let d = n - 1n
  let s = 0
  while ((d & 1n) === 0n) {
    d >>= 1n
    s++
  }
  outer: for (const a of MR_BASES) {
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    for (let i = 1; i < s; i++) {
      x = (x * x) % n
      if (x === n - 1n) continue outer
    }
    return false
  }
  return true
}

function rhoBrent(n: bigint, c: bigint, check: () => void): bigint {
  const m = 128
  let y = 2n
  let r = 1
  let q = 1n
  let g = 1n
  let x = y
  let ys = y
  const f = (v: bigint) => (v * v + c) % n
  while (g === 1n) {
    x = y
    for (let i = 0; i < r; i++) y = f(y)
    let k = 0
    while (k < r && g === 1n) {
      ys = y
      const lim = Math.min(m, r - k)
      for (let i = 0; i < lim; i++) {
        y = f(y)
        const diff = x > y ? x - y : y - x
        q = (q * diff) % n
      }
      g = gcd(q, n)
      k += m
      check()
    }
    r *= 2
  }
  if (g === n) {
    do {
      ys = f(ys)
      const diff = x > ys ? x - ys : ys - x
      g = gcd(diff, n)
    } while (g === 1n)
  }
  return g
}

function splitComposite(n: bigint, out: Map<bigint, number>, check: () => void) {
  if (n === 1n) return
  if (isProbablePrime(n)) {
    out.set(n, (out.get(n) ?? 0) + 1)
    return
  }
  let c = 1n
  let d = n
  while (d === n || d === 1n) {
    d = rhoBrent(n, c, check)
    c++
  }
  splitComposite(d, out, check)
  splitComposite(n / d, out, check)
}

/** Prime factorization as sorted [prime, exponent] pairs. Throws TooLargeError or TimeoutError. */
export function factor(n: bigint, limitMs = TIME_LIMIT_MS): Factor[] {
  if (n < 1n) throw new RangeError('n must be at least 1')
  if (n > MAX_N) throw new TooLargeError()
  const start = now()
  const check = () => {
    if (now() - start > limitMs) throw new TimeoutError()
  }
  const found = new Map<bigint, number>()
  let m = n
  for (const p of [2n, 3n, 5n]) {
    while (m % p === 0n) {
      m /= p
      found.set(p, (found.get(p) ?? 0) + 1)
    }
  }
  let d = 7n
  let steps = 0
  const inc = [4n, 2n, 4n, 2n, 4n, 6n, 2n, 6n]
  let w = 0
  while (d <= 100000n && d * d <= m) {
    while (m % d === 0n) {
      m /= d
      found.set(d, (found.get(d) ?? 0) + 1)
    }
    d += inc[w]
    w = (w + 1) % 8
    if ((++steps & 4095) === 0) check()
  }
  if (m > 1n) {
    if (d * d > m) found.set(m, (found.get(m) ?? 0) + 1)
    else splitComposite(m, found, check)
  }
  return [...found.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

export function phiOf(f: Factor[]): bigint {
  let r = 1n
  for (const [p, k] of f) r *= p ** BigInt(k - 1) * (p - 1n)
  return r
}

export function lambdaOf(f: Factor[]): bigint {
  let r = 1n
  for (const [p, k] of f) {
    let l: bigint
    if (p === 2n) l = k === 1 ? 1n : k === 2 ? 2n : 2n ** BigInt(k - 2)
    else l = p ** BigInt(k - 1) * (p - 1n)
    r = lcm(r, l)
  }
  return r
}

export function radOf(f: Factor[]): bigint {
  return f.reduce((a, [p]) => a * p, 1n)
}

/** True when every prime dividing g also divides m (that is, rad(g) | m). */
export function radDivides(g: bigint, m: bigint): boolean {
  let rest = g
  let d = gcd(rest, m)
  while (d > 1n) {
    rest /= d
    d = gcd(rest, m)
  }
  return rest === 1n
}

export function formatFactors(f: Factor[], sep = ' x '): string {
  return f.map(([p, k]) => (k > 1 ? `${p}^${k}` : `${p}`)).join(sep)
}

export function decimal(num: bigint, den: bigint, places = 6): string {
  const scale = 10n ** BigInt(places)
  const q = (num * scale) / den
  const whole = q / scale
  const frac = (q % scale).toString().padStart(places, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : `${whole}`
}

export interface KorseltRow {
  p: bigint
  exp: number
  pMinus1: bigint
  rem: bigint
  ok: boolean
}

export interface FermatRow {
  a: number
  power: bigint
  g: bigint
  pass: boolean
}

export interface Analysis {
  n: bigint
  factors: Factor[]
  prime: boolean
  phi: bigint
  lambda: bigint
  rad: bigint
  indexNum: bigint
  indexDen: bigint
  indexInteger: boolean
  indexDecimal: string
  squarefree: boolean
  lehmer: boolean
  carmichael: boolean
  korselt: boolean
  korseltRows: KorseltRow[]
  radimichael: boolean
  kLehmer: number | null
  fermat2: boolean
  fermatRows: FermatRow[]
}

export function kLehmerOf(phi: bigint, n: bigint, max = 8): number | null {
  const m = n - 1n
  let pow = 1n
  for (let k = 1; k <= max; k++) {
    pow *= m
    if (pow % phi === 0n) return k
  }
  return null
}

export function analyze(n: bigint, limitMs = TIME_LIMIT_MS): Analysis {
  if (n < 2n) throw new RangeError('n must be at least 2')
  const factors = factor(n, limitMs)
  const prime = factors.length === 1 && factors[0][1] === 1
  const phi = phiOf(factors)
  const lambda = lambdaOf(factors)
  const rad = radOf(factors)
  const g = gcd(n - 1n, phi)
  const indexNum = (n - 1n) / g
  const indexDen = phi / g
  const squarefree = factors.every(([, k]) => k === 1)
  const composite = !prime
  const lehmer = composite && (n - 1n) % phi === 0n
  const carmichael = composite && (n - 1n) % lambda === 0n
  const korseltRows: KorseltRow[] = factors.map(([p, exp]) => ({
    p,
    exp,
    pMinus1: p - 1n,
    rem: (n - 1n) % (p - 1n || 1n),
    ok: exp === 1 && (n - 1n) % (p - 1n || 1n) === 0n,
  }))
  const korselt = composite && squarefree && korseltRows.every((r) => r.ok)
  const radimichael = composite && radDivides(phi, n - 1n)
  const kLehmer = composite ? kLehmerOf(phi, n) : null
  const fermatRows: FermatRow[] = []
  for (let a = 2; a <= 13; a++) {
    const A = BigInt(a)
    const gg = gcd(A, n)
    const power = n === A ? 0n : modPow(A, n - 1n, n)
    fermatRows.push({ a, power, g: gg, pass: power === 1n })
  }
  const fermat2 = composite && fermatRows[0].pass
  return {
    n,
    factors,
    prime,
    phi,
    lambda,
    rad,
    indexNum,
    indexDen,
    indexInteger: indexDen === 1n,
    indexDecimal: decimal(n - 1n, phi),
    squarefree,
    lehmer,
    carmichael,
    korselt,
    korseltRows,
    radimichael,
    kLehmer,
    fermat2,
    fermatRows,
  }
}

export type ParseResult =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'small' }
  | { kind: 'large' }
  | { kind: 'ok'; n: bigint }

/** Digits only; commas, spaces and underscores are ignored so pasted numbers work. */
export function parseInput(text: string): ParseResult {
  const cleaned = text.replace(/[,\s_]/g, '')
  if (cleaned === '') return { kind: 'empty' }
  if (!/^\d+$/.test(cleaned)) return { kind: 'invalid' }
  const n = BigInt(cleaned)
  if (n < 2n) return { kind: 'small' }
  if (n > MAX_N) return { kind: 'large' }
  return { kind: 'ok', n }
}
