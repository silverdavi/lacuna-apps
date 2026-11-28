// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Holidays and observances by arithmetic only: no location, no times of day.
import {
  ADAR, ADAR_II, AV, IYAR, KISLEV, NISAN, SHEVAT, SIVAN, TAMMUZ, TEVET, TISHREI,
  daysInMonth, fixedFromHebrew, hebrewFromFixed, isLeapYear, monthName, monthOrder, weekday,
} from './hebrew'

export type HolidayKind = 'yom-tov' | 'chol-hamoed' | 'fast' | 'minor' | 'modern' | 'rosh-chodesh'

export interface Holiday {
  rd: number
  id: string
  name: string
  kind: HolidayKind
}

export type Where = 'israel' | 'diaspora'

const SUN = 0
const FRI = 5
const SAT = 6

const KIND_LABEL: Record<HolidayKind, string> = {
  'yom-tov': 'Yom tov',
  'chol-hamoed': 'Chol HaMoed',
  fast: 'Fast',
  minor: 'Minor',
  modern: 'Modern',
  'rosh-chodesh': 'Rosh Chodesh',
}
export const kindLabel = (k: HolidayKind) => KIND_LABEL[k]

/** Every observance whose Hebrew year is y, in date order. Cache by (year, where). */
export function holidaysOfYear(y: number, where: Where): Holiday[] {
  const il = where === 'israel'
  const out: Holiday[] = []
  const on = (m: number, d: number) => fixedFromHebrew({ year: y, month: m, day: d })
  const add = (rd: number, id: string, name: string, kind: HolidayKind) => out.push({ rd, id, name, kind })
  const leap = isLeapYear(y)
  const lastAdar = leap ? ADAR_II : ADAR

  // Tishrei
  add(on(TISHREI, 1), 'rosh-hashana-1', 'Rosh Hashana, day 1', 'yom-tov')
  add(on(TISHREI, 2), 'rosh-hashana-2', 'Rosh Hashana, day 2', 'yom-tov')
  let gedalia = on(TISHREI, 3)
  if (weekday(gedalia) === SAT) gedalia += 1
  add(gedalia, 'tzom-gedalia', 'Tzom Gedalia', 'fast')
  add(on(TISHREI, 10), 'yom-kippur', 'Yom Kippur', 'yom-tov')
  add(on(TISHREI, 15), 'sukkot-1', 'Sukkot, day 1', 'yom-tov')
  if (il) add(on(TISHREI, 16), 'sukkot-2', 'Chol HaMoed Sukkot', 'chol-hamoed')
  else add(on(TISHREI, 16), 'sukkot-2', 'Sukkot, day 2', 'yom-tov')
  for (let d = 17; d <= 20; d++) add(on(TISHREI, d), `sukkot-${d - 14}`, 'Chol HaMoed Sukkot', 'chol-hamoed')
  add(on(TISHREI, 21), 'hoshana-rabbah', 'Hoshana Rabbah', 'chol-hamoed')
  if (il) {
    add(on(TISHREI, 22), 'shemini-atzeret', 'Shemini Atzeret and Simchat Torah', 'yom-tov')
  } else {
    add(on(TISHREI, 22), 'shemini-atzeret', 'Shemini Atzeret', 'yom-tov')
    add(on(TISHREI, 23), 'simchat-torah', 'Simchat Torah', 'yom-tov')
  }

  // Hanukkah: 25 Kislev for eight days, which runs into Tevet.
  const han = on(KISLEV, 25)
  for (let i = 0; i < 8; i++) add(han + i, `hanukkah-${i + 1}`, `Hanukkah, day ${i + 1}`, 'minor')
  add(on(TEVET, 10), 'asara-btevet', "Asara B'Tevet", 'fast')
  add(on(SHEVAT, 15), 'tu-bishvat', 'Tu BiShvat', 'minor')

  // Adar
  if (leap) add(on(ADAR, 14), 'purim-katan', 'Purim Katan', 'minor')
  let esther = on(lastAdar, 13)
  if (weekday(esther) === SAT) esther -= 2
  add(esther, 'taanit-esther', "Ta'anit Esther", 'fast')
  add(on(lastAdar, 14), 'purim', 'Purim', 'minor')
  add(on(lastAdar, 15), 'shushan-purim', 'Shushan Purim', 'minor')

  // Nisan
  add(on(NISAN, 15), 'pesach-1', 'Pesach, day 1', 'yom-tov')
  if (il) add(on(NISAN, 16), 'pesach-2', 'Chol HaMoed Pesach', 'chol-hamoed')
  else add(on(NISAN, 16), 'pesach-2', 'Pesach, day 2', 'yom-tov')
  for (let d = 17; d <= 20; d++) add(on(NISAN, d), `pesach-${d - 14}`, 'Chol HaMoed Pesach', 'chol-hamoed')
  add(on(NISAN, 21), 'pesach-7', il ? 'Pesach, last day' : 'Pesach, day 7', 'yom-tov')
  if (!il) add(on(NISAN, 22), 'pesach-8', 'Pesach, day 8', 'yom-tov')
  let shoah = on(NISAN, 27)
  if (weekday(shoah) === FRI) shoah -= 1
  else if (weekday(shoah) === SUN) shoah += 1
  add(shoah, 'yom-hashoah', 'Yom HaShoah', 'modern')

  // Iyar: Zikaron the day before Atzmaut; moved off Friday and Shabbat, and Monday pushes Atzmaut to Tuesday.
  const fifth = on(IYAR, 5)
  let atzmaut = fifth
  const w = weekday(fifth)
  if (w === FRI) atzmaut = fifth - 1
  else if (w === SAT) atzmaut = fifth - 2
  else if (w === 1) atzmaut = fifth + 1
  add(atzmaut - 1, 'yom-hazikaron', 'Yom HaZikaron', 'modern')
  add(atzmaut, 'yom-haatzmaut', 'Yom HaAtzmaut', 'modern')
  add(on(IYAR, 18), 'lag-baomer', 'Lag BaOmer', 'minor')
  add(on(IYAR, 28), 'yom-yerushalayim', 'Yom Yerushalayim', 'modern')

  // Sivan
  add(on(SIVAN, 6), 'shavuot-1', il ? 'Shavuot' : 'Shavuot, day 1', 'yom-tov')
  if (!il) add(on(SIVAN, 7), 'shavuot-2', 'Shavuot, day 2', 'yom-tov')

  // Tammuz and Av
  let tammuz = on(TAMMUZ, 17)
  if (weekday(tammuz) === SAT) tammuz += 1
  add(tammuz, 'tzom-tammuz', 'Tzom Tammuz', 'fast')
  let tisha = on(AV, 9)
  if (weekday(tisha) === SAT) tisha += 1
  add(tisha, 'tisha-bav', "Tisha B'Av", 'fast')
  add(on(AV, 15), 'tu-bav', "Tu B'Av", 'minor')

  // Rosh Chodesh: the 1st of each month but Tishrei, and the 30th of a 30-day month before it.
  const order = monthOrder(y)
  order.forEach((m, i) => {
    if (m === TISHREI) return
    const prev = i === 0 ? null : order[i - 1]
    const first = on(m, 1)
    const name = `Rosh Chodesh ${monthName(y, m)}`
    if (prev !== null && daysInMonth(y, prev) === 30) add(first - 1, `rosh-chodesh-${m}-a`, name, 'rosh-chodesh')
    add(first, `rosh-chodesh-${m}`, name, 'rosh-chodesh')
  })

  return out.sort((a, b) => a.rd - b.rd)
}

