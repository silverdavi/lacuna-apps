import { useMemo, useState } from 'react'
import { addDays, fromISODate, toISODate } from '@lacuna/date-math'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { host, type PeriodRecord } from './host'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseISO(iso: string): Date | null {
  return fromISODate(iso)
}

function dayDiff(a: Date, b: Date): number {
  const ms =
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round(ms / 86400000)
}

function cycleDays(periods: PeriodRecord[]): number | null {
  if (periods.length < 2) return null
  const starts = periods
    .map((period) => parseISO(period.start))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => dayDiff(a, b))
  const gaps: number[] = []
  for (let i = 1; i < starts.length; i += 1) {
    const gap = dayDiff(starts[i], starts[i - 1])
    if (gap > 0) gaps.push(gap)
  }
  if (gaps.length === 0) return null
  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)
}

export function App() {
  const [periods, setPeriods] = useState<PeriodRecord[]>(() => host.listPeriods())
  const [settings, setSettings] = useState(() => host.getSettings())
  const [start, setStart] = useState('')
  const [length, setLength] = useState('')
  const [draftLength, setDraftLength] = useState(String(settings.defaultLength))
  const [tab, setTab] = useState('Overview')
  const [selected, setSelected] = useState('')
  const clipboard = useClipboard({ timeoutMs: 1800 })

  const sorted = useMemo(
    () =>
      [...periods].sort((a, b) => {
        const da = parseISO(a.start)
        const db = parseISO(b.start)
        if (!da || !db) return 0
        return dayDiff(da, db)
      }),
    [periods],
  )

  const cycle = useMemo(() => cycleDays(periods), [periods])

  const nextPeriod = useMemo(() => {
    if (!cycle || sorted.length === 0) return null
    const latest = sorted[sorted.length - 1]
    const latestDate = parseISO(latest.start)
    if (!latestDate) return null
    return toISODate(addDays(latestDate, cycle))
  }, [cycle, sorted])

  const startKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const period of periods) keys.add(period.start)
    return keys
  }, [periods])

  const predictedKeys = useMemo(() => {
    const keys = new Set<string>()
    if (cycle) {
      for (const period of periods) {
        const date = parseISO(period.start)
        if (date) keys.add(toISODate(addDays(date, cycle)))
      }
    }
    return keys
  }, [cycle, periods])

  const viewDate = useMemo(() => {
    const date = selected ? parseISO(selected) : null
    if (date) return date
    const first = sorted[0] ? parseISO(sorted[0].start) : null
    return first ?? new Date()
  }, [selected, sorted])

  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const grid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const offset = first.getDay()
    const start = addDays(first, -offset)
    const days: Date[] = []
    for (let i = 0; i < 42; i += 1) days.push(addDays(start, i))
    return days
  }, [viewDate])

  const addPeriod = () => {
    const lengthValue = Number.parseInt(length, 10)
    if (!start || !Number.isFinite(lengthValue) || lengthValue < 1) return
    host.addPeriod(start, lengthValue, new Date().toISOString())
    setPeriods(host.listPeriods())
    setStart('')
    setLength('')
  }

  const deletePeriod = (record: PeriodRecord) => {
    host.deletePeriod(record.id)
    setPeriods(host.listPeriods())
    if (selected === record.start) setSelected('')
  }

  const saveSettings = () => {
    const value = Number.parseInt(draftLength, 10)
    if (!Number.isFinite(value) || value < 1) return
    host.saveSettings({ defaultLength: value })
    setSettings(host.getSettings())
  }

  const exportIcs = async () => {
    const events: IcsEvent[] = sorted.map((period) => {
      const date = parseISO(period.start)
      const end = date ? toISODate(addDays(date, Math.max(period.length - 1, 0))) : period.start
      return {
        id: period.id,
        summary: 'Period start',
        startDate: period.start,
        endDate: end,
        allDay: true,
      }
    })
    if (nextPeriod) {
      events.push({
        id: 'period-tracker-prediction',
        summary: 'Predicted period',
        startDate: nextPeriod,
        allDay: true,
      })
    }
    await clipboard.copy(toIcs(events))
  }

  const selectDay = (iso: string) => {
    setSelected(iso)
  }

  const chipGap = 'calc(8px * var(--sf))'
  const cellGap = 'calc(4px * var(--sf))'

  return (
    <AppShell
      name="Period Tracker"
      icon="calendar"
      hue="teal"
      category="Personal"
      meta={`${periods.length} ${periods.length === 1 ? 'period' : 'periods'}`}
      side={
        <Rail
          title="Period Tracker"
          note="Start dates and lengths, on this device"
          chips={[
            `${periods.length} periods`,
            cycle ? `Cycle ${cycle}d` : 'Cycle —',
            nextPeriod ? `Next ${nextPeriod}` : 'Next —',
          ]}
        />
      }
    >
      <Card mono="Log" title="Add period">
        <Stack>
          <FormGrid>
            <TextInput
              label="Start date"
              type="date"
              value={start}
              onChange={setStart}
            />
            <TextInput
              label="Length (days)"
              type="number"
              inputMode="numeric"
              value={length}
              onChange={setLength}
              placeholder="5"
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: chipGap, alignItems: 'center' }}>
            <Button kind="primary" onClick={addPeriod}>
              Add period
            </Button>
            <Button kind="secondary" onClick={() => void exportIcs()}>
              Export ICS
            </Button>
            {clipboard.copied ? <Body sm>Calendar exported</Body> : null}
          </div>
        </Stack>
      </Card>

      <Card mono="Summary" title="Cycle">
        {periods.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No periods recorded yet"
            detail="Add a start date and length to compute the cycle."
            actionLabel="Record a period"
            onAction={addPeriod}
          />
        ) : (
          <Stack>
            <KpiRow>
              <Kpi value={cycle ? `${cycle} days` : '—'} label={`Average cycle: ${cycle ? `${cycle} days` : '—'}`} accent />
              <Kpi value={nextPeriod ?? '—'} label={`Next period: ${nextPeriod ?? '—'}`} />
            </KpiRow>
            <div role="list" style={{ display: 'flex', flexDirection: 'column' }}>
              {sorted.map((period) => (
                <div
                  key={period.id}
                  role="listitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: chipGap,
                    padding: 'calc(8px * var(--sf)) 0',
                    borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: chipGap }}>
                    <MonoLabel>{period.start}</MonoLabel>
                    <span>{period.length} days</span>
                  </span>
                  <Button kind="ghost" onClick={() => deletePeriod(period)}>
                    Delete {period.start}
                  </Button>
                </div>
              ))}
            </div>
          </Stack>
        )}
      </Card>

      <div style={{ borderBottom: '1px solid var(--ui-line2)' }}>
        <div role="tablist" aria-label="Views" style={{ display: 'flex', gap: 'calc(20px * var(--sf))' }}>
          {(['Overview', 'Calendar', 'Settings'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className="lc-tab"
              style={{
                fontSize: 'calc(12.5px * var(--tf))',
                fontWeight: 600,
                color: tab === item ? 'var(--ink)' : 'var(--ink-60)',
                padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
                border: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${tab === item ? 'var(--accent)' : 'transparent'}`,
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
              }}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Calendar' ? (
        <Card mono="Calendar" title={monthLabel}>
          <div style={{ display: 'flex', gap: chipGap, alignItems: 'center', marginBottom: cellGap }}>
            <Button
              kind="ghost"
              ariaLabel="Previous month"
              onClick={() => selectDay(toISODate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)))}
            >
              ←
            </Button>
            <Button
              kind="ghost"
              ariaLabel="Next month"
              onClick={() => selectDay(toISODate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)))}
            >
              →
            </Button>
            <MonoLabel>{selected ? selected : monthLabel}</MonoLabel>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: cellGap }}>
            {WEEKDAYS.map((day) => (
              <MonoLabel key={day} sm>
                {day}
              </MonoLabel>
            ))}
            {grid.map((day) => {
              const iso = toISODate(day)
              const inMonth = day.getMonth() === viewDate.getMonth()
              const isStart = startKeys.has(iso)
              const isPredicted = predictedKeys.has(iso)
              const isSelected = selected === iso
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={iso}
                  onClick={() => selectDay(iso)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'calc(2px * var(--sf))',
                    padding: 'calc(6px * var(--sf)) 0',
                    border: isSelected ? 'calc(1px * var(--sf)) solid var(--accent)' : 'calc(1px * var(--sf)) solid transparent',
                    borderRadius: 'calc(4px * var(--sf))',
                    background: 'none',
                    color: inMonth ? 'var(--ink)' : 'var(--ink-60)',
                    cursor: 'pointer',
                    fontFamily: 'var(--sans)',
                    fontSize: 'calc(12px * var(--tf))',
                  }}
                >
                  <span>{day.getDate()}</span>
                  {isStart ? (
                    <span
                      style={{
                        fontSize: 'calc(9px * var(--tf))',
                        fontFamily: 'var(--mono)',
                        color: 'var(--accent)',
                      }}
                    >
                      Period start
                    </span>
                  ) : null}
                  {isPredicted ? (
                    <span
                      style={{
                        fontSize: 'calc(9px * var(--tf))',
                        fontFamily: 'var(--mono)',
                        color: 'var(--ink-60)',
                      }}
                    >
                      Predicted period
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          {selected ? (
            <div
              style={{
                marginTop: chipGap,
                padding: chipGap,
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                borderRadius: 'calc(6px * var(--sf))',
              }}
            >
              {startKeys.has(selected) ? (
                <Body>
                  Period start on {selected}.
                </Body>
              ) : null}
              {predictedKeys.has(selected) ? (
                <Body>
                  Predicted period on {selected}.
                </Body>
              ) : null}
              {!startKeys.has(selected) && !predictedKeys.has(selected) ? (
                <Body sm>{selected} — no period start recorded here.</Body>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'Settings' ? (
        <Card mono="Settings" title="Predictions">
          <Stack>
            <Body sm>
              The default length is used for new predictions.
            </Body>
            <FormGrid>
              <TextInput
                label="Default length"
                type="number"
                inputMode="numeric"
                value={draftLength}
                onChange={setDraftLength}
              />
            </FormGrid>
            <div>
              <Button kind="primary" onClick={saveSettings}>
                Save settings
              </Button>
            </div>
          </Stack>
        </Card>
      ) : null}
    </AppShell>
  )
}
