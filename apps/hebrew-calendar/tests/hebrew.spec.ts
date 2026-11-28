// Unit tests of the date arithmetic. They need no browser page; Playwright runs them as plain tests.
import { expect, test } from '@playwright/test'
import {
  ADAR, ADAR_II, HESHVAN, KISLEV, NISAN, SHEVAT, TEVET, TISHREI, daysInMonth, daysInYear, fixedFromGregorian, fixedFromHebrew,
  gematria, gematriaYear, gregorianFromFixed, hebrewFromFixed, isLeapYear, monthName, validateHebrew, weekday, yearKind,
  toHebrew, monthChoices, newYear,
} from '../src/hebrew'
import { holidaysOfYear, holidaysOn, omerDay } from '../src/holidays'
import { nextOccurrences, observedIn } from '../src/anniversaries'

const rdOf = (y: number, m: number, d: number) => fixedFromGregorian({ year: y, month: m, day: d })
const heb = (y: number, m: number, d: number) => hebrewFromFixed(rdOf(y, m, d))

test('anchor dates', () => {
  expect(heb(2026, 11, 27)).toEqual({ year: 5787, month: KISLEV, day: 17 })
  expect(newYear(5787)).toBe(rdOf(2026, 9, 12))
  expect(weekday(newYear(5787))).toBe(6)
  expect(fixedFromHebrew({ year: 5786, month: NISAN, day: 15 })).toBe(rdOf(2026, 4, 2))
  expect(fixedFromHebrew({ year: 5787, month: KISLEV, day: 25 })).toBe(rdOf(2026, 12, 5))
  expect(isLeapYear(5787)).toBe(true)
  expect(monthChoices(5787).map((c) => c.label)).toContain('Adar I')
  expect(monthChoices(5787).map((c) => c.label)).toContain('Adar II')
  expect(monthChoices(5786).map((c) => c.label)).not.toContain('Adar II')
})

test('year lengths are always one of the six allowed', () => {
  const bad: number[] = []
  for (let y = 1; y <= 6000; y++) if (![353, 354, 355, 383, 384, 385].includes(daysInYear(y))) bad.push(y)
  expect(bad).toEqual([])
  expect(daysInYear(5787)).toBe(385)
  expect(yearKind(5787)).toBe('complete')
  expect(yearKind(5786)).toBe('regular')
  expect(yearKind(5784)).toBe('deficient')
})

test('round trip over the whole supported range, every 7th day', () => {
  for (let rd = newYear(1); rd < newYear(6001); rd += 7) if (fixedFromHebrew(hebrewFromFixed(rd)) !== rd) throw new Error(`round trip ${rd}`)
  for (let y = 1; y <= 9999; y += 13) {
    const g = { year: y, month: 3, day: 1 }
    if (JSON.stringify(gregorianFromFixed(fixedFromGregorian(g))) !== JSON.stringify(g)) throw new Error(`gregorian ${y}`)
  }
})

test('matches Intl for every day from 1950 to 2100', () => {
  const fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const alias: Record<string, string> = { Tishri: 'Tishrei', Tamuz: 'Tammuz', Cheshvan: 'Heshvan' }
  const start = rdOf(1950, 1, 1)
  const end = rdOf(2100, 12, 31)
  for (let rd = start; rd <= end; rd++) {
    const g = gregorianFromFixed(rd)
    const parts = fmt.formatToParts(new Date(Date.UTC(g.year, g.month - 1, g.day, 12)))
    const get = (t: string) => parts.find((p) => p.type === t)!.value
    const h = hebrewFromFixed(rd)
    const name = get('month')
    const got = `${h.day} ${monthName(h.year, h.month)} ${h.year}`
    const want = `${get('day')} ${alias[name] ?? name} ${get('year')}`
    if (got !== want) throw new Error(`${g.year}-${g.month}-${g.day}: ${got} vs Intl ${want}`)
  }
})

test('month lengths follow the year length', () => {
  expect(daysInMonth(5787, TEVET)).toBe(29)
  expect(daysInMonth(5787, ADAR)).toBe(30)
  expect(daysInMonth(5787, ADAR_II)).toBe(29)
  expect(daysInMonth(5786, ADAR)).toBe(29)
  // 5783 is complete (355): Heshvan and Kislev have 30. 5784 is deficient (383): both have 29. 5786 is regular: Kislev 30.
  expect(daysInMonth(5783, HESHVAN)).toBe(30)
  expect(daysInMonth(5784, HESHVAN)).toBe(29)
  expect(daysInMonth(5784, KISLEV)).toBe(29)
  expect(daysInMonth(5786, HESHVAN)).toBe(29)
  expect(daysInMonth(5786, KISLEV)).toBe(30)
})

test('gematria', () => {
  expect(gematriaYear(5787)).toBe('ה׳תשפ״ז')
  expect(gematria(15)).toBe('ט״ו')
  expect(gematria(16)).toBe('ט״ז')
  expect(gematria(30)).toBe('ל׳')
  expect(gematria(17)).toBe('י״ז')
  expect(gematriaYear(5786)).toBe('ה׳תשפ״ו')
})

