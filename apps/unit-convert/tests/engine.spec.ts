import { expect, test } from '@playwright/test'
import {
  addRecent,
  categoryById,
  convert,
  format,
  parseValue,
  recordText,
  restoreRecord,
  swapUnits,
  type RecentRecord,
} from '../src/engine'

test('converts 1 meter to 3.28084 feet', () => {
  expect(convert({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', value: '1' })).toEqual({
    ok: true,
    error: '',
    fromText: '1',
    toText: '3.28084',
  })
})

test('converts 10 feet to 3.048 meters', () => {
  expect(convert({ category: 'length', fromUnit: 'Feet', toUnit: 'Meters', value: '10' })).toEqual({
    ok: true,
    error: '',
    fromText: '10',
    toText: '3.048',
  })
  expect(convert({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', value: '1.0' }).toText).toBe('3.28084')
  expect(convert({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', value: ' 1 ' }).toText).toBe('3.28084')
})

test('converts temperature across the freezing point', () => {
  expect(convert({ category: 'temperature', fromUnit: 'Celsius', toUnit: 'Fahrenheit', value: '100' }).toText).toBe('212')
  expect(convert({ category: 'temperature', fromUnit: 'Celsius', toUnit: 'Fahrenheit', value: '-40' }).toText).toBe('-40')
  expect(convert({ category: 'temperature', fromUnit: 'Fahrenheit', toUnit: 'Celsius', value: '32' }).toText).toBe('0')
})

test('rejects non-numeric input with an error and empty result', () => {
  const out = convert({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', value: 'abc' })
  expect(out).toEqual({ ok: false, error: 'Enter a number', fromText: 'abc', toText: '' })
  const empty = convert({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', value: '   ' })
  expect(empty).toEqual({ ok: false, error: '', fromText: '   ', toText: '' })
})

test('parses numeric text and rejects everything else', () => {
  expect(parseValue('42')).toBe(42)
  expect(parseValue(' -3.5 ')).toBe(-3.5)
  expect(parseValue('abc')).toBe(null)
  expect(parseValue('')).toBe(null)
  expect(parseValue('1.2.3')).toBe(null)
})

test('formats with at most five decimals and trims trailing zeros', () => {
  expect(format(0)).toBe('0')
  expect(format(1 / 0.3048)).toBe('3.28084')
  expect(format(0.3048)).toBe('0.3048')
  expect(format(3.048)).toBe('3.048')
  expect(format(-40)).toBe('-40')
  expect(format(Number.NaN)).toBe('')
  expect(format(Number.POSITIVE_INFINITY)).toBe('')
})

test('swaps units and recomputes the second field', () => {
  expect(swapUnits({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', fromText: '1', toText: '3.28084' })).toEqual({
    fromUnit: 'Feet',
    toUnit: 'Meters',
    fromText: '1',
    toText: '0.3048',
  })
  expect(swapUnits({ category: 'length', fromUnit: 'Feet', toUnit: 'Meters', fromText: '10', toText: '3.048' })).toEqual({
    fromUnit: 'Meters',
    toUnit: 'Feet',
    fromText: '10',
    toText: '32.8084',
  })
  expect(swapUnits({ category: 'length', fromUnit: 'Meters', toUnit: 'Feet', fromText: '', toText: '' })).toEqual({
    fromUnit: 'Feet',
    toUnit: 'Meters',
    fromText: '',
    toText: '',
  })
})

test('addRecent keeps the newest first, dedupes, and caps at ten', () => {
  const mk = (i: number, extra = {}): Omit<RecentRecord, 'id' | 'at'> => ({
    category: 'length',
    fromUnit: 'Meters',
    toUnit: 'Feet',
    fromValue: String(i),
    toValue: format(i / 0.3048),
    ...extra,
  })
  let list: RecentRecord[] = []
  for (let i = 1; i <= 11; i++) {
    list = addRecent(list, mk(i), `id-${i}`, i)
  }
  expect(list).toHaveLength(10)
  expect(list[0].fromValue).toBe('11')
  expect(list[0].toValue).toBe('36.08924')
  expect(list[1].fromValue).toBe('10')
  expect(list[9].fromValue).toBe('2')

  list = addRecent(list, mk(11), 'id-again', 12)
  expect(list).toHaveLength(10)
  expect(list.filter((r) => r.fromValue === '11')).toHaveLength(1)
  expect(list[0].id).toBe('id-again')

  const massRecord = { category: 'mass', fromUnit: 'Kilograms', toUnit: 'Pounds', fromValue: '1', toValue: '2.20462' } as Omit<RecentRecord, 'id' | 'at'>
  list = addRecent(list, massRecord, 'id-mass', 13)
  expect(list).toHaveLength(10)
  expect(list[0].category).toBe('mass')
  expect(list.some((r) => r.category === 'mass')).toBe(true)
})

test('restoring a record returns its category, units and values', () => {
  const record: RecentRecord = {
    id: 'r1',
    category: 'temperature',
    fromUnit: 'Celsius',
    toUnit: 'Fahrenheit',
    fromValue: '100',
    toValue: '212',
    at: 1,
  }
  expect(restoreRecord({ record })).toEqual({
    category: 'temperature',
    fromUnit: 'Celsius',
    toUnit: 'Fahrenheit',
    fromText: '100',
    toText: '212',
  })
  expect(recordText(record)).toBe('100 Celsius = 212 Fahrenheit')
})

test('category defaults match the labels in the tab bar', () => {
  expect(categoryById('length').defaults).toEqual(['Meters', 'Feet'])
  expect(categoryById('mass').defaults).toEqual(['Kilograms', 'Pounds'])
  expect(categoryById('volume').defaults).toEqual(['Liters', 'Gallons'])
  expect(categoryById('temperature').defaults).toEqual(['Celsius', 'Fahrenheit'])
  expect(categoryById('area').defaults).toEqual(['Square meters', 'Square feet'])
})
