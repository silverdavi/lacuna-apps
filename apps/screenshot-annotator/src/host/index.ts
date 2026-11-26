export interface TextLayer {
  kind: 'text'
  id: string
  content: string
  x: number
  y: number
}

export interface ShapeLayer {
  kind: 'shape'
  id: string
  shape: 'rectangle'
  x: number
  y: number
  w: number
  h: number
}

export type Layer = TextLayer | ShapeLayer

export interface AnnotationState {
  image: string | null
  imageName: string | null
  imageWidth: number
  imageHeight: number
  layers: Layer[]
  rotation: number
  flipped: boolean
}

export type { AnnotationState as Annotation }
export * from './mock'
