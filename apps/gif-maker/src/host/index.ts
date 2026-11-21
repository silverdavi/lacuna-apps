// The gif-project record: the last project's frame list and settings.
// Fictional fixture data only; nothing personal.

export interface GifFrame {
  name: string
}

export interface GifProject {
  frames: GifFrame[]
  delayMs: number
  width: number
  height: number
}

export const GIF_PROJECT_DEFAULT: GifProject = {
  frames: [],
  delayMs: 100,
  width: 800,
  height: 600,
}

export const SAMPLE_FRAMES: GifFrame[] = [
  { name: 'frame-1.png' },
  { name: 'frame-2.png' },
  { name: 'frame-3.png' },
]


