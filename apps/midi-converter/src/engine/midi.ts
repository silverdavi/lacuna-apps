// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface NoteEvent {
  name: string
  midi: number
  beats: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SHARP = String.fromCharCode(35)

export const SAMPLE_MELODY = 'C4:1 E4:1 G4:1 C5:2 G4:1 E4:1 C4:2'

export function parseNoteToken(token: string): NoteEvent | null {
  const m = token.trim().match(/^([A-Ga-g])(#|b)?(\d)(?::([\d.]+))?$/)
  if (!m) return null
  const letter = m[1]!.toUpperCase()
  const acc = m[2] ?? ''
  const oct = Number(m[3])
  const beats = Math.max(0.25, Number(m[4] ?? '1') || 1)
  const baseIdx = NOTE_NAMES.indexOf(letter)
  if (baseIdx < 0) return null
  const semis = baseIdx + (acc === SHARP ? 1 : acc === 'b' ? -1 : 0)
  const midi = Math.max(0, Math.min(127, (oct + 1) * 12 + semis))
  return { name: `${letter}${acc}${oct}`, midi, beats }
}

export function parseMelody(text: string): NoteEvent[] {
  return text
    .trim()
    .split(/[\s,]+/)
    .map(parseNoteToken)
    .filter((n): n is NoteEvent => n !== null)
}

function encodeVlq(val: number): number[] {
  let v = Math.max(0, Math.floor(val))
  const bytes = [v & 0x7f]
  v >>= 7
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
    v >>= 7
  }
  return bytes
}

export function buildStandardMidi(notes: NoteEvent[], bpm: number): Uint8Array {
  const ppq = 480
  const usPerBeat = Math.round(60_000_000 / Math.max(30, Math.min(300, bpm)))
  const track: number[] = []

  // Set Tempo Meta Event
  track.push(0x00, 0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff)

  for (const n of notes) {
    const ticks = Math.round(n.beats * ppq)
    track.push(...encodeVlq(0), 0x90, n.midi & 0x7f, 0x64) // Note On
    track.push(...encodeVlq(ticks), 0x80, n.midi & 0x7f, 0x00) // Note Off
  }

  // End of Track
  track.push(0x00, 0xff, 0x2f, 0x00)

  const header = [
    0x4d, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x00, // Format 0
    0x00, 0x01, // 1 track
    (ppq >> 8) & 0xff, ppq & 0xff,
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (track.length >> 24) & 0xff,
    (track.length >> 16) & 0xff,
    (track.length >> 8) & 0xff,
    track.length & 0xff,
  ]
  return new Uint8Array([...header, ...track])
}

export function notesToAbc(notes: NoteEvent[], bpm: number): string {
  const body = notes
    .map((n) => {
      const m = n.name.match(/^([A-G])(#|b)?(\d)$/)
      if (!m) return 'C'
      const letter = Number(m[3]) >= 5 ? m[1]!.toLowerCase() : m[1]!
      const acc = m[2] === SHARP ? '^' : m[2] === 'b' ? '_' : ''
      const dur = n.beats === 1 ? '' : String(Math.round(n.beats * 2) / 2)
      return `${acc}${letter}${dur}`
    })
    .join(' ')
  return `X:1\nT:Lacuna Melody\nM:4/4\nL:1/4\nQ:1/4=${bpm}\nK:C\n${body} |]\n`
}

export function synthNotesToWav(notes: NoteEvent[], bpm: number): Blob {
  const sr = 22050
  const secPerBeat = 60 / Math.max(30, Math.min(300, bpm))
  const totalSec = notes.reduce((s, n) => s + n.beats * secPerBeat, 0) + 0.1
  const totalSamples = Math.max(1, Math.floor(totalSec * sr))
  const pcm = new Float32Array(totalSamples)

  let cursor = 0
  for (const n of notes) {
    const freq = 440 * Math.pow(2, (n.midi - 69) / 12)
    const durSamples = Math.floor(n.beats * secPerBeat * sr)
    for (let i = 0; i < durSamples && cursor + i < totalSamples; i++) {
      const t = i / sr
      const env = Math.min(1, i / 250) * Math.max(0, 1 - i / durSamples)
      pcm[cursor + i] = (Math.sin(2 * Math.PI * freq * t) * 0.55 + Math.sin(4 * Math.PI * freq * t) * 0.15) * env
    }
    cursor += durSamples
  }

  const dataSize = totalSamples * 2
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  w(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  w(36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]!))
    view.setInt16(offset, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true)
    offset += 2
  }
  return new Blob([buf], { type: 'audio/wav' })
}
