import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Rail,
  Row,
  SectionLabel,
  TextInput,
} from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { Heatmap } from '@lacuna/heatmap'
import {
  addOne,
  clearHistory,
  heatCells,
  historyRows,
  loadState,
  postProcessDom,
  progress,
  resetCounter,
  saveState,
  setGoal,
  trendPoints,
  type TallyState,
} from './host'

const tabList: CSSProperties = {
  display: 'flex',
  gap: 'calc(4px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair)',
  marginBottom: 'calc(16px * var(--sf))',
}
const tabBtn: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  fontWeight: 600,
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
}
const panelPad: CSSProperties = {
  padding: 'calc(4px * var(--sf))',
}

export function App() {
  const [state, setState] = useState<TallyState>(() => loadState())
  const [tab, setTab] = useState<'Today' | 'History'>('Today')
  const [goalInput, setGoalInput] = useState(String(state.goal))

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (tab === 'History') {
      const id = requestAnimationFrame(() => {
        postProcessDom()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [tab, state])

  const rows = useMemo(() => historyRows(state), [state])
  const heat = useMemo(() => heatCells(state), [state])
  const trend = useMemo(() => trendPoints(state), [state])
  const pct = state.goal > 0 ? Math.min(100, (state.current / state.goal) * 100) : 0

  function add() {
    setState((s) => addOne(s))
  }
  function reset() {
    setState((s) => resetCounter(s))
  }
  function saveGoal() {
    const n = Number(goalInput)
    setState((s) => setGoal(s, Number.isFinite(n) && n > 0 ? n : s.goal))
  }
  function clear() {
    setState((s) => clearHistory(s))
  }

  return (
    <AppShell
      name="Tally Counter"
      icon="timesheets"
      hue="teal"
      category="Productivity"
      side={
        <Rail
          note="Daily tally"
          chips={['Counter', 'Goal', 'Heatmap', 'Trend']}
        />
      }
    >
      <Card title="Daily counter">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(16px * var(--sf))',
            marginBottom: 'calc(16px * var(--sf))',
          }}
        >
          <div
            aria-label={`Counter ${state.current}`}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'calc(44px * var(--tf))',
              fontWeight: 700,
              lineHeight: 1,
              color: 'var(--ink)',
            }}
          >
            {state.current}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 'calc(13px * var(--tf))',
                color: 'var(--ink-60)',
                marginBottom: 'calc(6px * var(--sf))',
              }}
            >
              {progress(state)}
            </div>
            <div
              role="progressbar"
              aria-valuenow={state.current}
              aria-valuemin={0}
              aria-valuemax={state.goal}
              aria-label="Daily progress"
              style={{
                height: 'calc(8px * var(--sf))',
                background: 'var(--paper-deep)',
                border: 'calc(1px * var(--sf)) solid var(--hair)',
                borderRadius: 'calc(4px * var(--sf))',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 200ms ease',
                }}
              />
            </div>
          </div>
        </div>

        <FormGrid>
          <TextInput
            label="Daily Goal"
            type="number"
            inputMode="numeric"
            value={goalInput}
            onChange={(v) => setGoalInput(v)}
          />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={add}>Add</PrimaryButton>
          <Button kind="secondary" onClick={saveGoal}>Save</Button>
          <Button kind="ghost" onClick={reset}>Reset</Button>
        </Actions>
      </Card>

      <Card title="Tally log">
        <div role="tablist" aria-label="Views" style={tabList}>
          {(['Today', 'History'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              style={{
                ...tabBtn,
                color: tab === t ? 'var(--ink)' : 'var(--ink-60)',
                borderBottom: tab === t ? 'calc(2px * var(--sf)) solid var(--accent)' : 'none',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Today' && (
          <div role="tabpanel" style={panelPad}>
            <EmptyState
              mono="Today"
              title="Tally up"
              detail="Use the Add button above to count your daily events."
              actionLabel="Add a tally"
            />
          </div>
        )}

        {tab === 'History' && (
          <div role="tabpanel" aria-live="polite" style={panelPad}>
            <SectionLabel>History</SectionLabel>
            {rows.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No history yet"
                detail="Add a tally today to start the log."
                actionLabel="Add a tally"
                onAction={add}
              />
            ) : (
              <ul aria-label="History" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {rows.map((r) => (
                  <li key={r.date} aria-label={r.label} style={{ padding: 'calc(8px * var(--sf)) 0', borderBottom: 'calc(1px * var(--sf)) solid var(--hair)' }}>
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
              <Actions>
                <Button kind="ghost" onClick={clear}>Clear History</Button>
              </Actions>
            </div>

            <div style={{ marginTop: 'calc(20px * var(--sf))' }}>
              <SectionLabel>Trend</SectionLabel>
              <Chart type="bar" data={trend} title="Last 7 days" ariaLabel="Daily tally trend" />
            </div>

            <div style={{ marginTop: 'calc(20px * var(--sf))' }}>
              <SectionLabel>Year at a glance</SectionLabel>
              <Heatmap data={heat} year={new Date().getFullYear()} label="Daily tallies" />
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  )
}
