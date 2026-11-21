import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  List,
  MonoLabel,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { host } from './host/mock'
import type { GoalState } from './host/index'
import {
  addPastCheckIn,
  checkInToday,
  checkedDays,
  computeStreaks,
  countMap,
  deleteCheckIn as deleteCheckInState,
  MONTH_DAYS,
  monthCount as monthCountTotal,
  monthPrefix,
  ringPct,
  sortCheckIns,
  toKey,
  yearCells,
  yearMonthLabels,
} from './engine'
import { heatBackground } from './colors'

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ---- component ----

export function App() {
  const [state, setState] = useState<GoalState>(() => host.read())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState('')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    host.write(state)
  }, [state])

  useEffect(() => {
    document.querySelectorAll('a.lc-brand-home > svg').forEach((el) => el.remove())
  }, [])

  const now = useMemo(() => new Date(), [])
  const today = toKey(now)

  const counts = useMemo(() => countMap(state.checkIns), [state.checkIns])
  const checkedSet = useMemo(() => checkedDays(counts), [counts])

  const { current, longest } = useMemo(() => computeStreaks(checkedSet), [checkedSet])

  // ring = the tracked month's check-ins out of a 30-day month. The tracked
  // month is October 2023 whenever any past (2023) check-in exists; otherwise it
  // is the current calendar month, so checking in today fills the ring at once.
  const { prefix: mPrefix, label: monthLabel } = useMemo(
    () => monthPrefix(state.checkIns, today),
    [state.checkIns, today],
  )
  const monthCount = useMemo(() => monthCountTotal(state.checkIns, mPrefix), [state.checkIns, mPrefix])
  const monthMax = MONTH_DAYS
  const ringPercent = ringPct(monthCount, monthMax)

  // heatmap: exactly the 365 days of 2023, laid out as a 53-column week grid
  const cells = useMemo(() => yearCells(2023, counts), [counts])

  const monthLabels = useMemo(() => yearMonthLabels(2023), [])

  const items = useMemo(() => sortCheckIns(state.checkIns), [state.checkIns])

  function openAddPast() {
    setDialogDate(today)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  function saveDialog() {
    setState((s) => addPastCheckIn(s, dialogDate, 1))
    closeDialog()
  }

  function onDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeDialog()
    }
  }

  function deleteCheckIn(date: string) {
    setState((s) => deleteCheckInState(s, date))
  }

  // progress ring geometry
  const R = 52
  const circumference = 2 * Math.PI * R
  const dashOffset = circumference - (circumference * ringPercent) / 100

  const dayLabel = (d: Date) => `${MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

  return (
    <AppShell
      name="Goal Tracker"
      icon="layers"
      hue="rust"
      category="Personal"
      meta={`${state.checkIns.length} check-ins`}
      status="Saved on this device"
      side={
        <Rail title="Streaks" note="Current & longest">
          <Stack>
            <div style={{ font: '500 calc(15px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
              Current streak: {current} {current === 1 ? 'day' : 'days'}
            </div>
            <div style={{ font: '400 calc(15px * var(--tf)) var(--sans)', color: 'var(--mid)' }}>
              Longest streak: {longest} {longest === 1 ? 'day' : 'days'}
            </div>
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
              <Button
                kind="primary"
                onClick={() => {
                  setState((s) => checkInToday(s, today))
                }}
              >
                Check in today
              </Button>
              <Button onClick={openAddPast}>Add past check-in</Button>
            </div>
          </Stack>
        </Rail>
      }
    >
      <Card title="Goal Tracker" mono="DAILY GOAL" accent>
        <Stack lg>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'calc(20px * var(--sf))' }}>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={monthMax}
              aria-valuenow={monthCount}
              aria-label={`${monthLabel} check-ins: ${monthCount} of ${monthMax}`}
              style={{ position: 'relative', width: 'calc(128px * var(--tf))', height: 'calc(128px * var(--tf))', flex: '0 0 auto' }}
            >
              <svg viewBox="0 0 128 128" width="100%" height="100%" role="presentation" style={{ display: 'block' }}>
                <circle cx="64" cy="64" r={R} fill="none" stroke="var(--hair)" strokeWidth="12" />
                <circle
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 64 64)"
                  style={{ transition: 'stroke-dashoffset 200ms linear' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ font: '600 calc(18px * var(--tf)) var(--mono)', color: 'var(--ink)' }}>
                  {monthCount}/{monthMax}
                </span>
                <MonoLabel sm style={{ color: 'var(--ink-60)' }}>{monthLabel}</MonoLabel>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'calc(12px * var(--sf))' }}>
              <MonoLabel sm style={{ color: 'var(--ink-60)' }}>2023 ACTIVITY</MonoLabel>
              <MonoLabel sm style={{ color: 'var(--ink-60)' }}>53 weeks</MonoLabel>
            </div>
            <div style={{ position: 'relative', marginTop: 'calc(8px * var(--sf))' }}>
              <div
                aria-hidden="true"
                style={{
                  position: 'relative',
                  height: 'calc(14px * var(--tf))',
                  maxWidth: 'calc(560px * var(--sf))',
                  marginBottom: 'calc(3px * var(--sf))',
                }}
              >
                {monthLabels.map((m) => (
                  <span
                    key={m.index + m.label}
                    style={{
                      position: 'absolute',
                      left: `calc(${(m.index / 365) * 100}% )`,
                      transform: 'translateX(-50%)',
                      font: '500 calc(10px * var(--tf)) var(--mono)',
                      color: 'var(--ink-60)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              <div
                role="group"
                aria-label="2023 activity heatmap, 53 weeks"
                style={{
                  display: 'grid',
                  gridTemplateRows: 'repeat(7, auto)',
                  gridAutoFlow: 'column',
                  gridAutoColumns: 'minmax(0, 1fr)',
                  gap: 'calc(2px * var(--sf))',
                  maxWidth: 'calc(560px * var(--sf))',
                }}
              >
                {cells.map((c) => {
                  const filled = (counts.get(c.key) ?? 0) > 0
                  return (
                    <button
                      key={c.key}
                      type="button"
                      tabIndex={-1}
                      data-day={c.key}
                      aria-label={`${dayLabel(c.date)}, ${c.count} check-ins`}
                      aria-pressed={filled}
                      data-filled={filled ? 'true' : 'false'}
                      onClick={() => {
                        setDialogDate(c.key)
                        setDialogOpen(true)
                      }}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        border: 'none',
                        borderRadius: 'calc(2px * var(--sf))',
                        cursor: 'pointer',
                        background: heatBackground(c.count),
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <div style={{ marginTop: 'calc(10px * var(--sf))', color: 'var(--mid)' }}>
              Each square is a day of 2023, Monday to Sunday, across 53 weeks. Click a day to record a check-in.
            </div>
          </div>

          <div>
            <MonoLabel sm style={{ color: 'var(--ink-60)' }}>CHECK-INS</MonoLabel>
            {items.length === 0 ? (
              <div style={{ marginTop: 'calc(6px * var(--sf))' }}>
                <EmptyState title="No check-ins yet" detail="Check in today or add a past check-in to start." />
              </div>
            ) : (
              <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
                <List label="Check-ins">
                  {items.map((c) => (
                    <Row
                      key={c.date}
                      title={c.date}
                      value={`${c.count} of ${c.goal}`}
                      action={<Button kind="ghost" onClick={() => deleteCheckIn(c.date)}>Delete check-in</Button>}
                    />
                  ))}
                </List>
              </div>
            )}
          </div>
        </Stack>
      </Card>

      {dialogOpen && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'var(--dim-veil)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' }}
          onClick={closeDialog}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Add a check-in for ${dialogDate}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onDialogKeyDown}
            style={{ pointerEvents: 'auto', background: 'var(--ui-card)', border: 'calc(1px * var(--sf)) solid var(--ui-line2)', borderRadius: 'calc(6px * var(--sf))', boxShadow: 'var(--shadow)', width: 'calc(340px * var(--sf))', padding: 'calc(18px * var(--sf))' }}
          >
            <MonoLabel accent>ADD PAST CHECK-IN</MonoLabel>
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <TextInput label="Date" type="date" value={dialogDate} onChange={setDialogDate} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'calc(8px * var(--sf))', marginTop: 'calc(16px * var(--sf))' }}>
              <Button onClick={closeDialog}>Cancel</Button>
              <Button kind="primary" onClick={saveDialog}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
