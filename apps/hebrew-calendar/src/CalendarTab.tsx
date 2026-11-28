// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useMemo, useState } from 'react'
import { Actions, Body, Button, Card, Pills, Stack, Tag } from '@lacuna/ui'
import {
  WEEKDAYS, daysInMonth, fixedFromGregorian, fixedFromHebrew, gematria, gematriaYear, gregorianDaysInMonth,
  gregorianFromFixed, hebrewFromFixed, monthName, monthNameHe, newYear, MIN_YEAR, MAX_YEAR, weekday,
} from './hebrew'
import { holidaysBetween, kindLabel, type Holiday, type Where } from './holidays'
import { Heb, MONTHS_EN, longDate, shortDate } from './shared'

type View = 'Hebrew month' | 'Gregorian month'
const VIEWS: View[] = ['Hebrew month', 'Gregorian month']

/** First and last fixed day of the month containing rd. */
function monthSpan(rd: number, view: View): [number, number] {
  if (view === 'Hebrew month') {
    const h = hebrewFromFixed(rd)
    const first = fixedFromHebrew({ ...h, day: 1 })
    return [first, first + daysInMonth(h.year, h.month) - 1]
  }
  const g = gregorianFromFixed(rd)
  const first = fixedFromGregorian({ ...g, day: 1 })
  return [first, first + gregorianDaysInMonth(g.year, g.month) - 1]
}

/** Short cell label: "Hanukkah, day 3" becomes "Hanukkah 3", "Rosh Chodesh Tevet" becomes "Rosh Chodesh". */
const SHORT = (n: string) => n.replace(/, day (\d+)$/, ' $1').replace(/^(Rosh Chodesh) .+$/, '$1')

export function CalendarTab({ today, where }: { today: number; where: Where }) {
  const [view, setView] = useState<View>('Hebrew month')
  const [anchor, setAnchor] = useState(today)
  const [first, last] = monthSpan(anchor, view)
  const lo = newYear(MIN_YEAR)
  const hi = newYear(MAX_YEAR + 1) - 1

  const holidays = useMemo(() => holidaysBetween(first, last, where), [first, last, where])
  const byDay = useMemo(() => {
    const map = new Map<number, Holiday[]>()
    for (const h of holidays) map.set(h.rd, [...(map.get(h.rd) ?? []), h])
    return map
  }, [holidays])

  const lead = weekday(first)
  const cells: (number | null)[] = [...Array<null>(lead).fill(null)]
  for (let rd = first; rd <= last; rd++) cells.push(rd)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const hf = hebrewFromFixed(first)
  const hl = hebrewFromFixed(last)
  const gf = gregorianFromFixed(first)
  const isHeb = view === 'Hebrew month'
  const title = isHeb ? `${monthName(hf.year, hf.month)} ${hf.year}` : `${MONTHS_EN[gf.month - 1]} ${gf.year}`
  const heTitle = isHeb ? `${monthNameHe(hf.year, hf.month)} ${gematriaYear(hf.year)}` : null
  const sub = isHeb
    ? `${shortDate(first)} to ${shortDate(last)}`
    : hf.month === hl.month && hf.year === hl.year
      ? `${monthName(hf.year, hf.month)} ${hf.year}`
      : `${monthName(hf.year, hf.month)} ${hf.year} to ${monthName(hl.year, hl.month)} ${hl.year}`

  const prev = () => first > lo && setAnchor(first - 1)
  const next = () => last < hi && setAnchor(last + 1)

  return (
    <Card mono="Calendar" title={<span>{title} {heTitle && <Heb>{heTitle}</Heb>}</span>}>
      <Stack>
        <div className="hc-calbar">
          <Pills items={VIEWS} active={view} onSelect={(v) => setView(v as View)} />
          <Actions>
            <Button onClick={prev} ariaLabel="Previous month">Previous</Button>
            <Button onClick={() => setAnchor(today)}>Today</Button>
            <Button onClick={next} ariaLabel="Next month">Next</Button>
          </Actions>
        </div>
        <Body sm>{sub}</Body>
        <div className="hc-grid" role="grid" aria-label={`${title} calendar`}>
          <div className="hc-row" role="row">
            {WEEKDAYS.map((w) => <div key={w} className="hc-dow" role="columnheader" aria-label={w}>{w.slice(0, 3)}</div>)}
          </div>
          {weeks.map((week, wi) => <div key={wi} className="hc-row" role="row">{week.map((rd, ci) => {
            const i = wi * 7 + ci
            if (rd === null) return <div key={`b${i}`} className="hc-cell blank" role="gridcell" />
            const hd = hebrewFromFixed(rd)
            const g = gregorianFromFixed(rd)
            const hs = byDay.get(rd) ?? []
            const mainNum = isHeb ? hd.day : g.day
            const subLabel = isHeb
              ? (g.day === 1 || rd === first ? `${g.day} ${MONTHS_EN[g.month - 1].slice(0, 3)}` : String(g.day))
              : (hd.day === 1 || rd === first ? `${hd.day} ${monthName(hd.year, hd.month)}` : String(hd.day))
            const label = `${longDate(rd)}, ${hd.day} ${monthName(hd.year, hd.month)} ${hd.year}${hs.length ? `: ${hs.map((h) => h.name).join(', ')}` : ''}`
            return (
              <div key={rd} role="gridcell" title={label}
                className={`hc-cell${rd === today ? ' today' : ''}${weekday(rd) === 6 ? ' shabbat' : ''}${hs.length ? ' has' : ''}`}>
                <div className="hc-cell-top">
                  <span className="hc-num">{mainNum}</span>
                  {isHeb && <Heb className="hc-num-he">{gematria(hd.day)}</Heb>}
                </div>
                <div className="hc-sub">{subLabel}</div>
                <div className="hc-tags">
                  {hs.slice(0, 2).map((h) => (
                    <span key={h.id} className="hc-tag"><Tag accent={h.kind === 'yom-tov'}>{SHORT(h.name)}</Tag></span>
                  ))}
                  {hs.length > 2 && <span className="hc-more">+{hs.length - 2}</span>}
                  {hs.length > 0 && <span className="hc-dot" aria-hidden />}
                </div>
              </div>
            )
          })}</div>)}
        </div>
      </Stack>
      <div className="hc-list">
        <Body sm>This month</Body>
        {holidays.length === 0 && <Body sm>No holidays or Rosh Chodesh in this month.</Body>}
        <ul className="hc-facts">
          {holidays.map((h) => {
            const hd = hebrewFromFixed(h.rd)
            return (
              <li key={`${h.id}-${h.rd}`}>
                {shortDate(h.rd)} ({WEEKDAYS[weekday(h.rd)].slice(0, 3)}), {hd.day} {monthName(hd.year, hd.month)}: {h.name}
                {h.kind !== 'rosh-chodesh' && <>{' '}<span className="hc-kind">{kindLabel(h.kind)}</span></>}
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}
