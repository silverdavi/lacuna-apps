import { useEffect, useMemo, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, Keys, Kpi, KpiRow, List, Pills, Rail, Row, Stack, Tag, TextInput } from '@lacuna/ui'
import { DatePicker } from '@lacuna/date-picker'
import { useClipboard } from '@lacuna/use-clipboard'
import { useHotkeys } from '@lacuna/use-hotkeys'
import { host } from './host'
import {
  EVENT_NAMES,
  EVENT_SHORT,
  ageDays,
  discGeometry,
  elongation,
  eventsBetween,
  illuminated,
  nextEvents,
  nextOfKind,
  phaseName,
  type PhaseEvent,
} from './moon'

const DAY_MS = 86400000
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
const TABS = ['Today', 'Month', 'Upcoming', 'Settings'] as const
type Tab = (typeof TABS)[number]

const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (d: Date) => `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isoTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function localMs(y: number, mo: number, d: number, h: number, mi: number): number {
  const dt = new Date(2000, 0, 1, h, mi)
  dt.setFullYear(y, mo - 1, d)
  return dt.getTime()
}

function parseInputs(date: string, time: string): number | null {
  const dm = /^(\d{4,6})-(\d{2})-(\d{2})$/.exec(date)
  const tm = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dm || !tm) return null
  const [y, mo, d, h, mi] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])]
  const ms = localMs(y, mo, d, h, mi)
  const back = new Date(ms)
  if (Number.isNaN(ms) || back.getFullYear() !== y || back.getMonth() !== mo - 1 || back.getDate() !== d) return null
  return ms
}

const fmtTime = (ms: number, h12: boolean) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: h12 })
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const fmtShortDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function countdown(fromMs: number, toMs: number): string {
  const days = (toMs - fromMs) / DAY_MS
  return days < 1 ? `in ${Math.max(1, Math.round(days * 24))} hr` : `in ${days.toFixed(1)} days`
}

function MoonDisc({ e, south, label, className }: { e: number; south: boolean; label?: string; className?: string }) {
  const g = discGeometry(e)
  const flip = g.mirrored !== south
  return (
    <svg
      className={`mp-disc ${className ?? ''}`}
      viewBox="0 0 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle className="mp-dark" cx="50" cy="50" r="50" />
      <path className="mp-lit" d={g.litPath} transform={flip ? 'translate(100 0) scale(-1 1)' : undefined} />
      <circle className="mp-rim" cx="50" cy="50" r="49.6" />
    </svg>
  )
}

export function App() {
  const [ms, setMs] = useState(() => Math.floor(Date.now() / 60000) * 60000)
  const [tab, setTab] = useState<Tab>('Today')
  const [settings, setSettings] = useState(() => host.readSettings())
  const [dateText, setDateText] = useState(() => isoDate(new Date(ms)))
  const [timeText, setTimeText] = useState(() => isoTime(new Date(ms)))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date(ms)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })
  const { south, h12 } = settings

  // Keep the inputs and the month grid following the selected instant.
  useEffect(() => {
    const d = new Date(ms)
    setDateText(isoDate(d))
    setTimeText(isoTime(d))
    setMonthStart({ y: d.getFullYear(), m: d.getMonth() })
  }, [ms])

  const update = (next: Partial<typeof settings>) => {
    const merged = { ...settings, ...next }
    setSettings(merged)
    host.writeSettings(merged)
  }

  const nowMin = () => Math.floor(Date.now() / 60000) * 60000
  const shiftDay = (n: number) => {
    const d = new Date(ms)
    setMs(localMs(d.getFullYear(), d.getMonth() + 1, d.getDate() + n, d.getHours(), d.getMinutes()))
  }

  useHotkeys([
    { keys: 'arrowleft', handler: () => shiftDay(-1), description: 'Previous day' },
    { keys: 'arrowright', handler: () => shiftDay(1), description: 'Next day' },
    { keys: 't', handler: () => setMs(nowMin()), description: 'Jump to today' },
  ])

  const dateError = parseInputs(dateText, '00:00') === null ? 'Enter a valid date' : null
  const timeError = /^\d{2}:\d{2}$/.test(timeText) && Number(timeText.slice(0, 2)) < 24 && Number(timeText.slice(3)) < 60 ? null : 'Enter a valid time'
  const onDate = (v: string) => {
    setDateText(v)
    const next = parseInputs(v, timeText)
    if (next !== null) setMs(next)
  }
  const onTime = (v: string) => {
    setTimeText(v)
    const next = parseInputs(dateText, v)
    if (next !== null) setMs(next)
  }

  const year = new Date(ms).getFullYear()
  const outOfRange = year < 1900 || year > 2100

  const e = elongation(ms)
  const lit = illuminated(e)
  const name = phaseName(e)
  const events = useMemo(() => nextEvents(ms, 4), [ms])
  const nextFull = nextOfKind(events, 2)
  const nextNew = nextOfKind(events, 0)
  const upcoming = events.slice(0, 12)

  const monthEvents = useMemo(() => {
    const from = localMs(monthStart.y, monthStart.m + 1, 1, 0, 0)
    const to = localMs(monthStart.y, monthStart.m + 2, 1, 0, 0)
    const byDay = new Map<string, PhaseEvent[]>()
    for (const ev of eventsBetween(from, to)) {
      const k = isoDate(new Date(ev.ms))
      byDay.set(k, [...(byDay.get(k) ?? []), ev])
    }
    return byDay
  }, [monthStart])

  const daysInMonth = new Date(monthStart.y, monthStart.m + 1, 0).getDate()
  const lead = new Date(localMs(monthStart.y, monthStart.m + 1, 1, 12, 0)).getDay()
  const monthTitle = new Date(localMs(monthStart.y, monthStart.m + 1, 1, 12, 0)).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const selectedDay = isoDate(new Date(ms))
  const todayDay = isoDate(new Date())

  const moveMonth = (n: number) => {
    const d = new Date(localMs(monthStart.y, monthStart.m + 1 + n, 1, 12, 0))
    setMonthStart({ y: d.getFullYear(), m: d.getMonth() })
  }

  const pickDay = (day: number) => {
    const d = new Date(ms)
    setMs(localMs(monthStart.y, monthStart.m + 1, day, d.getHours(), d.getMinutes()))
    setTab('Today')
  }

  const listText = [
    `Upcoming moon phases (${ZONE})`,
    ...upcoming.map((ev) => `${EVENT_NAMES[ev.kind]}  ${fmtDay(ev.ms)}  ${fmtTime(ev.ms, h12)}`),
  ].join('\n')
  const onCopy = () => {
    setCopyError(null)
    void copy(listText).catch(() => setCopyError('Copy failed. The clipboard is not available here.'))
  }

  const today = (
    <Card mono="Today" title="Moon phase">
      <Stack>
        <div className="mp-hero">
          <div className="mp-disc-wrap">
            <MoonDisc e={e} south={south} label={`${name}, ${(lit * 100).toFixed(0)} percent illuminated`} />
          </div>
          <div className="mp-name">{name}</div>
          <div className="mp-sub">{`${fmtDay(ms)} · ${fmtTime(ms, h12)} · ${ZONE}`}</div>
        </div>
        <KpiRow>
          <Kpi value={`${(lit * 100).toFixed(1)}%`} label="Illuminated" accent />
          <Kpi value={`${ageDays(e).toFixed(1)} d`} label="Age (days)" />
        </KpiRow>
        <KpiRow>
          <Kpi value={nextFull ? fmtShortDay(nextFull.ms) : '—'} label={nextFull ? `Next full · ${countdown(ms, nextFull.ms)}` : 'Next full'} />
          <Kpi value={nextNew ? fmtShortDay(nextNew.ms) : '—'} label={nextNew ? `Next new · ${countdown(ms, nextNew.ms)}` : 'Next new'} />
        </KpiRow>
        <div className="mp-controls">
          <TextInput label="Date" type="date" value={dateText} onChange={onDate} error={dateError} />
          <TextInput label="Time" type="time" value={timeText} onChange={onTime} error={timeError} />
        </div>
        <Actions>
          <Button kind="primary" onClick={() => setMs(nowMin())}>Now</Button>
          <Button onClick={() => shiftDay(-1)}>-1 day</Button>
          <Button onClick={() => shiftDay(1)}>+1 day</Button>
          <Button kind="ghost" onClick={() => setPickerOpen(!pickerOpen)}>{pickerOpen ? 'Hide calendar' : 'Pick from calendar'}</Button>
        </Actions>
        {pickerOpen ? (
          <div className="mp-picker">
            <DatePicker
              ariaLabel="Pick a date"
              value={selectedDay}
              onChange={(v) => {
                if (typeof v === 'string') onDate(v)
              }}
            />
          </div>
        ) : null}
        {outOfRange ? <p className="mp-warn" role="alert">{`Year ${year} is outside 1900 to 2100. Accuracy drops further from the present.`}</p> : null}
        <p className="mp-note">Computed on this device from a short lunar series; event times are good to about an hour.</p>
      </Stack>
    </Card>
  )

  const month = (
    <Card
      mono="Month"
      title={monthTitle}
      actions={
        <Actions>
          <Button ariaLabel="Previous month" onClick={() => moveMonth(-1)}>Prev</Button>
          <Button ariaLabel="Next month" onClick={() => moveMonth(1)}>Next</Button>
        </Actions>
      }
    >
      <div className="mp-grid" role="grid" aria-label={monthTitle}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="mp-dow" role="columnheader">{d}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} className="mp-day blank" role="gridcell" aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = `${String(monthStart.y).padStart(4, '0')}-${pad(monthStart.m + 1)}-${pad(day)}`
          const noon = localMs(monthStart.y, monthStart.m + 1, day, 12, 0)
          const evs = monthEvents.get(key) ?? []
          const cls = `mp-day${key === selectedDay ? ' sel' : ''}${key === todayDay ? ' today' : ''}`
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              className={cls}
              aria-label={`${fmtDay(noon)}, ${phaseName(elongation(noon))}${evs.map((ev) => `, ${EVENT_NAMES[ev.kind]} at ${fmtTime(ev.ms, h12)}`).join('')}`}
              aria-selected={key === selectedDay}
              onClick={() => pickDay(day)}
            >
              <span className="mp-num">{day}</span>
              <MoonDisc e={elongation(noon)} south={south} className="mp-mini" />
              {evs.map((ev) => (
                <span key={ev.ms} className="mp-ev" title={`${EVENT_NAMES[ev.kind]} ${fmtTime(ev.ms, h12)}`}>
                  <Tag accent>
                    <span className="mp-evk">{`${EVENT_SHORT[ev.kind]} `}</span>
                    {fmtTime(ev.ms, h12).replace(/\s?(AM|PM)$/i, (m) => m.trim().toLowerCase().slice(0, 1))}
                  </Tag>
                </span>
              ))}
            </button>
          )
        })}
      </div>
      <p className="mp-note" style={{ marginTop: 'calc(8px * var(--sf))' }}>{`Times in ${ZONE}. Tap a day to open it.`}</p>
    </Card>
  )

  const upcomingCard = (
    <Card
      mono={`Times in ${ZONE}`}
      title="Next phases"
      actions={<Button onClick={onCopy}>{copied ? 'Copied' : 'Copy list'}</Button>}
    >
      <Stack>
        {upcoming.length === 0 ? (
          <EmptyState mono="Empty" title="No phases found" detail="Pick a date inside 1900 to 2100." />
        ) : (
          <List label="Upcoming principal phases">
            {upcoming.map((ev) => (
              <Row
                key={`${ev.kind}-${ev.ms}`}
                title={EVENT_NAMES[ev.kind]}
                meta={fmtDay(ev.ms)}
                value={fmtTime(ev.ms, h12)}
                hot={ev.kind === 0 || ev.kind === 2}
              />
            ))}
          </List>
        )}
        {copyError ? <p className="mp-warn" role="alert">{copyError}</p> : null}
        <p className="mp-note">Counted from the selected date and time.</p>
      </Stack>
    </Card>
  )

  const settingsCard = (
    <Card mono="Settings" title="Display">
      <Stack>
        <div>
          <p className="mp-note">Hemisphere</p>
          <Pills items={['Northern', 'Southern']} active={south ? 'Southern' : 'Northern'} onSelect={(v) => update({ south: v === 'Southern' })} />
        </div>
        <div>
          <p className="mp-note">Time display</p>
          <Pills items={['12-hour', '24-hour']} active={h12 ? '12-hour' : '24-hour'} onSelect={(v) => update({ h12: v === '12-hour' })} />
        </div>
        <p className="mp-note">{`All times use this device's zone: ${ZONE}. The southern view flips the disc horizontally.`}</p>
      </Stack>
    </Card>
  )

  return (
    <AppShell
      name="Moon phase"
      icon="calendar"
      hue="green"
      category="Calculate"
      meta={`${name} · ${(lit * 100).toFixed(0)}%`}
      side={
        <Rail title="Moon phase" note={`Times in ${ZONE}`} chips={['Works offline']}>
          <KpiRow>
            <Kpi value={`${(lit * 100).toFixed(0)}%`} label="Lit" accent />
            <Kpi value={ageDays(e).toFixed(1)} label="Days old" />
          </KpiRow>
          <Keys items={[['Left / Right', 'Previous / next day'], ['T', 'Jump to now']]} />
        </Rail>
      }
    >
      <div className="mp-tabs" role="tablist" aria-label="Views">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`mp-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Today' ? today : tab === 'Month' ? month : tab === 'Upcoming' ? upcomingCard : settingsCard}
    </AppShell>
  )
}
