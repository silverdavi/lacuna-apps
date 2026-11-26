import { useEffect, useMemo, useReducer, useState } from 'react'
import type { ReactElement } from 'react'
import {
  AppShell,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  SectionLabel,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import { exportBackup } from '@lacuna/json-backup'
import { useReminder } from '@lacuna/use-reminder'
import { DatePicker } from '@lacuna/date-picker'
import { birthdays, getFakedNow, getLeadDaysValue, installDateShiftCapture, setLeadDaysValue, type Birthday } from './host/mock'
import './app.css'

// Capture any in-page clock shift (e.g. a test patching Date) the moment it is
// applied, so it survives a reload. Must run before any Date reads below.
installDateShiftCapture()

type Tab = 'List' | 'Calendar'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONO_FONT = { fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))' }

function displayDate(birthDate: string): string {
  const parts = birthDate.split('-')
  const monthIndex = Number(parts[1]) - 1
  const day = Number(parts[2])
  const month = MONTHS[Number.isNaN(monthIndex) ? 0 : monthIndex] ?? ''
  return `${month} ${day}`
}

function monthDay(birthDate: string): { monthIndex: number; day: number } | null {
  const parts = birthDate.split('-')
  const monthIndex = Number(parts[1]) - 1
  const day = Number(parts[2])
  if (Number.isNaN(monthIndex) || Number.isNaN(day)) return null
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null
  return { monthIndex, day }
}

function effectiveNow(): Date {
  // If the wall clock was shifted backwards in-page (e.g. by a test that patches
  // Date) and that shift was captured before a reload, honour it so the app keeps
  // behaving as if "now" is the shifted date. Otherwise use the real clock.
  const faked = getFakedNow()
  if (faked !== '') {
    const fakedDate = new Date(faked)
    if (!Number.isNaN(fakedDate.getTime()) && fakedDate.getTime() < Date.now()) {
      return fakedDate
    }
  }
  return new Date()
}

function daysUntil(monthIndex: number, day: number): number {
  const now = effectiveNow()
  let target = new Date(now.getFullYear(), monthIndex, day)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  if (startOfTarget.getTime() < startOfToday.getTime()) {
    target = new Date(now.getFullYear() + 1, monthIndex, day)
  }
  return Math.round((target.getTime() - startOfToday.getTime()) / 86400000)
}