const cache = new Map<string, Holiday[]>()
function yearList(y: number, where: Where): Holiday[] {
  const key = `${y}:${where}`
  let list = cache.get(key)
  if (!list) {
    list = y >= 1 && y <= 6000 ? holidaysOfYear(y, where) : []
    cache.set(key, list)
  }
  return list
}

/** Holidays on one fixed day. A day belongs to one Hebrew year, so one list is enough. */
export function holidaysOn(rd: number, where: Where): Holiday[] {
  const y = hebrewFromFixed(rd).year
  return yearList(y, where).filter((h) => h.rd === rd)
}

/** Holidays within [from, to] inclusive. */
export function holidaysBetween(from: number, to: number, where: Where): Holiday[] {
  const y0 = hebrewFromFixed(from).year
  const y1 = hebrewFromFixed(to).year
  const out: Holiday[] = []
  for (let y = y0; y <= y1; y++) for (const h of yearList(y, where)) if (h.rd >= from && h.rd <= to) out.push(h)
  return out
}

/** Holidays worth listing as "upcoming": everything except Rosh Chodesh and the middle days. */
export function isHeadline(h: Holiday): boolean {
  return h.kind !== 'rosh-chodesh' && h.kind !== 'chol-hamoed'
}

/**
 * Next holidays on or after rd. Multi-day holidays (Hanukkah, Sukkot, Pesach) are listed once, at
 * their first day, unless today falls inside them.
 */
export function upcoming(rd: number, where: Where, count: number): Holiday[] {
  const y = hebrewFromFixed(rd).year
  const out: Holiday[] = []
  for (let yy = y; yy <= y + 1 && out.length < count; yy++) {
    for (const h of yearList(yy, where)) {
      if (h.rd < rd || !isHeadline(h)) continue
      const dayN = /, day (\d+)$/.exec(h.name)
      if (dayN && Number(dayN[1]) > 1 && h.rd !== rd) continue
      if (h.id === 'pesach-7' || h.id === 'pesach-8') continue
      out.push(h)
      if (out.length >= count) break
    }
  }
  return out
}

/** Omer count for a day: day 1 is 16 Nisan, day 49 is 5 Sivan. */
export function omerDay(rd: number): number | null {
  const h = hebrewFromFixed(rd)
  const start = fixedFromHebrew({ year: h.year, month: NISAN, day: 16 })
  const n = rd - start + 1
  return n >= 1 && n <= 49 ? n : null
}
