// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { Heatmap } from '@lacuna/heatmap'
import type { HeatmapCell } from '@lacuna/heatmap'
import { Chart } from '@lacuna/chart'
import type { ChartDataPoint } from '@lacuna/chart'
import { computeStreaks } from '@lacuna/streak-calc'
import { addDays, toISODate } from '@lacuna/date-math'
import { host } from './host/mock'
import type { WaterEntry } from './host'

const TREND_DAYS = 14
const TAU = Math.PI * 2

type TabId = 'Log' | 'Heatmap' | 'Trend'
const TABS: TabId[] = ['Log', 'Heatmap', 'Trend']

const summaryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(20px * var(--sf))',
  flexWrap: 'wrap',
}

const ringStyle: CSSProperties = {
  display: 'block',
  transform: 'rotate(-90deg)',
}

const tabStyle: CSSProperties = {
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13.5px * var(--tf))',
  color: 'var(--ink)',
  background: 'transparent',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(4px * var(--sf))',
  cursor: 'pointer',
}

function today(): string {
  return toISODate(new Date())
}

function plural(n: number): string {
  return n === 1 ? 'day' : 'days'
}

function ProgressRing({ total, goal, showLabel }: { total: number; goal: number; showLabel: boolean }) {
  const R = 42
  const stroke = 8
  const size = (R + stroke) * 2
  const frac = goal > 0 ? Math.min(1, total / goal) : 0
  const dash = TAU * R * frac
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${total} of ${goal} ml`}
        style={ringStyle}
      >
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--hair)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${TAU * R}`}
          strokeLinecap="round"
        />
      </svg>
      {showLabel ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(13px * var(--tf))',
            color: 'var(--ink)',
            pointerEvents: 'none',
          }}
        >
          {total} / {goal} ml
        </div>
      ) : null}
    </div>
  )
}

function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <div role="tablist" aria-label="Views" style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={t === active}
          onClick={() => onSelect(t)}
          style={{ ...tabStyle, ...(t === active ? { background: 'var(--ui-card)', borderColor: 'var(--accent)' } : null) }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [tab, setTab] = useState<TabId>('Log')
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [goalDraft, setGoalDraft] = useState(() => String(host.read().goal))

  const entries = state.entries
  const goal = state.goal
  const t = today()

  const todayTotal = useMemo(
    () => entries.reduce((s, e) => (e.date === t ? s + e.amount : s), 0),
    [entries, t],
  )

  const goalMetDates = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const e of entries) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount)
    const met = new Set<string>()
    for (const [date, sum] of byDate) if (sum >= goal) met.add(date)
    return [...met]
  }, [entries, goal])

  const streak = computeStreaks(goalMetDates, { today: t })

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    const byDate = new Map<string, number>()
    for (const e of entries) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount)
    return [...byDate].map(([date, value]) => ({ date, value }))
  }, [entries])

  const trendData = useMemo<ChartDataPoint[]>(() => {
    const byDate = new Map<string, number>()
    for (const e of entries) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount)
    const data: ChartDataPoint[] = []
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const iso = toISODate(addDays(new Date(), -i))
      data.push({ label: iso, value: byDate.get(iso) ?? 0 })
    }
    return data
  }, [entries])

  function logIntake() {
    const raw = amount.trim()
    if (!raw) {
      setAmountError('Enter an amount greater than 0')
      return
    }
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('Enter an amount greater than 0')
      return
    }
    setState(host.addEntry(t, Math.round(value)))
    setAmount('')
    setAmountError(null)
  }

  function removeEntry(id: string) {
    setState(host.deleteEntry(id))
  }

  function saveGoal() {
    const raw = goalDraft.trim()
    if (!raw) return
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) return
    setState(host.setGoal(Math.round(value)))
    setGoalDraft(String(Math.round(value)))
  }

  const todayEntries = entries.filter((e) => e.date === t)

  const tabBody =
    tab === 'Log' ? (
      <Card mono="Today" title="Today's log">
        {todayEntries.length === 0 ? (
          <Body sm>No intakes logged yet today.</Body>
        ) : (
          <List label="Entries">
            {todayEntries.map((e) => (
              <Row
                key={e.id}
                title={`${e.amount} ml`}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Delete ${e.amount} ml`}
                    title={`Delete ${e.amount} ml`}
                    onClick={() => removeEntry(e.id)}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden style={{ display: 'block' }}>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    ) : tab === 'Heatmap' ? (
      <Card mono="Activity" title="This year">
        <Heatmap data={heatmapCells} year={new Date().getFullYear()} max={goal} label={`Water logged · ${new Date().getFullYear()}`} />
        <KpiRow>
          <Kpi value={todayTotal} label={`ml logged today`} accent />
        </KpiRow>
      </Card>
    ) : (
      <Card mono="Trend" title="Last 14 days">
        <Chart type="line" data={trendData} title="Daily intake" ariaLabel="Daily water intake" />
        <KpiRow>
          <Kpi value={todayTotal} label={`ml today`} accent />
        </KpiRow>
        <List label="Daily totals">
          {trendData.map((d) => (
            <Row key={d.label} title={d.label} value={d.value > 0 ? `${d.value} ml` : undefined} />
          ))}
        </List>
      </Card>
    )

  return (
    <AppShell
      name="Water Intake Tracker"
      icon="tasks"
      hue="teal"
      category="Personal"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
      side={<Rail title="Water Intake Tracker" note="Daily intakes · local" chips={['Progress ring', 'Heatmap', 'Trend', 'Offline']} />}
    >
      <Stack lg>
        <Card mono="Today" title="Progress">
          <div style={summaryStyle}>
            <ProgressRing total={todayTotal} goal={goal} showLabel={tab === 'Log' && todayTotal > 0} />
            <div>
              <MonoLabel accent>Goal: {goal} ml</MonoLabel>
              <MonoLabel>{goal} ml</MonoLabel>
              <div style={{ marginTop: 'calc(4px * var(--sf))', fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                Streak: {streak.current} {plural(streak.current)}
              </div>
            </div>
          </div>
        </Card>

        <Card mono="New" title="Log an intake">
          <FormGrid>
            <TextInput
              label="Amount (ml)"
              value={amount}
              type="number"
              inputMode="numeric"
              placeholder="0"
              onChange={(value) => {
                setAmount(value)
                setAmountError(null)
              }}
              error={amountError}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={logIntake}>
              Log intake
            </Button>
          </Actions>
        </Card>

        <Card mono="Settings" title="Daily goal">
          <Body sm>Set your daily water goal. Meeting it every day builds your streak.</Body>
          <FormGrid>
            <TextInput
              label="Daily goal (ml)"
              value={goalDraft}
              type="number"
              inputMode="numeric"
              onChange={setGoalDraft}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={saveGoal}>
              Save goal
            </Button>
          </Actions>
        </Card>

        <div role="tabpanel">
          <TabBar active={tab} onSelect={setTab} />
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>{tabBody}</div>
        </div>
      </Stack>
    </AppShell>
  )
}
