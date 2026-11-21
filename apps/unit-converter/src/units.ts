export type Category = 'Length' | 'Mass' | 'Volume' | 'Temperature' | 'Area'

export const CATEGORIES: Category[] = ['Length', 'Mass', 'Volume', 'Temperature', 'Area']

const FT_TO_M = 0.3048
const IN_TO_M = 0.0254
const M_TO_MILES = 0.000621371192237334
const YD_TO_M = 0.9144

const G_TO_KG = 0.001
const LB_TO_KG = 0.45359237
const OZ_TO_KG = 0.028349523125
const TONNE_TO_KG = 1000

const ML_TO_L = 0.001
const GAL_TO_L = 3.785411784
const FLOZ_TO_L = 0.0295735295625
const QT_TO_L = 0.946352946

const FT2_TO_M2 = 0.09290304
const KM2_TO_M2 = 1000000
const HA_TO_M2 = 10000
const AC_TO_M2 = 4046.8564224

type Factor = { toBase: number; fromBase: number }

const FACTORS: Record<Exclude<Category, 'Temperature'>, Record<string, Factor>> = {
  Length: {
    Meters: { toBase: 1, fromBase: 1 },
    Feet: { toBase: FT_TO_M, fromBase: 1 / FT_TO_M },
    Inches: { toBase: IN_TO_M, fromBase: 1 / IN_TO_M },
    Miles: { toBase: 1609.344, fromBase: 1 / 1609.344 },
    Yards: { toBase: YD_TO_M, fromBase: 1 / YD_TO_M },
  },
  Mass: {
    Kilograms: { toBase: 1, fromBase: 1 },
    Grams: { toBase: G_TO_KG, fromBase: 1 / G_TO_KG },
    Pounds: { toBase: LB_TO_KG, fromBase: 1 / LB_TO_KG },
    Ounces: { toBase: OZ_TO_KG, fromBase: 1 / OZ_TO_KG },
    Tonnes: { toBase: TONNE_TO_KG, fromBase: 1 / TONNE_TO_KG },
  },
  Volume: {
    Liters: { toBase: 1, fromBase: 1 },
    Milliliters: { toBase: ML_TO_L, fromBase: 1 / ML_TO_L },
    Gallons: { toBase: GAL_TO_L, fromBase: 1 / GAL_TO_L },
    'Fluid Ounces': { toBase: FLOZ_TO_L, fromBase: 1 / FLOZ_TO_L },
    Quarts: { toBase: QT_TO_L, fromBase: 1 / QT_TO_L },
  },
  Area: {
    'Square Meters': { toBase: 1, fromBase: 1 },
    'Square Feet': { toBase: FT2_TO_M2, fromBase: 1 / FT2_TO_M2 },
    'Square Kilometers': { toBase: KM2_TO_M2, fromBase: 1 / KM2_TO_M2 },
    Hectares: { toBase: HA_TO_M2, fromBase: 1 / HA_TO_M2 },
    Acres: { toBase: AC_TO_M2, fromBase: 1 / AC_TO_M2 },
  },
}

export function convertValue(category: Category, fromUnit: string, toUnit: string, value: number): number {
  if (category === 'Temperature') {
    if (fromUnit === 'Celsius' && toUnit === 'Fahrenheit') return (value * 9) / 5 + 32
    if (fromUnit === 'Fahrenheit' && toUnit === 'Celsius') return ((value - 32) * 5) / 9
    return value
  }
  const table = FACTORS[category]
  const from = table[fromUnit] ?? { toBase: 1, fromBase: 1 }
  const to = table[toUnit] ?? { toBase: 1, fromBase: 1 }
  return value * from.toBase * to.fromBase
}

export function unitsFor(category: Category): string[] {
  switch (category) {
    case 'Length':
      return ['Meters', 'Feet', 'Inches', 'Miles', 'Yards']
    case 'Mass':
      return ['Kilograms', 'Grams', 'Pounds', 'Ounces', 'Tonnes']
    case 'Volume':
      return ['Liters', 'Milliliters', 'Gallons', 'Fluid Ounces', 'Quarts']
    case 'Temperature':
      return ['Celsius', 'Fahrenheit']
    case 'Area':
      return ['Square Meters', 'Square Feet', 'Square Kilometers', 'Hectares', 'Acres']
  }
}

const DEFAULTS: Record<Category, [string, string]> = {
  Length: ['Meters', 'Feet'],
  Mass: ['Kilograms', 'Pounds'],
  Volume: ['Liters', 'Gallons'],
  Temperature: ['Celsius', 'Fahrenheit'],
  Area: ['Square Meters', 'Square Feet'],
}

export function defaultUnits(category: Category): [string, string] {
  return DEFAULTS[category]
}

export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return ''
  const rounded = Number.parseFloat(value.toFixed(5))
  return String(rounded)
}
