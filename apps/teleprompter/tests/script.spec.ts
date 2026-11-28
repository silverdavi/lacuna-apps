import { expect, test } from '@playwright/test'
import { SAMPLE_TEXT } from '../src/sample'
import { countWords, formatClock, formatEstimate, parseDuration, parseScript, stepMs } from '../src/script'

test('plain text with no markers is one section of paragraph lines', () => {
  const p = parseScript('One two three.\n\nFour five.')
  expect(p.sections).toHaveLength(1)
  expect(p.steps.map((s) => s.kind)).toEqual(['line', 'line'])
  expect(p.words).toBe(5)
})

test('a paragraph over several lines is one item', () => {
  const p = parseScript('alpha\nbeta\ngamma\n\ndelta')
  expect(p.lines).toBe(2)
  expect(p.steps[0]).toMatchObject({ kind: 'line', text: 'alpha beta gamma', words: 3 })
})

test('sections carry titles and optional target durations', () => {
  const p = parseScript('## Intro `1:30`\n\nHello there.\n\n## Middle\n\nMore words here now.')
  expect(p.sections.map((s) => [s.title, s.target])).toEqual([['Intro', 90], ['Middle', null]])
  expect(p.steps.map((s) => s.kind)).toEqual(['section', 'line', 'section', 'line'])
  expect(p.sections[1].start).toBe(2)
  expect(p.sections[0].words).toBe(2)
})

test('a bad duration stays in the title', () => {
  const p = parseScript('## Hello `soon`\n\nText')
  expect(p.sections[0].target).toBeNull()
  expect(p.sections[0].title).toBe('Hello `soon`')
})

test('cues attach to the next line, or the last when nothing follows', () => {
  const p = parseScript('> smile\n\nFirst line.\n\nSecond.\n\n> done')
  const lines = p.steps.filter((s) => s.kind === 'line')
  expect(lines[0]).toMatchObject({ cue: 'smile' })
  expect(lines[1]).toMatchObject({ cue: 'done' })
})

test('stage directions are split out and not counted', () => {
  expect(countWords('Hello [pause] world [looks up]')).toBe(2)
  const p = parseScript('Hello [pause] world')
  const line = p.steps[0]
  expect(line.kind === 'line' && line.segments.map((s) => s.direction)).toEqual([false, true, false])
  expect(p.words).toBe(2)
})

test('empty and blank scripts have no steps', () => {
  expect(parseScript('').steps).toHaveLength(0)
  expect(parseScript('\n  \n\n').steps).toHaveLength(0)
})

test('windows line endings parse the same', () => {
  expect(parseScript('## A\r\n\r\nOne two.\r\n').words).toBe(2)
})

test('durations', () => {
  expect(parseDuration('1:30')).toBe(90)
  expect(parseDuration('1:02:03')).toBe(3723)
  expect(parseDuration('45')).toBe(45)
  expect(parseDuration('1:75')).toBeNull()
  expect(parseDuration('abc')).toBeNull()
})

test('auto-advance timing and clocks', () => {
  const p = parseScript('## S\n\none two three four five six')
  expect(stepMs(p.steps[0], 150)).toBe(1400)
  expect(stepMs(p.steps[1], 120)).toBe((6 / 120) * 60000 + 400)
  expect(formatClock(75)).toBe('1:15')
  expect(formatClock(3723)).toBe('1:02:03')
  expect(formatEstimate(80)).toBe('1 min 20 s')
})

test('the sample shows every part of the format at about 150 words', () => {
  const p = parseScript(SAMPLE_TEXT)
  expect(p.sections).toHaveLength(2)
  expect(p.words).toBeGreaterThan(120)
  expect(p.words).toBeLessThan(180)
  expect(p.steps.some((s) => s.kind === 'line' && s.cue)).toBe(true)
  expect(p.steps.some((s) => s.kind === 'line' && s.segments.some((g) => g.direction))).toBe(true)
})
