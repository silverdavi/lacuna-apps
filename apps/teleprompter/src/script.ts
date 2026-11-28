// Script format: plain text.
//   blank line        ends a paragraph; each paragraph is one line item
//   ## Title `1:30`  starts a section, with an optional target duration in backticks
//   > text            a cue, shown small under the next line
//   [text]            a stage direction: dim, and never counted as words
// Text with no markers is a single section.

export interface Segment {
  text: string
  direction: boolean
}

export interface LineItem {
  kind: 'line'
  /** 1-based number among lines, for the ids toggle. */
  n: number
  section: number
  text: string
  segments: Segment[]
  words: number
  cue: string
}

export interface SectionItem {
  kind: 'section'
  section: number
  title: string
  /** Target duration in seconds, or null. */
  target: number | null
}

export type Step = LineItem | SectionItem

export interface Section {
  title: string
  target: number | null
  /** Index in steps of the first step of this section. */
  start: number
  /** Number of steps in this section, including its title card. */
  count: number
  words: number
}

export interface Parsed {
  steps: Step[]
  sections: Section[]
  words: number
  lines: number
}

const DIRECTION = /\[[^\]]*\]/g

export function segmentsOf(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(DIRECTION)) {
    const at = m.index ?? 0
    if (at > last) out.push({ text: text.slice(last, at), direction: false })
    out.push({ text: m[0], direction: true })
    last = at + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), direction: false })
  return out
}

export function countWords(text: string): number {
  const bare = text.replace(DIRECTION, ' ').trim()
  return bare ? bare.split(/\s+/).length : 0
}

/** "1:30" -> 90, "1:02:03" -> 3723, "45" -> 45. Null when it is not a duration. */
export function parseDuration(text: string): number | null {
  const m = /^(?:(\d+):)?(\d{1,3}):(\d{2})$|^(\d+)$/.exec(text.trim())
  if (!m) return null
  if (m[4] !== undefined) return Number(m[4])
  const sec = Number(m[3])
  if (sec > 59) return null
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + sec
}

export function parseScript(text: string): Parsed {
  const steps: Step[] = []
  const sections: Section[] = []
  let section = -1
  let para: string[] = []
  let cues: string[] = []
  let lineNo = 0

  const open = (title: string, target: number | null, card: boolean) => {
    section = sections.length
    sections.push({ title, target, start: steps.length, count: 0, words: 0 })
    if (card) steps.push({ kind: 'section', section, title, target })
  }
  const flush = () => {
    if (!para.length) return
    if (section < 0) open('', null, false)
    const joined = para.join(' ').replace(/\s+/g, ' ').trim()
    para = []
    const words = countWords(joined)
    steps.push({ kind: 'line', n: ++lineNo, section, text: joined, segments: segmentsOf(joined), words, cue: cues.join(' ') })
    cues = []
  }

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const head = /^##\s+(.*)$/.exec(line)
    if (head) {
      flush()
      let title = head[1]
      let target: number | null = null
      const t = /`([^`]*)`\s*$/.exec(title)
      if (t) {
        target = parseDuration(t[1])
        if (target !== null) title = title.slice(0, t.index)
      }
      open(title.trim() || 'Section', target, true)
      continue
    }
    const cue = /^>\s?(.*)$/.exec(line)
    if (cue) {
      flush()
      if (cue[1].trim()) cues.push(cue[1].trim())
      continue
    }
    para.push(line)
  }
  flush()
  // A cue with nothing after it rides on the last line.
  if (cues.length) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i]
      if (s.kind === 'line') {
        s.cue = [s.cue, ...cues].filter(Boolean).join(' ')
        break
      }
    }
  }

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    const sec = sections[s.section]
    sec.count++
    if (s.kind === 'line') sec.words += s.words
  }
  return { steps, sections, words: sections.reduce((n, s) => n + s.words, 0), lines: lineNo }
}

/** Seconds to read this many words at a pace. */
export function readSeconds(words: number, wpm: number): number {
  return wpm > 0 ? (words / wpm) * 60 : 0
}

/** How long auto-advance stays on a step: words / wpm plus a 400 ms beat; a section card holds 1400 ms. */
export function stepMs(step: Step, wpm: number): number {
  return step.kind === 'section' ? 1400 : (step.words / wpm) * 60000 + 400
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`
}

/** Short read time such as "1 min 20 s". */
export function formatEstimate(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m} min ${r} s` : `${m} min`
}
