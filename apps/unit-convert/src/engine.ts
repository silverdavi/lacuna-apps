export type CategoryId = 'length' | 'mass' | 'volume' | 'temperature' | 'area'

export interface Unit {
  name: string
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

export interface Category {
  id: CategoryId
  label: string
  defaults: [string, string]
  units: Unit[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Length',
    defaults: ['Meters', 'Feet'],
    units: [
      { name: 'Meters', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Feet', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { name: 'Inches', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { name: 'Kilometers', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: 'Miles', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
    ],
  },
  {
    id: 'mass',
    label: 'Mass',
    defaults: ['Kilograms', 'Pounds'],
    units: [
      { name: 'Kilograms', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Pounds', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { name: 'Grams', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: 'Ounces', toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
      { name: 'Tonnes', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    defaults: ['Liters', 'Gallons'],
    units: [
      { name: 'Liters', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Gallons', toBase: (v) => v * 3.785411784, fromBase: (v) => v / 3.785411784 },
      { name: 'Milliliters', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: 'Cups', toBase: (v) => v * 0.2365882365, fromBase: (v) => v / 0.2365882365 },
      { name: 'Tablespoons', toBase: (v) => v * 0.01478676478, fromBase: (v) => v / 0.01478676478 },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    defaults: ['Celsius', 'Fahrenheit'],
    units: [
      { name: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Fahrenheit', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { name: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'area',
    label: 'Area',
    defaults: ['Square meters', 'Square feet'],
    units: [
      { name: 'Square meters', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Square feet', toBase: (v) => v * 0.09290304, fromBase: (v) => v / 0.09290304 },
      { name: 'Square kilometers', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { name: 'Acres', toBase: (v) => v * 4046.8564224, fromBase: (v) => v / 4046.8564224 },
      { name: 'Hectares', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
    ],
  },
]

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id)
export const CATEGORY_LABELS = CATEGORIES.map((c) => c.label)

export function categoryById(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export function unitOf(category: CategoryId, name: string): Unit {
  const cat = categoryById(category)
  const unit = cat.units.find((u) => u.name === name)
  if (!unit) throw new Error(`unknown unit ${name} in ${category}`)
  return unit
}

export interface ConversionInput {
  category: CategoryId
  fromUnit: string
  toUnit: string
  value: string
}

export interface ConversionOutput {
  ok: boolean
  error: string
  fromText: string
  toText: string
}

export function convert(input: ConversionInput): ConversionOutput {
  const cat = categoryById(input.category)
  const from = unitOf(input.category, input.fromUnit)
  const to = unitOf(input.category, input.toUnit)
  const trimmed = input.value.trim()
  if (!trimmed) return { ok: false, error: '', fromText: input.value, toText: '' }
  const n = Number(trimmed)
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'Enter a number', fromText: input.value, toText: '' }
  }
  const base = from.toBase(n)
  return { ok: true, error: '', fromText: format(n), toText: format(to.fromBase(base)) }
}

export function parseValue(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function format(value: number): string {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  const sign = value < 0 ? '-' : ''
  const p = Math.round(Math.abs(value) * 1e5) / 1e5
  let s = p.toString()
  if (s.includes('e')) s = Number(s).toString()
  if (s.includes('.') && !s.includes('e')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return sign + s
}

export interface SwapInput {
  category: CategoryId
  fromUnit: string
  toUnit: string
  fromText: string
  toText: string
}

export interface SwapOutput {
  fromUnit: string
  toUnit: string
  fromText: string
  toText: string
}

export function swapUnits(input: SwapInput): SwapOutput {
  const n = parseValue(input.fromText)
  let toText = ''
  if (n !== null) {
    const nextFrom = unitOf(input.category, input.toUnit)
    const nextTo = unitOf(input.category, input.fromUnit)
    toText = format(nextTo.fromBase(nextFrom.toBase(n)))
  }
  return {
    fromUnit: input.toUnit,
    toUnit: input.fromUnit,
    fromText: input.fromText,
    toText,
  }
}

export const MAX_RECENT = 10

export interface RecentRecord {
  id: string
  category: CategoryId
  fromUnit: string
  toUnit: string
  fromValue: string
  toValue: string
  at: number
}

export type NewRecent = Omit<RecentRecord, 'id' | 'at'>

export function addRecent(existing: RecentRecord[], record: NewRecent, id: string, at: number): RecentRecord[] {
  const keyOf = (r: RecentRecord) => [r.category, r.fromUnit, r.toUnit, r.fromValue, r.toValue].join('|')
  const fresh: RecentRecord = { ...record, id, at }
  const key = keyOf(fresh)
  const kept = existing.filter((r) => r.category === record.category && keyOf(r) !== key)
  return [fresh, ...kept, ...existing.filter((r) => r.category !== record.category)].slice(0, MAX_RECENT)
}

export interface RestoreInput {
  record: RecentRecord
}

export interface RestoreOutput {
  category: CategoryId
  fromUnit: string
  toUnit: string
  fromText: string
  toText: string
}

export function restoreRecord(input: RestoreInput): RestoreOutput {
  const r = input.record
  return { category: r.category, fromUnit: r.fromUnit, toUnit: r.toUnit, fromText: r.fromValue, toText: r.toValue }
}

export function recordText(record: RecentRecord): string {
  return `${record.fromValue} ${record.fromUnit} = ${record.toValue} ${record.toUnit}`
}
