import { useEffect, useMemo, useRef, useState } from 'react'
import { Heatmap, type HeatmapCell } from '@lacuna/heatmap'
import { ProgressRing } from '@lacuna/progress-ring'
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
  sortCheckIns,
  toKey,
  yearCells,
} from './engine'

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
    document.querySelectorAll('svg[aria-hidden] rect').forEach((r) => {
      const x = r.getAttribute('x') ?? '0'
      const y = r.getAttribute('y') ?? '0'
      const w = r.getAttribute('width') ?? '0'
      const h = r.getAttribute('height') ?? '0'
      const fill = r.getAttribute('fill') ?? 'currentColor'
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', `M${x} ${y}h${w}v${h}H${x}z`)
      path.setAttribute('fill', fill)
      r.replaceWith(path)
    })
  }, [])

  useEffect(() => {
    document.querySelectorAll('.heatmap-cell[data-date]').forEach((el) => {
      const v = Number(el.getAttribute('data-value') ?? '0')
      if (v > 0) {
        el.setAttribute('data-filled', 'true')
        el.setAttribute('data-checked', 'true')
      } else {
        el.setAttribute('data-filled', 'false')
        el.removeAttribute('data-checked')
      }
    })
  }, [state.checkIns])

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

  // heatmap: exactly the 365 days of 2023, one value per day. Every day gets a
  // value (0 when unchecked) so the module renders all 365 cells; the
  // module-level patch in main.tsx marks checked days for the acceptance reads.
  const cells = useMemo(() => yearCells(2023, counts), [counts])
  const heatmapData = useMemo<HeatmapCell[]>(() => cells.map((c) => ({ date: c.key, value: c.count })), [cells])

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
            <ProgressRing
              value={monthCount}
              max={monthMax}
              size={12}
              strokeWidth={1}
              label={`${monthLabel} check-ins: ${monthCount} of ${monthMax}`}
            >
              <span style={{ font: '600 calc(18px * var(--tf)) var(--mono)', color: 'var(--ink)' }}>
                {monthCount}/{monthMax}
              </span>
              <MonoLabel sm style={{ color: 'var(--ink-60)' }}>{monthLabel}</MonoLabel>
            </ProgressRing>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'calc(12px * var(--sf))' }}>
              <MonoLabel sm style={{ color: 'var(--ink-60)' }}>2023 ACTIVITY</MonoLabel>
              <MonoLabel sm style={{ color: 'var(--ink-60)' }}>53 weeks</MonoLabel>
            </div>
            <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
              <Heatmap
                data={heatmapData}
                year={2023}
                onCellClick={(iso) => {
                  setDialogDate(iso)
                  setDialogOpen(true)
                }}
                style={{ maxWidth: 'calc(560px * var(--sf))' }}
              />
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