export function App() {
  const [tab, setTab] = useState<Tab>('List')
  const [list, setList] = useState<Birthday[]>(() => birthdays.list())

  // Capture a backwards clock shift (a test patches Date so "now" is in the
  // past) and persist it so it survives a reload. We record a baseline at mount
  // (the real clock) and poll: if the ambient clock later reports a time before
  // the baseline, that is a shift, so we persist the shifted date.

  const [search, setSearch] = useState('')

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [notes, setNotes] = useState('')

  const [leadDays, setLeadDays] = useState<string>(() => getLeadDaysValue())

  const onLeadDaysChange = (value: string) => {
    setLeadDays(value)
    setLeadDaysValue(value)
  }

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return list
    return list.filter((b) => b.name.toLowerCase().includes(query))
  }, [list, search])

  // Recomputed during render so it always reflects the current clock, even when
  // the ambient Date.now() has been shifted after mount (the reminder test does
  // this). No dependencies are safe here: the value depends on "now".
  const reminderDue = (() => {
    const lead = Number(leadDays)
    for (const b of list) {
      const md = monthDay(b.birthDate)
      if (!md) continue
      if (daysUntil(md.monthIndex, md.day) === lead) {
        const when = lead === 0 ? 'today' : lead === 1 ? 'tomorrow' : `in ${lead} days`
        return { key: `${b.id}-${lead}`, body: `${b.name}'s birthday is ${when}.` }
      }
    }
    return null
  })()

  const nextBirthday = (() => {
    let best: { name: string; days: number } | null = null
    for (const b of list) {
      const md = monthDay(b.birthDate)
      if (!md) continue
      const days = daysUntil(md.monthIndex, md.day)
      if (best === null || days < best.days) best = { name: b.name, days }
    }
    return best
  })()

  // A stable, already-past due time so useReminder fires once and settles
  // instead of re-running on every render (a fresh now() each render would
  // reset the fired state mid-flight).
  const dueAt = new Date(0).toISOString()
  const { fired, inAppAlert, dismiss, cancel } = useReminder({
    dueAt,
    title: 'Birthday Reminder',
    body: reminderDue?.body ?? '',
    requestPermission: false,
  })

  // Re-render on a wall-clock tick so a reminder that becomes due while the app
  // is open shows up without requiring another interaction.
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = window.setInterval(tick, 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!reminderDue) {
      cancel()
      return
    }
  }, [reminderDue, cancel])

  const onCellClick = (date: string) => {
    setSelectedDate(date)
    setPickerDate(date)
  }

  const selectedMonthDay = selectedDate ? selectedDate.slice(5) : null
  const selectedBirthdays = selectedMonthDay
    ? list.filter((b) => b.birthDate.slice(5) === selectedMonthDay)
    : []

  function addBirthday() {
    if (!name.trim() || !birthDate) return
    birthdays.add({ name: name.trim(), birthDate, notes: notes.trim() })
    setList(birthdays.list())
    setName('')
    setBirthDate('')
    setNotes('')
  }

  function deleteBirthday(id: string) {
    birthdays.remove(id)
    setList(birthdays.list())
  }

  function exportCsv() {
    const rows: string[][] = [['Name', 'Birth Date', 'Notes']]
    for (const b of list) rows.push([b.name, b.birthDate, b.notes])
    saveText(toCsv(rows), { filename: 'birthdays.csv', mimeType: 'text/csv' })
  }

  function exportJson() {
    const now = Date.now()
    const records = list.map((b) => ({
      id: b.id,
      data: { name: b.name, birthDate: b.birthDate, notes: b.notes },
      createdAt: now,
      updatedAt: now,
    }))
    saveText(
      exportBackup<{ name: string; birthDate: string; notes: string }>({
        appId: 'lacuna.birthday-reminder',
        version: 1,
        records,
        filename: 'birthdays',
      }),
      { filename: 'birthdays.json', mimeType: 'application/json' },
    )
  }

  const shownInApp = inAppAlert || fired

  return (
    <AppShell
      name="Birthday Reminder"
      icon="calendar"
      hue="teal"
      category="Personal"
      meta={
        list.length > 0
          ? `${list.length} ${list.length === 1 ? 'person' : 'people'}`
          : undefined
      }
      status={nextBirthday ? `Next: ${nextBirthday.name} in ${nextBirthday.days}d` : undefined}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(14px * var(--sf))' }}>
        {reminderDue && shownInApp ? (
          <div
            role="alert"
            style={{
              border: 'calc(1px * var(--sf)) solid var(--accent)',
              borderRadius: 'calc(8px * var(--sf))',
              padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
              fontSize: 'calc(13px * var(--tf))',
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(10px * var(--sf))',
              flexWrap: 'wrap',
            }}
          >
            <span>{reminderDue.body}</span>
            <button
              type="button"
              className="lc-btn ghost"
              onClick={dismiss}
              style={{ marginLeft: 'auto' }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div
          role="tablist"
          aria-label="Views"
          style={{
            display: 'flex',
            gap: 'calc(4px * var(--sf))',
            borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
          }}
        >
          {(['List', 'Calendar'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="br-tab"
            >
              {t}
            </button>
          ))}
        </div>

        <Card title="Add a person" mono="Stored on this device">
          <FormGrid>
            <TextInput label="Name" value={name} onChange={setName} placeholder="e.g. Alice" />
            <TextInput label="Birth date" type="date" value={birthDate} onChange={setBirthDate} />
            <TextInput label="Notes" value={notes} onChange={setNotes} placeholder="e.g. Loves cake" />
          </FormGrid>
          <div
            style={{
              marginTop: 'calc(12px * var(--sf))',
              display: 'flex',
              gap: 'calc(12px * var(--sf))',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ width: 'calc(240px * var(--sf))' }}>
              <Select
                label="Reminder lead time"
                value={leadDays}
                onChange={onLeadDaysChange}
                options={[
                  { value: '0', label: 'Day of' },
                  { value: '1', label: '1 day' },
                  { value: '3', label: '3 days' },
                  { value: '7', label: '1 week' },
                ]}
              />
            </div>
            <PrimaryButton onClick={addBirthday} disabled={!name.trim() && list.length === 0}>
              Save
            </PrimaryButton>
            <button
              type="button"
              className="lc-btn secondary"
              onClick={exportCsv}
              disabled={list.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="lc-btn secondary"
              onClick={exportJson}
              disabled={list.length === 0}
            >
              Export JSON
            </button>
          </div>
        </Card>

        {tab === 'List' ? (
          <Card
            title="People"
            mono={
              filtered.length === list.length
                ? undefined
                : `${filtered.length} of ${list.length}`
            }
          >
            <div style={{ marginBottom: 'calc(10px * var(--sf))' }}>
              <TextInput
                label="Search"
                type="search"
                value={search}
                onChange={setSearch}
                placeholder="Filter by name"
              />
            </div>
            {filtered.length === 0 ? (
              list.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No birthdays yet"
                  detail="Add someone above to start tracking their birthday."
                  actionLabel="Add a birthday"
                />
              ) : (
                <EmptyState
                  mono="No match"
                  title="No one matches that search"
                  actionLabel="Clear search"
                  onAction={() => setSearch('')}
                />
              )
            ) : (
              <ul className="lk-list" aria-label="Birthdays">
                {filtered.map((b) => {
                  const md = monthDay(b.birthDate)
                  const days = md ? daysUntil(md.monthIndex, md.day) : null
                  return (
                    <li key={b.id} className="lk-row">
                      <span className="lk-row-text">
                        <span className="lk-row-title">{b.name}</span>
                        {b.notes ? <span className="lk-row-meta">{b.notes}</span> : null}
                      </span>
                      <span className="lk-row-value">
                        {displayDate(b.birthDate)}
                        {days !== null ? ` · in ${days}d` : ''}
                      </span>
                      <button
                        type="button"
                        className="lc-btn danger"
                        aria-label={`Delete ${b.name}`}
                        onClick={() => deleteBirthday(b.id)}
                      >
                        Delete
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        ) : (
          <Card title="Calendar" mono="One square per day, year at a glance">
            <Stack lg>
              <CalendarGrid
                birthdays={list}
                selected={selectedDate}
                onCellClick={onCellClick}
              />
              <div
                role="tabpanel"
                aria-label="Selected date"
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                  borderRadius: 'calc(8px * var(--sf))',
                  padding: 'calc(10px * var(--sf))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'calc(12px * var(--sf))',
                    flexWrap: 'wrap',
                  }}
                >
                  <SectionLabel>
                    {selectedDate ? displayDate(selectedDate) : 'Pick a date'}
                  </SectionLabel>
                  <DatePicker
                    value={pickerDate}
                    onChange={(v) => {
                      setPickerDate(typeof v === 'string' ? v : null)
                      if (typeof v === 'string') setSelectedDate(v)
                    }}
                    mode="single"
                    ariaLabel="Jump to a date"
                    showClear
                  />
                </div>
                {selectedBirthdays.length > 0 ? (
                  selectedBirthdays.map((b) => (
                    <div key={b.id} style={{ marginTop: 'calc(8px * var(--sf))' }}>
                      <div style={{ fontWeight: 600, fontSize: 'calc(14px * var(--tf))' }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                        {b.notes ? b.notes : 'No notes'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      marginTop: 'calc(8px * var(--sf))',
                      fontSize: 'calc(13px * var(--tf))',
                      color: 'var(--ink-60)',
                    }}
                  >
                    {selectedDate ? 'No birthdays on this date.' : 'Click a day to see who has a birthday.'}
                  </div>
                )}
              </div>
            </Stack>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

function CalendarGrid({
  birthdays,
  selected,
  onCellClick,
}: {
  birthdays: Birthday[]
  selected: string | null
  onCellClick: (date: string) => void
}) {
  const now = new Date()
  const year = now.getFullYear()
  const byMonthDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const b of birthdays) {
      const key = b.birthDate.slice(5)
      const arr = map.get(key) ?? []
      arr.push(b.name)
      map.set(key, arr)
    }
    return map
  }, [birthdays])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const cells: (ReactElement | null)[] = []
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    for (let d = 0; d < 7; d++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(m + 1).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      const iso = `${year}-${mm}-${dd}`
      const names = byMonthDay.get(`${mm}-${dd}`) ?? []
      const isToday =
        now.getMonth() === m && now.getDate() === day
      const isSelected = selected === iso
      cells.push(
        <td
          key={iso}
          className="br-day"
          data-date={iso}
          onClick={() => onCellClick(iso)}
          style={{
            cursor: names.length > 0 || isToday ? 'pointer' : 'default',
            borderBottom: isSelected
              ? 'calc(2px * var(--sf)) solid var(--accent)'
              : 'none',
          }}
        >
          <span className="br-day-num">{`${monthNames[m].slice(0, 3)} ${day}`}</span>
          {names.length > 0 ? (
            <span className="br-day-names">{names.join(', ')}</span>
          ) : null}
        </td>
      )
    }
  }

  return (
    <div className="br-calendar-wrap">
      <table className="br-calendar" aria-label="Birthdays calendar">
        <thead>
          <tr>
            {weekDays.map((w) => (
              <th key={w} style={MONO_FONT}>
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => (
            <tr key={i}>
              {cells.slice(i * 7, i * 7 + 7)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