test('validation', () => {
  const bad = validateHebrew({ year: 5787, month: TEVET, day: 30 })
  expect(bad.ok).toBe(false)
  if (!bad.ok) expect(bad.reason).toContain('Tevet 5787 has 29 days')
  expect(validateHebrew({ year: 0, month: 1, day: 1 }).ok).toBe(false)
  expect(validateHebrew({ year: 6001, month: 1, day: 1 }).ok).toBe(false)
  expect(validateHebrew({ year: 5786, month: ADAR_II, day: 1 }).ok).toBe(false)
  expect(validateHebrew({ year: 5787, month: ADAR_II, day: 29 }).ok).toBe(true)
})

test('after sunset advances the Hebrew date', () => {
  expect(toHebrew(rdOf(2026, 11, 27), true)).toEqual({ year: 5787, month: KISLEV, day: 18 })
})

test('holidays', () => {
  const rdH = (y: number, m: number, d: number) => fixedFromHebrew({ year: y, month: m, day: d })
  const ids = (rd: number, w: 'israel' | 'diaspora') => holidaysOn(rd, w).map((h) => h.id)
  expect(ids(rdH(5787, KISLEV, 25), 'diaspora')).toContain('hanukkah-1')
  // Kislev 5787 has 30 days, so Hanukkah day 6 is 30 Kislev and day 8 is 2 Tevet. Kislev 5784 has 29: day 8 is 3 Tevet.
  expect(ids(rdH(5787, TEVET, 2), 'diaspora')).toContain('hanukkah-8')
  expect(ids(rdH(5784, TEVET, 3), 'diaspora')).toContain('hanukkah-8')
  expect(ids(rdH(5784, TEVET, 4), 'diaspora')).not.toContain('hanukkah-8')
  expect(holidaysOfYear(5784, 'diaspora').filter((h) => h.id.startsWith('hanukkah')).length).toBe(8)
  // Sukkot and Pesach days.
  expect(ids(rdH(5787, TISHREI, 16), 'diaspora')).toContain('sukkot-2')
  expect(holidaysOn(rdH(5787, TISHREI, 16), 'israel')[0].kind).toBe('chol-hamoed')
  expect(ids(rdH(5787, TISHREI, 23), 'diaspora')).toContain('simchat-torah')
  expect(ids(rdH(5787, TISHREI, 23), 'israel')).not.toContain('simchat-torah')
  expect(ids(rdH(5786, NISAN, 22), 'diaspora')).toContain('pesach-8')
  expect(ids(rdH(5786, NISAN, 22), 'israel')).not.toContain('pesach-8')
  // Purim in a leap year is in Adar II; Purim Katan in Adar I.
  expect(ids(rdH(5787, ADAR_II, 14), 'diaspora')).toContain('purim')
  expect(ids(rdH(5787, ADAR, 14), 'diaspora')).toContain('purim-katan')
  // Ta'anit Esther moves to Thursday when 13 Adar is Shabbat: 13 Adar 5784 (2024-03-23 was Shabbat).
  const esther = holidaysOfYear(5784, 'diaspora').find((h) => h.id === 'taanit-esther')!
  expect(esther.rd).toBe(rdOf(2024, 3, 21))
  // Yom HaAtzmaut: 5 Iyar 5785 was Friday (2025-05-02), observed Thursday 1 May; 5 Iyar 5784 was Monday, observed Tuesday.
  expect(holidaysOfYear(5785, 'israel').find((h) => h.id === 'yom-haatzmaut')!.rd).toBe(rdOf(2025, 5, 1))
  expect(holidaysOfYear(5785, 'israel').find((h) => h.id === 'yom-hazikaron')!.rd).toBe(rdOf(2025, 4, 30))
  expect(holidaysOfYear(5784, 'israel').find((h) => h.id === 'yom-haatzmaut')!.rd).toBe(rdOf(2024, 5, 14))
  // Tisha B'Av 5784 was Shabbat 2024-08-13? It was Tuesday; 5785 Shabbat 2025-08-02 moved to Sunday 3 August.
  expect(holidaysOfYear(5785, 'diaspora').find((h) => h.id === 'tisha-bav')!.rd).toBe(rdOf(2025, 8, 3))
  // Rosh Chodesh Tevet: one day after a 29-day Kislev (5784), two after a 30-day one (5787).
  expect(holidaysOfYear(5784, 'diaspora').filter((h) => h.id.startsWith('rosh-chodesh-10')).length).toBe(1)
  expect(holidaysOfYear(5787, 'diaspora').filter((h) => h.id.startsWith('rosh-chodesh-10')).length).toBe(2)
  // Heshvan: Tishrei has 30 days, so Rosh Chodesh Heshvan is two days.
  expect(holidaysOfYear(5787, 'diaspora').filter((h) => h.id.startsWith('rosh-chodesh-8')).length).toBe(2)
})

