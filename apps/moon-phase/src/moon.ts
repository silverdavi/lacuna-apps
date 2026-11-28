// Moon phase math, ported from the Lacuna firmware time utilities. Pure functions, no I/O.
// Mean elongation plus the largest periodic terms (Meeus, Astronomical Algorithms, ch. 48).
// Good to a fraction of a degree, which is under an hour of the Moon's motion.

const RAD = Math.PI / 180
const DAY_MS = 86400000
export const SYNODIC_MONTH = 29.530589

export function wrap360(a: number): number {
  const r = a % 360
  return r < 0 ? r + 360 : r
}

/** Elongation of the Moon from the Sun in degrees, 0 to 360. Input is UTC milliseconds. */
export function elongation(utcMs: number): number {
  const days = utcMs / DAY_MS - 10957.5 // since J2000.0
  const t = days / 36525
  const d = wrap360(297.8501921 + 445267.1114034 * t)
  const m = wrap360(357.5291092 + 35999.0502909 * t) * RAD
  const mp = wrap360(134.9633964 + 477198.8675055 * t) * RAD
  const dr = d * RAD
  const e =
    d +
    6.289 * Math.sin(mp) -
    2.1 * Math.sin(m) +
    1.274 * Math.sin(2 * dr - mp) +
    0.658 * Math.sin(2 * dr) +
    0.214 * Math.sin(2 * mp) +
    0.11 * Math.sin(dr)
  return wrap360(e)
}

export function illuminated(e: number): number {
  return (1 - Math.cos(e * RAD)) / 2
}

export const isWaxing = (e: number): boolean => e < 180

export function phaseName(e: number): string {
  if (e < 18 || e >= 342) return 'New Moon'
  if (e < 72) return 'Waxing Crescent'
  if (e < 108) return 'First Quarter'
  if (e < 162) return 'Waxing Gibbous'
  if (e < 198) return 'Full Moon'
  if (e < 252) return 'Waning Gibbous'
  if (e < 288) return 'Last Quarter'
  return 'Waning Crescent'
}

export function ageDays(e: number): number {
  return (e / 360) * SYNODIC_MONTH
}

export type EventKind = 0 | 1 | 2 | 3
export const EVENT_NAMES = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'] as const
export const EVENT_SHORT = ['New', '1st Q', 'Full', 'Last Q'] as const
export interface PhaseEvent {
  kind: EventKind
  ms: number
}

const HOUR_MS = 3600000
const MINUTE_MS = 60000

// Signed distance of e from a target angle, in (-180, 180].
const signed = (e: number, target: number): number => ((((e - target) % 360) + 540) % 360) - 180

/** Instant when elongation crosses `target`, bisected to the minute between lo and hi. */
function refine(lo: number, hi: number, target: number): number {
  let a = lo
  let b = hi
  while (b - a > MINUTE_MS) {
    const mid = a + Math.floor((b - a) / 2 / MINUTE_MS) * MINUTE_MS || a + MINUTE_MS
    if (signed(elongation(mid), target) < 0) a = mid
    else b = mid
  }
  return b
}

/** Principal phases strictly after `fromMs`, scanning in 1-hour steps, until `stop` says to quit. */
function scan(fromMs: number, stop: (found: PhaseEvent[], t: number) => boolean): PhaseEvent[] {
  const found: PhaseEvent[] = []
  let t = fromMs
  let prev = elongation(t)
  while (!stop(found, t)) {
    const next = t + HOUR_MS
    const cur = elongation(next)
    for (let k = 0; k < 4; k++) {
      const target = k * 90
      const a = signed(prev, target)
      const b = signed(cur, target)
      // Forward crossing only; a jump of more than 90 degrees is the wrap at +-180, not a crossing.
      if (a < 0 && b >= 0 && b - a < 90) {
        const ms = refine(t, next, target)
        if (ms > fromMs) found.push({ kind: k as EventKind, ms })
      }
    }
    t = next
    prev = cur
  }
  return found.sort((x, y) => x.ms - y.ms)
}

/** The next `perType` events of each of the four kinds after `fromMs`, in time order. */
export function nextEvents(fromMs: number, perType = 4): PhaseEvent[] {
  const count = [0, 0, 0, 0]
  const out = scan(fromMs, (found) => {
    count.fill(0)
    for (const f of found) count[f.kind]++
    return count.every((c) => c >= perType)
  })
  const kept = [0, 0, 0, 0]
  return out.filter((e) => ++kept[e.kind] <= perType)
}

/** All principal phases in [startMs, endMs). */
export function eventsBetween(startMs: number, endMs: number): PhaseEvent[] {
  return scan(startMs - 1, (_, t) => t >= endMs).filter((e) => e.ms >= startMs && e.ms < endMs)
}

/** First event of a kind after `fromMs`. */
export function nextOfKind(events: PhaseEvent[], kind: EventKind): PhaseEvent | undefined {
  return events.find((e) => e.kind === kind)
}

export interface DiscGeometry {
  /** SVG path of the lit region on a 100 by 100 viewBox centred at 50,50 with radius 50. */
  litPath: string
  /** True when the path is drawn mirrored (waning, or southern hemisphere view handled by caller). */
  mirrored: boolean
}

/** Lit region for elongation e. Drawn as for a waxing moon seen from the north; mirror when waning. */
export function discGeometry(e: number): DiscGeometry {
  const rx = Math.max(50 * Math.abs(Math.cos(e * RAD)), 0.001)
  const waxing = isWaxing(e)
  const crescent = Math.cos(e * RAD) > 0
  // Lit limb on the right, top to bottom; then the terminator back to the top.
  const sweep = crescent ? 0 : 1
  return { litPath: `M50 0 A50 50 0 0 1 50 100 A${rx.toFixed(3)} 50 0 0 ${sweep} 50 0 Z`, mirrored: !waxing }
}
