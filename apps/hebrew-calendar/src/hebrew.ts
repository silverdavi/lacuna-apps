// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// The fixed arithmetic Hebrew calendar (Dershowitz and Reingold, Calendrical Calculations).
// Pure functions, no DOM, no Intl. Days are fixed day numbers (RD): RD 1 is 1 January 1 CE
// Gregorian, and RD mod 7 is the weekday with 0 = Sunday.

export const HEBREW_EPOCH = -1373427
export const MIN_YEAR = 1
export const MAX_YEAR = 6000

/** Month numbers follow the Torah count: Nisan is 1, Tishrei is 7, Adar I is 12 and Adar II 13 in leap years. */
export const NISAN = 1
export const IYAR = 2
export const SIVAN = 3
export const TAMMUZ = 4
export const AV = 5
export const ELUL = 6
export const TISHREI = 7
export const HESHVAN = 8
export const KISLEV = 9
export const TEVET = 10
export const SHEVAT = 11
export const ADAR = 12
export const ADAR_II = 13

export interface HebrewDate {
  year: number
  month: number
  day: number
}

export interface GregorianDate {
  year: number
  month: number
  day: number
}

const mod = (a: number, b: number) => ((a % b) + b) % b

export function isLeapYear(y: number): boolean {
  return mod(7 * y + 1, 19) < 7
}

export function monthsInYear(y: number): number {
  return isLeapYear(y) ? 13 : 12
}

/** Months elapsed from the epoch to the start of year y (the molad count). */
export function monthsElapsed(y: number): number {
  return Math.floor((235 * y - 234) / 19)
}

/** The molad of Tishrei of year y, in parts since the epoch: [days, parts-of-day (of 25920)]. */
export function moladTishrei(y: number): { days: number; parts: number } {
  const months = monthsElapsed(y)
  const total = 12084 + 13753 * months
  return { days: 29 * months + Math.floor(total / 25920), parts: total % 25920 }
}

/** Days from the epoch to Rosh Hashana of y after the molad zaken and lo ADU Rosh delays (GaTaRaD, BeTUTaKPaT come in the correction). */
export function elapsedDays(y: number): number {
  const days = moladTishrei(y).days
  // Lo ADU Rosh: a Rosh Hashana may not fall on Sunday, Wednesday or Friday.
  return mod(3 * (days + 1), 7) < 3 ? days + 1 : days
}

function newYearCorrection(y: number): number {
  const ny0 = elapsedDays(y - 1)
  const ny1 = elapsedDays(y)
  const ny2 = elapsedDays(y + 1)
  if (ny2 - ny1 === 356) return 2 // GaTaRaD
  if (ny1 - ny0 === 382) return 1 // BeTUTaKPaT
  return 0
}

/** Fixed day of 1 Tishrei of year y. */
export function newYear(y: number): number {
  return HEBREW_EPOCH + elapsedDays(y) + newYearCorrection(y)
}

export function daysInYear(y: number): number {
  return newYear(y + 1) - newYear(y)
}

export type YearKind = 'deficient' | 'regular' | 'complete'

export function yearKind(y: number): YearKind {
  const r = daysInYear(y) % 10
  return r === 3 ? 'deficient' : r === 5 ? 'complete' : 'regular'
}

export function isLongHeshvan(y: number): boolean {
  return daysInYear(y) % 10 === 5
}

export function isShortKislev(y: number): boolean {
  return daysInYear(y) % 10 === 3
}

export function daysInMonth(y: number, m: number): number {
  if (m === IYAR || m === TAMMUZ || m === ELUL || m === TEVET || m === ADAR_II) return 29
  if (m === ADAR && !isLeapYear(y)) return 29
  if (m === HESHVAN && !isLongHeshvan(y)) return 29
  if (m === KISLEV && isShortKislev(y)) return 29
  return 30
}

/** Months of year y in calendar order, starting at Tishrei. */
export function monthOrder(y: number): number[] {
  const out: number[] = []
  const last = monthsInYear(y)
  for (let m = TISHREI; m <= last; m++) out.push(m)
  for (let m = NISAN; m < TISHREI; m++) out.push(m)
  return out
}

export function fixedFromHebrew(h: HebrewDate): number {
  let sum = newYear(h.year) + h.day - 1
  for (const m of monthOrder(h.year)) {
    if (m === h.month) break
    sum += daysInMonth(h.year, m)
  }
  return sum
}

export function hebrewFromFixed(rd: number): HebrewDate {
  let year = Math.floor(((rd - HEBREW_EPOCH) * 98496) / 35975351) + 1
  while (newYear(year) > rd) year--
  while (newYear(year + 1) <= rd) year++
  let left = rd - newYear(year)
  for (const m of monthOrder(year)) {
    const len = daysInMonth(year, m)
    if (left < len) return { year, month: m, day: left + 1 }
    left -= len
  }
  throw new Error('unreachable')
}

// ---- Gregorian ----

export function isGregorianLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/** Days from 1970-01-01 (proleptic Gregorian), valid for any year. */
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y
  const era = Math.floor(yy / 400)
  const yoe = yy - era * 400
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

const UNIX_EPOCH_RD = 719163

export function fixedFromGregorian(g: GregorianDate): number {
  return daysFromCivil(g.year, g.month, g.day) + UNIX_EPOCH_RD
}

