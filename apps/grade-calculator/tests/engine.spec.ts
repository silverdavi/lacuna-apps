// Unit tests for the pure grade engine. Run under Playwright's node loader.
import { test, expect } from '@playwright/test'
import { fmt2, fmtPct, sumWeights, validateComponent, weightedTotal, weightsWarning, type GradeState } from '../src/engine'

const c = (name: string, score: number, weight: number): GradeState => ({
  components: [{ id: name, name, score, weight }],
})

test('fmt2 keeps two decimals', () => {
  expect(fmt2(91.25)).toBe('91.25')
  expect(fmt2(100)).toBe('100.00')
  expect(fmt2(0)).toBe('0.00')
})

test('fmtPct keeps whole percents bare and decimals at two places', () => {
  expect(fmtPct(40)).toBe('40%')
  expect(fmtPct(12.5)).toBe('12.50%')
})

test('weightedTotal of a single component is score * weight / 100', () => {
  expect(weightedTotal(c('Quiz', 80, 50))).toBe(40)
})

test('weightedTotal sums each component\u2019s contribution', () => {
  const state: GradeState = {
    components: [
      { id: 'a', name: 'Midterm', score: 90, weight: 40 },
      { id: 'b', name: 'Final', score: 80, weight: 60 },
    ],
  }
  expect(weightedTotal(state)).toBe(84)
})

test('sumWeights adds every component\u2019s weight', () => {
  const state: GradeState = {
    components: [
      { id: 'a', name: 'A', score: 10, weight: 25 },
      { id: 'b', name: 'B', score: 10, weight: 75 },
    ],
  }
  expect(sumWeights(state)).toBe(100)
})

test('an empty state weighs 0 and totals 0', () => {
  const empty: GradeState = { components: [] }
  expect(sumWeights(empty)).toBe(0)
  expect(weightedTotal(empty)).toBe(0)
})

test('validateComponent rejects a blank name', () => {
  const result = validateComponent('   ', '90', '10')
  expect(result.ok === false && result.message).toBe('Enter a name and a score between 0 and 100')
})

test('validateComponent trims the name and parses the score', () => {
  const result = validateComponent('  Quiz  ', '90', '10')
  expect(result).toEqual({ ok: true, name: 'Quiz', score: 90 })
})

test('validateComponent rejects a non-numeric score', () => {
  const result = validateComponent('Quiz', 'abc', '10')
  expect(result.ok === false && result.message).toBe('Score must be a number')
})

test('validateComponent rejects a score above 100', () => {
  const result = validateComponent('Quiz', '101', '10')
  expect(result.ok === false && result.message).toBe('Enter a name and a score between 0 and 100')
})

test('validateComponent rejects a negative score', () => {
  const result = validateComponent('Quiz', '-1', '10')
  expect(result.ok === false && result.message).toBe('Enter a name and a score between 0 and 100')
})

test('weightsWarning is null at exactly 100%', () => {
  expect(weightsWarning(c('A', 10, 100))).toBe(null)
})

test('weightsWarning reports the running total otherwise', () => {
  const state: GradeState = {
    components: [
      { id: 'a', name: 'A', score: 10, weight: 25 },
      { id: 'b', name: 'B', score: 10, weight: 15 },
    ],
  }
  expect(weightsWarning(state)).toBe('Weights sum to 40%')
})
