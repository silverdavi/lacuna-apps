import test from 'node:test'
import assert from 'node:assert/strict'
import { ageDays, discGeometry, elongation, eventsBetween, illuminated, nextEvents, phaseName, wrap360 } from '../src/moon.ts'

const HOUR = 3600000

test('wrap360 folds into 0..360', () => {
  assert.equal(wrap360(-10), 350)
  assert.equal(wrap360(725), 5)
})

test('new moon of 2024-04-08 is found within 2 hours', () => {
  const found = nextEvents(Date.UTC(2024, 3, 1), 1).find((e) => e.kind === 0)
  assert.ok(found)
  assert.ok(Math.abs(found.ms - Date.UTC(2024, 3, 8, 18, 21)) < 2 * HOUR, new Date(found.ms).toISOString())
})

test('full moon of 2024-04-23 is found within 2 hours', () => {
  const found = nextEvents(Date.UTC(2024, 3, 15), 1).find((e) => e.kind === 2)
  assert.ok(found)
  assert.ok(Math.abs(found.ms - Date.UTC(2024, 3, 23, 23, 49)) < 2 * HOUR, new Date(found.ms).toISOString())
})

test('noon UTC on 2024-04-08 is under 2 percent lit', () => {
  const e = elongation(Date.UTC(2024, 3, 8, 12))
  assert.ok(illuminated(e) < 0.02, String(illuminated(e)))
  assert.equal(phaseName(e), 'New Moon')
})

test('phase names follow the elongation bands', () => {
  const names = [0, 45, 90, 135, 180, 225, 270, 315, 350].map(phaseName)
  assert.deepEqual(names, [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon',
    'Waning Gibbous', 'Last Quarter', 'Waning Crescent', 'New Moon',
  ])
})

test('age is elongation over 360 of the synodic month', () => {
  assert.ok(Math.abs(ageDays(180) - 14.7652945) < 1e-6)
})

test('next 4 of each kind come back in time order, each after the start', () => {
  const start = Date.UTC(2025, 0, 10)
  const ev = nextEvents(start, 4)
  assert.equal(ev.length, 16)
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].ms >= ev[i - 1].ms)
  assert.ok(ev[0].ms > start)
  for (const k of [0, 1, 2, 3]) assert.equal(ev.filter((e) => e.kind === k).length, 4)
})

test('a month holds one or two of each kind and quarters alternate', () => {
  const ev = eventsBetween(Date.UTC(2024, 3, 1), Date.UTC(2024, 4, 1))
  assert.ok(ev.length >= 4 && ev.length <= 5)
  for (let i = 1; i < ev.length; i++) assert.equal(ev[i].kind, (ev[i - 1].kind + 1) % 4)
})

test('disc ellipse x-radius follows |cos e|', () => {
  assert.match(discGeometry(90).litPath, /A0\.001 50/)
  assert.match(discGeometry(180).litPath, /A50\.000 50/)
  assert.equal(discGeometry(90).mirrored, false)
  assert.equal(discGeometry(270).mirrored, true)
})