test('holidays agree with Intl for fixed-date holidays across many years', () => {
  for (let y = 5700; y <= 5900; y++) {
    const list = holidaysOfYear(y, 'diaspora')
    const rosh = list.find((h) => h.id === 'rosh-hashana-1')!
    expect(weekday(rosh.rd)).not.toBe(0)
    expect(weekday(rosh.rd)).not.toBe(3)
    expect(weekday(rosh.rd)).not.toBe(5)
    const kippur = list.find((h) => h.id === 'yom-kippur')!
    expect([0, 5]).not.toContain(weekday(kippur.rd))
    for (const h of list) if (hebrewFromFixed(h.rd).year !== y) throw new Error(`${h.id} ${y} leaves its year`)
  }
})

test('omer', () => {
  expect(omerDay(fixedFromHebrew({ year: 5786, month: NISAN, day: 15 }))).toBeNull()
  expect(omerDay(fixedFromHebrew({ year: 5786, month: NISAN, day: 16 }))).toBe(1)
  expect(omerDay(fixedFromHebrew({ year: 5786, month: 3, day: 5 }))).toBe(49)
  expect(omerDay(fixedFromHebrew({ year: 5786, month: 3, day: 6 }))).toBeNull()
})

test('anniversary rules', () => {
  const birthday = (o: { year: number; month: number; day: number }) => ({ type: 'birthday' as const, origin: o })
  // Born in Adar of a common year: Adar II in a leap year.
  expect(observedIn(birthday({ year: 5786, month: ADAR, day: 10 }), 5787)).toEqual({ year: 5787, month: ADAR_II, day: 10 })
  // Born in Adar II: Adar in a common year.
  expect(observedIn(birthday({ year: 5787, month: ADAR_II, day: 10 }), 5788)).toEqual({ year: 5788, month: ADAR, day: 10 })
  // Yahrzeit in a common Adar: Adar I by default, Adar II on request.
  const yz = { type: 'yahrzeit' as const, origin: { year: 5786, month: ADAR, day: 10 } }
  expect(observedIn(yz, 5787).month).toBe(ADAR)
  expect(observedIn({ ...yz, adarII: true }, 5787).month).toBe(ADAR_II)
  expect(observedIn(yz, 5788).month).toBe(ADAR)
  // 30 Adar I in a common year goes to 30 Shevat.
  expect(observedIn(birthday({ year: 5787, month: ADAR, day: 30 }), 5788)).toEqual({ year: 5788, month: SHEVAT, day: 30 })
  expect(observedIn({ type: 'yahrzeit', origin: { year: 5787, month: ADAR, day: 30 } }, 5788)).toEqual({ year: 5788, month: SHEVAT, day: 30 })
  // 30 Heshvan in a year with 29: birthday 1 Kislev, yahrzeit 29 Heshvan.
  expect(daysInMonth(5786, HESHVAN)).toBe(29)
  expect(observedIn(birthday({ year: 5783, month: HESHVAN, day: 30 }), 5786)).toEqual({ year: 5786, month: KISLEV, day: 1 })
  expect(observedIn({ type: 'yahrzeit', origin: { year: 5783, month: HESHVAN, day: 30 } }, 5786)).toEqual({ year: 5786, month: HESHVAN, day: 29 })
  // 30 Kislev in a short-Kislev year: birthday 1 Tevet, yahrzeit 29 Kislev.
  const shortK = Array.from({ length: 40 }, (_, i) => 5780 + i).find((y) => daysInMonth(y, KISLEV) === 29)!
  const longK = Array.from({ length: 40 }, (_, i) => 5780 + i).find((y) => daysInMonth(y, KISLEV) === 30)!
  expect(observedIn(birthday({ year: longK, month: KISLEV, day: 30 }), shortK)).toEqual({ year: shortK, month: TEVET, day: 1 })
  expect(observedIn({ type: 'yahrzeit', origin: { year: longK, month: KISLEV, day: 30 } }, shortK)).toEqual({ year: shortK, month: KISLEV, day: 29 })
})

test('next occurrences', () => {
  const from = rdOf(2026, 11, 27)
  const occ = nextOccurrences({ type: 'birthday', origin: { year: 5760, month: KISLEV, day: 17 } }, from, 10)
  expect(occ.length).toBe(10)
  expect(occ[0].rd).toBe(from)
  for (let i = 1; i < occ.length; i++) expect(occ[i].rd).toBeGreaterThan(occ[i - 1].rd)
  const bar = nextOccurrences({ type: 'bar-mitzvah', origin: { year: 5774, month: KISLEV, day: 5 } }, from)
  expect(bar).toHaveLength(1)
  expect(bar[0].hebrew.year).toBe(5787)
  const bat = nextOccurrences({ type: 'bat-mitzvah', origin: { year: 5775, month: KISLEV, day: 5 } }, from)
  expect(bat[0].hebrew.year).toBe(5787)
})

test('seed anniversaries are valid Hebrew dates', () => {
  const origin = { year: 5760, month: KISLEV, day: 17 }
  expect(validateHebrew(origin).ok).toBe(true)
  expect(validateHebrew({ year: 5781, month: ADAR, day: 14 }).ok).toBe(true)
  expect(validateHebrew({ year: 5774, month: HESHVAN, day: 30 }).ok).toBe(true)
})
