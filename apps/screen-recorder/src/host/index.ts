export interface LibraryItem {
  id: string
  kind: 'screen' | 'frame'
  title: string
  durationMs: number
  filename: string
  mime: string
  dataUrl: string
  createdAt: number
}

export interface LibraryState {
  items: LibraryItem[]
}

export * from './mock'