export function gregorianFromFixed(rd: number): GregorianDate {
  const z = rd - UNIX_EPOCH_RD + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0)
  return { year, month, day }
}

export function gregorianDaysInMonth(y: number, m: number): number {
  return m === 2 ? (isGregorianLeap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(rd: number): number {
  return mod(rd, 7)
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function isoFromFixed(rd: number): string {
  const g = gregorianFromFixed(rd)
  return `${String(g.year).padStart(4, '0')}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`
}

export function fixedFromIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const g = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
  if (g.month < 1 || g.month > 12 || g.day < 1 || g.day > gregorianDaysInMonth(g.year, g.month)) return null
  return fixedFromGregorian(g)
}

// ---- validation ----

export type Validation = { ok: true } | { ok: false; reason: string }

export function validateHebrew(h: HebrewDate): Validation {
  if (!Number.isInteger(h.year) || !Number.isInteger(h.day) || !Number.isInteger(h.month)) {
    return { ok: false, reason: 'Enter a whole year and day.' }
  }
  if (h.year < MIN_YEAR || h.year > MAX_YEAR) {
    return { ok: false, reason: `Year ${h.year} is outside the supported range ${MIN_YEAR} to ${MAX_YEAR}.` }
  }
  if (h.month < 1 || h.month > monthsInYear(h.year) || (h.month === ADAR_II && !isLeapYear(h.year))) {
    return { ok: false, reason: `${h.year} is not a leap year, so it has no Adar I or Adar II.` }
  }
  if (h.day < 1) return { ok: false, reason: 'The day must be 1 or more.' }
  const len = daysInMonth(h.year, h.month)
  if (h.day > len) {
    return { ok: false, reason: `${monthName(h.year, h.month)} ${h.year} has ${len} days, so day ${h.day} does not exist.` }
  }
  return { ok: true }
}

export function gregorianInRange(rd: number): boolean {
  return rd >= newYear(MIN_YEAR) && rd < newYear(MAX_YEAR + 1)
}

// ---- names ----

const EN = ['', 'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul', 'Tishrei', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II']
const HE = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳']

export function monthName(y: number, m: number): string {
  if (m === ADAR && isLeapYear(y)) return 'Adar I'
  return EN[m]
}

export function monthNameHe(y: number, m: number): string {
  if (m === ADAR && isLeapYear(y)) return 'אדר א׳'
  return HE[m]
}

/** Month choices for a year, in calendar order. */
export function monthChoices(y: number): { value: number; label: string }[] {
  return monthOrder(y).map((m) => ({ value: m, label: monthName(y, m) }))
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת']
const GERESH = '׳'
const GERSHAYIM = '״'

function lettersFor(n: number): string {
  let out = ''
  let rest = n
  while (rest >= 400) {
    out += 'ת'
    rest -= 400
  }
  if (rest >= 100) {
    out += HUNDREDS[Math.floor(rest / 100)]
    rest %= 100
  }
  if (rest === 15) return out + 'טו'
  if (rest === 16) return out + 'טז'
  if (rest >= 10) {
    out += TENS[Math.floor(rest / 10)]
    rest %= 10
  }
  return out + ONES[rest]
}

function punctuate(letters: string): string {
  const chars = Array.from(letters)
  if (chars.length === 1) return letters + GERESH
  return chars.slice(0, -1).join('') + GERSHAYIM + chars[chars.length - 1]
}

/** Hebrew numeral for a day or a year below 1000, e.g. 15 -> ט״ו, 16 -> ט״ז. */
export function gematria(n: number): string {
  return punctuate(lettersFor(n))
}

/** Hebrew year with the thousands letter, e.g. 5787 -> ה׳תשפ״ז. */
export function gematriaYear(y: number): string {
  const thousands = Math.floor(y / 1000)
  const rest = y % 1000
  if (thousands === 0) return gematria(y)
  const head = ONES[thousands] + GERESH
  if (rest === 0) return head
  return head + punctuate(lettersFor(rest))
}

export function formatHebrew(h: HebrewDate): string {
  return `${h.day} ${monthName(h.year, h.month)} ${h.year}`
}

export function formatHebrewLetters(h: HebrewDate): string {
  return `${gematria(h.day)} ${monthNameHe(h.year, h.month)} ${gematriaYear(h.year)}`
}

// ---- conversion helpers ----

/** Hebrew date of a Gregorian date. After sunset the Hebrew day has already turned over. */
export function toHebrew(rd: number, afterSunset = false): HebrewDate {
  return hebrewFromFixed(afterSunset ? rd + 1 : rd)
}

export interface YearFacts {
  year: number
  leap: boolean
  days: number
  kind: YearKind
  months: number
  roshHashanaRd: number
  roshHashanaWeekday: number
  endRd: number
  heshvanDays: number
  kislevDays: number
}

export function yearFacts(y: number): YearFacts {
  const start = newYear(y)
  const days = newYear(y + 1) - start
  return {
    year: y,
    leap: isLeapYear(y),
    days,
    kind: yearKind(y),
    months: monthsInYear(y),
    roshHashanaRd: start,
    roshHashanaWeekday: weekday(start),
    endRd: start + days - 1,
    heshvanDays: daysInMonth(y, HESHVAN),
    kislevDays: daysInMonth(y, KISLEV),
  }
}
