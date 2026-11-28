// Parses the Custom screen's text: one "WORD - clue" or "WORD: clue" per line.
import { CUSTOM_MIN_WORDS } from './generate.ts'
import type { Entry } from './generate.ts'

export interface Parsed {
  entries: Entry[]
  errors: { line: number; text: string; message: string }[]
  enough: boolean
}

const LINE = /^\s*([^\s:\-–—]+)\s*(?:[:\-–—])\s*(.*?)\s*$/

export function parseCustom(text: string): Parsed {
  const entries: Entry[] = []
  const errors: Parsed['errors'] = []
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return
    const m = LINE.exec(raw)
    const fail = (message: string) => errors.push({ line: i + 1, text: raw.trim(), message })
    if (!m) return fail('Write it as WORD - clue.')
    const answer = m[1].toUpperCase()
    const clue = m[2]
    if (!/^[A-Z]+$/.test(answer)) return fail('The word may use the letters A to Z only.')
    if (answer.length < 3 || answer.length > 13) return fail('The word needs 3 to 13 letters.')
    if (!clue) return fail('Add a clue after the dash.')
    if (clue.length > 120) return fail('Keep the clue under 120 characters.')
    if (seen.has(answer)) return fail(`${answer} is already on an earlier line.`)
    seen.add(answer)
    entries.push({ answer, clue })
  })
  return { entries, errors, enough: entries.length >= CUSTOM_MIN_WORDS }
}

export const EXAMPLE = `PLANET - World that circles a star
ORBIT - Path of a moon around its planet
TELESCOPE - Instrument for viewing distant stars
COMET - Icy visitor with a glowing tail
GALAXY - Island of billions of stars
LUNAR - Of the moon
ECLIPSE - Shadow play between sun and moon
METEOR - Streak of light in the night sky
NEBULA - Cloud where stars are born
SATELLITE - Object that circles a planet`
