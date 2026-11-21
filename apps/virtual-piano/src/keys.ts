// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
let handler: ((note: string) => void) | null = null

export function setKeyHandler(fn: (note: string) => void) {
  handler = fn
}

const KEY_NOTES: Record<string, string> = {
  c: 'C4',
  d: 'D4',
  e: 'E4',
  f: 'F4',
  g: 'G4',
  a: 'A4',
  b: 'B4',
}

export function attachKeydown() {
  function onKey(event: KeyboardEvent) {
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return
    if (handler === null) return
    const note = KEY_NOTES[event.key.toLowerCase()]
    if (note) handler(note)
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}
