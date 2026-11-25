export type GradientKind = 'linear' | 'radial'

export interface GradientStop {
  color: string
  position: number
}

export interface SavedGradient {
  id: string
  name: string
  kind: GradientKind
  angle: number
  stops: GradientStop[]
}
