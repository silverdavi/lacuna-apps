// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type SubtitleFormat = 'srt' | 'vtt' | 'ass' | 'sbv' | 'txt' | 'json'

export interface Cue {
  startMs: number
  endMs: number
  text: string
}

export const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,800
<i>Welcome to the offline</i>
subtitle converter.

2
00:00:04,200 --> 00:00:07,500
Shift timestamps or convert to
WebVTT, ASS, SBV, or JSON.

3
00:00:08,000 --> 00:00:11,250
Everything stays on your device.
`

function parseTimestampToMs(raw: string): number {
  const s = raw.trim().replace(',', '.')
  const parts = s.split(':')
  let h = 0
  let m = 0
  let sec = 0
  if (parts.length === 3) {
    h = Number(parts[0])
    m = Number(parts[1])
    sec = Number(parts[2])
  } else if (parts.length === 2) {
    m = Number(parts[0])
    sec = Number(parts[1])
  }
  return Math.max(0, Math.round((h * 3600 + m * 60 + sec) * 1000))
}

function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0')
}

function pad3(n: number): string {
  return String(Math.floor(n)).padStart(3, '0')
}

function formatMs(ms: number, sep: ',' | '.'): string {
  const clamped = Math.max(0, Math.round(ms))
  const h = Math.floor(clamped / 3600000)
  const m = Math.floor((clamped % 3600000) / 60000)
  const s = Math.floor((clamped % 60000) / 1000)
  const rem = clamped % 1000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}${sep}${pad3(rem)}`
}

function formatAssMs(ms: number): string {
  const clamped = Math.max(0, Math.round(ms))
  const h = Math.floor(clamped / 3600000)
  const m = Math.floor((clamped % 3600000) / 60000)
  const s = Math.floor((clamped % 60000) / 1000)
  const cs = Math.floor((clamped % 1000) / 10)
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`
}

export function parseSubtitles(input: string): Cue[] {
  const text = input.replace(/\r\n/g, '\n').trim()
  if (!text) return []

  // JSON array of cues
  if (text.startsWith('[')) {
    const parsed = JSON.parse(text) as Array<{ startMs: number; endMs: number; text: string }>
    return parsed.map((c) => ({
      startMs: Number(c.startMs) || 0,
      endMs: Number(c.endMs) || 0,
      text: String(c.text ?? ''),
    }))
  }

  // ASS / SSA dialogue lines
  if (text.includes('[Events]') || text.includes('Dialogue:')) {
    const cues: Cue[] = []
    for (const line of text.split('\n')) {
      if (!line.startsWith('Dialogue:')) continue
      const parts = line.slice(9).split(',')
      if (parts.length < 10) continue
      const startMs = parseTimestampToMs(parts[1]!)
      const endMs = parseTimestampToMs(parts[2]!)
      const body = parts.slice(9).join(',').replace(/\\N/g, '\n').trim()
      cues.push({ startMs, endMs, text: body })
    }
    return cues
  }

  // SRT / WebVTT / SBV blocks
  const blocks = text.replace(/^WEBVTT[^\n]*\n*/i, '').split(/\n{2,}/)
  const cues: Cue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0)
    if (lines.length === 0) continue

    const arrowIdx = lines.findIndex((l) => l.includes('-->'))
    if (arrowIdx >= 0) {
      const [rawStart, rawEnd] = lines[arrowIdx]!.split('-->')
      const startMs = parseTimestampToMs(rawStart ?? '0:00')
      const endMs = parseTimestampToMs((rawEnd ?? '0:00').trim().split(/\s+/)[0] ?? '0:00')
      const body = lines.slice(arrowIdx + 1).join('\n').trim()
      cues.push({ startMs, endMs, text: body })
      continue
    }

    // SBV format: 0:00:01.000,0:00:03.800
    if (/^\d+:\d{2}:\d{2}\.\d+,\d+:\d{2}:\d{2}\.\d+$/.test(lines[0]!)) {
      const [rawStart, rawEnd] = lines[0]!.split(',')
      cues.push({
        startMs: parseTimestampToMs(rawStart!),
        endMs: parseTimestampToMs(rawEnd!),
        text: lines.slice(1).join('\n').trim(),
      })
    }
  }
  return cues
}

export function transformCues(
  cues: Cue[],
  opts: { offsetMs: number; rateMultiplier: number; stripTags: boolean },
): Cue[] {
  return cues.map((c) => {
    const startMs = Math.max(0, Math.round(c.startMs * opts.rateMultiplier + opts.offsetMs))
    const endMs = Math.max(startMs + 50, Math.round(c.endMs * opts.rateMultiplier + opts.offsetMs))
    let text = c.text
    if (opts.stripTags) {
      text = text.replace(/<[^>]+>/g, '').replace(/\{\\[^}]+\}/g, '')
    }
    return { startMs, endMs, text }
  })
}

export function serializeSubtitles(cues: Cue[], format: SubtitleFormat): string {
  if (format === 'srt') {
    return cues
      .map((c, i) => `${i + 1}\n${formatMs(c.startMs, ',')} --> ${formatMs(c.endMs, ',')}\n${c.text}`)
      .join('\n\n')
  }
  if (format === 'vtt') {
    const body = cues
      .map((c) => `${formatMs(c.startMs, '.')} --> ${formatMs(c.endMs, '.')}\n${c.text}`)
      .join('\n\n')
    return `WEBVTT\n\n${body}`
  }
  if (format === 'sbv') {
    return cues
      .map((c) => `${formatMs(c.startMs, '.')},${formatMs(c.endMs, '.')}\n${c.text}`)
      .join('\n\n')
  }
  if (format === 'ass') {
    const header = [
      '[Script Info]',
      'ScriptType: v4.00+',
      'PlayResX: 1280',
      'PlayResY: 720',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      'Style: Default,Arial,36,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,20,20,20,1',
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ]
    const lines = cues.map(
      (c) =>
        `Dialogue: 0,${formatAssMs(c.startMs)},${formatAssMs(c.endMs)},Default,,0,0,0,,${c.text.replace(/\n/g, '\\N')}`,
    )
    return [...header, ...lines].join('\n')
  }
  if (format === 'json') {
    return JSON.stringify(cues, null, 2)
  }
  return cues.map((c) => c.text).join('\n\n')
}
