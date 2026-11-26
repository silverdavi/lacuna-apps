export type Emoji = {
  char: string
  name: string
  keywords?: string[]
}

export const EMOJIS: Emoji[] = [
  { char: '😀', name: 'Smiling face', keywords: ['smile', 'smiley', 'face', 'happy', 'joy'] },
  { char: '❤️', name: 'Red heart', keywords: ['heart', 'love', 'red'] },
  { char: '🎉', name: 'Party popper', keywords: ['party', 'popper', 'celebrate', 'confetti'] },
  { char: '⭐', name: 'Star', keywords: ['star', 'favorite', 'gold'] },
]
