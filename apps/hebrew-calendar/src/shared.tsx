// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useState, type ReactNode } from 'react'
import { Button } from '@lacuna/ui'
import {
  WEEKDAYS, formatHebrew, formatHebrewLetters, fixedFromGregorian, gregorianFromFixed, weekday, type HebrewDate,
} from './hebrew'

export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = MONTHS_EN.map((m) => m.slice(0, 3))

/** Today's fixed day in the browser's own calendar. */
export function todayRd(): number {
  const n = new Date()
  return fixedFromGregorian({ year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() })
}

export function longDate(rd: number, weekdayToo = true): string {
  const g = gregorianFromFixed(rd)
  const base = `${g.day} ${MONTHS_EN[g.month - 1]} ${g.year}`
  return weekdayToo ? `${WEEKDAYS[weekday(rd)]}, ${base}` : base
}

export function shortDate(rd: number, withYear = true): string {
  const g = gregorianFromFixed(rd)
  return `${g.day} ${MONTHS_SHORT[g.month - 1]}${withYear ? ` ${g.year}` : ''}`
}

export function Heb({ children, className }: { children: ReactNode; className?: string }) {
  return <span dir="rtl" lang="he" className={`hc-he${className ? ` ${className}` : ''}`}>{children}</span>
}

export function HebrewLine({ h }: { h: HebrewDate }) {
  return (
    <>
      <span>{formatHebrew(h)}</span>
      {' '}
      <Heb>{formatHebrewLetters(h)}</Heb>
    </>
  )
}

export function CopyButton({ text, label = 'Copy result' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      setDone(false)
    }
  }
  return <Button onClick={copy}>{done ? 'Copied' : label}</Button>
}

export function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
