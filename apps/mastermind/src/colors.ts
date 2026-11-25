export const PEGS = ['Red', 'Blue', 'Green', 'Yellow'] as const

export type PegColor = (typeof PEGS)[number]

export const PEG_FILL: Record<PegColor, string> = {
  Red: 'var(--geo-verm)',
  Blue: 'var(--geo-cobalt)',
  Green: 'var(--geo-green)',
  Yellow: 'var(--geo-gold)',
}

export const MARKER_EXACT = 'var(--geo-cobalt)'
export const MARKER_PARTIAL = 'var(--geo-gold)'
