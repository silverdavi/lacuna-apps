// Unit tests for the generator. Run with: node --test tests/generate.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, CROSSWORD_CLUES } from '../src/data/clues.ts'
import { SIZES, allWords, generate, generateCustom, generateDaily, poolFor, verify } from '../src/generate.ts'
import type { SizeKey } from '../src/generate.ts'

const sizes = Object.keys(SIZES) as SizeKey[]

test('clue bank: unique A-Z answers, 3 to 13 letters, clues never hold their answer', () => {
  const seen = new Set<string>()
  for (const c of CROSSWORD_CLUES) {
    assert.match(c.answer, /^[A-Z]{3,13}$/)
    assert.ok(!seen.has(c.answer), `duplicate ${c.answer}`)
    seen.add(c.answer)
    assert.ok(!new RegExp(`\\b${c.answer}`, "i").test(c.clue), `${c.answer} is in its clue`)
  }
  assert.ok(CROSSWORD_CLUES.length >= 450)
  for (const cat of CATEGORIES) assert.ok(CROSSWORD_CLUES.some((c) => c.category === cat))
})

for (const size of sizes) {
  test(`${size}: layouts are legal, read back, connected and in the word range`, () => {
    for (let i = 0; i < 12; i++) {
      const r = generate({ size, difficulty: 'mixed', categories: [], seed: `t${i}` })
      assert.ok(r.ok, `seed t${i} failed: ${!r.ok && r.reason}`)
      if (!r.ok) continue
      const p = r.puzzle
      assert.deepEqual(verify(p), [], `seed t${i}`)
      const n = allWords(p).length
      assert.ok(n >= SIZES[size].need && n <= SIZES[size].max, `${n} words`)
      assert.ok(p.rows <= SIZES[size].n && p.cols <= SIZES[size].n)
      const mins = size === 'small' ? 10 : size === 'medium' ? 14 : 18
      assert.ok(n >= mins, `${size} seed t${i} placed ${n}, wanted at least ${mins}`)
    }
  })
}

test('the same seed gives the same puzzle, another seed does not', () => {
  const a = generate({ size: 'medium', difficulty: 'mixed', categories: [], seed: 'same' })
  const b = generate({ size: 'medium', difficulty: 'mixed', categories: [], seed: 'same' })
  const c = generate({ size: 'medium', difficulty: 'mixed', categories: [], seed: 'other' })
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, c)
})

test('daily puzzle is the same for the same date and differs by date', () => {
  const d1 = generateDaily(new Date(2026, 10, 27, 8))
  const d2 = generateDaily(new Date(2026, 10, 27, 22))
  const d3 = generateDaily(new Date(2026, 10, 28, 8))
  assert.deepEqual(d1, d2)
  assert.notDeepEqual(d1, d3)
  assert.ok(d1.ok)
  if (d1.ok) assert.deepEqual(verify(d1.puzzle), [])
})

test('numbering follows reading order and clues match their start cells', () => {
  const r = generate({ size: 'small', difficulty: 'mixed', categories: [], seed: 'num' })
  assert.ok(r.ok)
  if (!r.ok) return
  const p = r.puzzle
  const starts = new Map<number, [number, number]>()
  for (const w of allWords(p)) {
    const prev = starts.get(w.n)
    if (prev) assert.deepEqual(prev, [w.row, w.col])
    starts.set(w.n, [w.row, w.col])
  }
  const order = [...starts.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])
  for (let i = 1; i < order.length; i++) {
    const [r0, c0] = order[i - 1]
    const [r1, c1] = order[i]
    assert.ok(r1 > r0 || (r1 === r0 && c1 > c0))
  }
  assert.equal(order.length, new Set(allWords(p).map((w) => w.n)).size)
  assert.equal(starts.get(1)!.join(), order[0].join())
})

test('category and difficulty filters are respected', () => {
  const r = generate({ size: 'large', difficulty: 'easy', categories: ['math', 'science'], seed: 'f' })
  const pool = new Set(poolFor('easy', ['math', 'science'], 13).map((c) => c.answer))
  if (r.ok) for (const w of allWords(r.puzzle)) assert.ok(pool.has(w.answer))
})

test('a narrow pool reports it could not place enough words', () => {
  const r = generate({ size: 'large', difficulty: 'hard', categories: ['history'], seed: 'narrow' })
  assert.equal(r.ok, false)
  if (!r.ok) assert.ok(r.placed < r.need)
})

test('custom lists generate a sound puzzle with the given clues', () => {
  const entries = ['PLANET - World that orbits a star', 'ORBIT - Path around a star', 'TELESCOPE - Instrument for far objects', 'COMET - Icy visitor with a tail', 'STAR - Sun, for one', 'MOON - Earth satellite', 'LUNAR - Of the moon'].map((l) => {
    const [answer, clue] = l.split(' - ')
    return { answer, clue }
  })
  const r = generateCustom(entries, 'c1', 'Space words')
  assert.ok(r.ok)
  if (!r.ok) return
  assert.deepEqual(verify(r.puzzle), [])
  for (const w of allWords(r.puzzle)) assert.equal(entries.find((e) => e.answer === w.answer)?.clue, w.clue)
})

test('speed: a puzzle within the time budget', () => {
  const t = Date.now()
  generate({ size: 'large', difficulty: 'mixed', categories: [], seed: 'speed', attempts: 400, budgetMs: 150 })
  assert.ok(Date.now() - t < 600)
})
