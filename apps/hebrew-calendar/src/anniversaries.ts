// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Where a Hebrew birthday, yahrzeit or bar/bat mitzvah falls in later years, by the standard rules.
import {
  ADAR, ADAR_II, HESHVAN, KISLEV, SHEVAT, TEVET, MAX_YEAR,
  daysInMonth, fixedFromHebrew, isLeapYear, type HebrewDate,
} from './hebrew'

export type AnniversaryType = 'birthday' | 'yahrzeit' | 'bar-mitzvah' | 'bat-mitzvah'

export const TYPE_LABEL: Record<AnniversaryType, string> = {
  birthday: 'Birthday',
  yahrzeit: 'Yahrzeit',
  'bar-mitzvah': 'Bar mitzvah (13th)',
  'bat-mitzvah': 'Bat mitzvah (12th)',
}

export interface AnniversarySpec {
  type: AnniversaryType
  /** The Hebrew date of the birth or the death. */
  origin: HebrewDate
  /** Yahrzeit only: a death in a non-leap Adar is observed in Adar II in leap years instead of Adar I. */
  adarII?: boolean
}

/** The Hebrew date the observance falls on in year y, by the rules for a birthday (kind 'birthday') or a yahrzeit. */
export function observedIn(spec: AnniversarySpec, y: number): HebrewDate {
  const { origin } = spec
  const yahrzeit = spec.type === 'yahrzeit'
  const originLeap = isLeapYear(origin.year)
  const leap = isLeapYear(y)
  let m = origin.month
  let d = origin.day

  if (m === ADAR || m === ADAR_II) {
    if (!originLeap) {
      // Plain Adar of a common year.
      if (leap) m = yahrzeit && !spec.adarII ? ADAR : ADAR_II
    } else if (m === ADAR_II) {
      // Adar II of a leap year: Adar in a common year.
      if (!leap) m = ADAR
    } else if (!leap) {
      // Adar I of a leap year: Adar in a common year, and the 30th goes to 30 Shevat.
      if (d === 30) {
        m = SHEVAT
      }
    }
  }

  if (d === 30 && daysInMonth(y, m) < 30) {
    if (m === HESHVAN) {
      if (yahrzeit) d = 29
      else {
        m = KISLEV
        d = 1
      }
    } else if (m === KISLEV) {
      if (yahrzeit) d = 29
      else {
        m = TEVET
        d = 1
      }
    } else {
      d = daysInMonth(y, m)
    }
  }
  return { year: y, month: m, day: d }
}

export interface Occurrence {
  hebrew: HebrewDate
  rd: number
  /** Years since the origin year. */
  years: number
}

/** The next `count` occurrences on or after fromRd. Bar and bat mitzvah have one date, shown even when it has passed. */
export function nextOccurrences(spec: AnniversarySpec, fromRd: number, count = 10): Occurrence[] {
  const out: Occurrence[] = []
  const make = (y: number): Occurrence => {
    const hebrew = observedIn({ ...spec, type: spec.type === 'yahrzeit' ? 'yahrzeit' : 'birthday' }, y)
    return { hebrew, rd: fixedFromHebrew(hebrew), years: y - spec.origin.year }
  }
  if (spec.type === 'bar-mitzvah' || spec.type === 'bat-mitzvah') {
    const y = spec.origin.year + (spec.type === 'bar-mitzvah' ? 13 : 12)
    return y > MAX_YEAR ? [] : [make(y)]
  }
  for (let y = spec.origin.year + 1; y <= MAX_YEAR && out.length < count; y++) {
    const occ = make(y)
    if (occ.rd >= fromRd) out.push(occ)
  }
  return out
}
