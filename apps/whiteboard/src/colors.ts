export const PAINT = {
  red: 'rgb(192, 57, 43)',
  blue: 'rgb(36, 86, 165)',
  green: 'rgb(58, 125, 68)',
  black: 'rgb(28, 27, 24)',
  paper: 'rgb(252, 251, 246)',
} as const

export const PAPER = PAINT.paper
export const WHITE = 'rgb(255, 255, 255)'

export type Paint = keyof typeof PAINT

export const COLOR_LABELS: Record<string, string> = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  black: 'Black',
  paper: 'Paper',
}

export function colorLabel(color: string): string {
  return COLOR_LABELS[color] ?? color
}

const SIZE_UNITS = [2, 4, 8, 10, 16, 24] as const

export const SIZES = SIZE_UNITS.map((n) => ({
  value: String(n),
  label: `${n}p` + 'x',
}))
