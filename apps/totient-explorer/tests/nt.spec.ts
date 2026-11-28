import { expect, test } from '@playwright/test'
import { analyze, factor, formatFactors, isProbablePrime, parseInput, TimeoutError, TooLargeError } from '../src/nt'
import { carmichaelSegment, smallPrimes } from '../src/scan'

test('Miller-Rabin', () => {
  expect(isProbablePrime(97n)).toBe(true)
  expect(isProbablePrime(561n)).toBe(false)
  expect(isProbablePrime(2n ** 89n - 1n)).toBe(true)
  expect(isProbablePrime(3825123056546413051n)).toBe(false)
})

test('factor', () => {
  expect(formatFactors(factor(561n))).toBe('3 x 11 x 17')
  expect(formatFactors(factor(2n ** 10n * 3n ** 4n))).toBe('2^10 x 3^4')
  const p = 1000000007n
  const q = 998244353n
  expect(factor(p * q)).toEqual([[q, 1], [p, 1]])
  expect(() => factor(10n ** 24n + 1n)).toThrow(TooLargeError)
})

test('factor times out instead of hanging', () => {
  const p = 999999999989n
  const q = 999999999961n
  try {
    factor(p * q, 50)
  } catch (e) {
    expect(e).toBeInstanceOf(TimeoutError)
  }
})

test('561', () => {
  const a = analyze(561n)
  expect(a.phi).toBe(320n)
  expect(a.lambda).toBe(80n)
  expect(a.carmichael).toBe(true)
  expect(a.korselt).toBe(true)
  expect(a.lehmer).toBe(false)
  expect(a.indexNum).toBe(7n)
  expect(a.indexDen).toBe(4n)
})

test('85', () => {
  const a = analyze(85n)
  expect(a.phi).toBe(64n)
  expect(a.radimichael).toBe(true)
  expect(a.korselt).toBe(false)
  expect(a.carmichael).toBe(false)
  expect(a.kLehmer).toBe(3)
})

test('1729, 341, primes', () => {
  expect(analyze(1729n).carmichael).toBe(true)
  const a = analyze(341n)
  expect(a.fermat2).toBe(true)
  expect(a.carmichael).toBe(false)
  const p = analyze(97n)
  expect(p.prime).toBe(true)
  expect(p.lehmer).toBe(false)
  expect(p.indexInteger).toBe(true)
  expect(analyze(2n ** 5n * 3n).lambda).toBe(8n)
})

test('Carmichael counts', () => {
  const primes = smallPrimes(1001)
  expect(carmichaelSegment(2, 100000, primes).length).toBe(16)
  const all = [...carmichaelSegment(2, 500000, primes), ...carmichaelSegment(500001, 1000000, primes)]
  expect(all.length).toBe(43)
})

test('input parsing', () => {
  expect(parseInput('')).toEqual({ kind: 'empty' })
  expect(parseInput('1')).toEqual({ kind: 'small' })
  expect(parseInput('1,729')).toEqual({ kind: 'ok', n: 1729n })
  expect(parseInput('12a')).toEqual({ kind: 'invalid' })
  expect(parseInput('9'.repeat(25))).toEqual({ kind: 'large' })
})
