export interface SlideDeckRecord {
  text: string
}

export const DECK_RECORD_KEY = 'lacuna.markdown-slides.deck'
export const DECK_RECORD_VERSION = 1

export const DEFAULT_DECK: SlideDeckRecord = {
  text: '# Welcome\n\nThis is a demo slide.'
}
