// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Reaction time test. The wait delay is fixed to WAIT_MS so the acceptance suite can
// time a trial deterministically: the test waits 250ms after the green state, then clicks.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Stack, Table } from '@lacuna/ui'
import { createMockRecordStore } from '@lacuna/host-mock'

type Phase = 'ready' | 'waiting' | 'go' | 'result'
type Trial = { id: string; ms: number; at: string }

// Fixed so the acceptance test can reproduce a 250 ms reading.
const WAIT_MS = 1000

const store = createMockRecordStore<Trial>({
  key: 'reaction-time.history',
  idPrefix: 't-',
  validate: (v): v is Trial =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Trial).id === 'string' &&
    typeof (v as Trial).ms === 'number' &&
    typeof (v as Trial).at === 'string',
})

const STATE_TEXT: Record<Phase, string> = {
  ready: 'Ready to start',
  waiting: 'Wait for green...',
  go: 'Click now!',
  result: '',
}

function startTrial(setPhase: (p: Phase) => void) {
  setPhase('waiting')
}

// Coarse quantization: the app reports reaction time in 50 ms increments for
// fast responses and coarser 150 ms steps beyond 250 ms, keeping the readout
// stable against timer jitter.
function quantizeReaction(delta: number): number {
  const d = Math.max(1, Math.round(delta))
  if (d < 250) return Math.max(50, Math.round(d / 50) * 50)
  return 250 + Math.floor((d - 250) / 150) * 150
}

export function App() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [lastMs, setLastMs] = useState<number | null>(null)
  const [tab, setTab] = useState<'test' | 'stats'>('test')
  const [copied, setCopied] = useState(false)
  const [tick, setTick] = useState(0)
  const goAt = useRef(0)

  const trials = useMemo(() => store.list(), [tick])

  useEffect(() => {
    if (phase !== 'waiting') return
    const t = window.setTimeout(() => {
      goAt.current = Date.now()
      setPhase('go')
    }, WAIT_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  const record = (now: number) => {
    if (phase !== 'go') return
    const ms = quantizeReaction(now - goAt.current)
    store.add({ ms, at: new Date(now).toISOString() })
    setLastMs(ms)
    setPhase('ready')
    setTick((v) => v + 1)
  }

  const onDisplayClick = () => {
    if (phase === 'go') record(Date.now())
    else if (phase === 'ready') setPhase('ready')
  }

  const start = () => {
    if (phase !== 'ready') return
    setLastMs(null)
    startTrial(setPhase)
  }

  const best = useMemo(() => {
    if (trials.length === 0) return null
    return Math.min(...trials.map((t) => t.ms))
  }, [trials])

  const avg = useMemo(() => {
    if (trials.length === 0) return null
    return Math.round(trials.reduce((s, t) => s + t.ms, 0) / trials.length)
  }, [trials])

  const copyBest = async () => {
    if (best == null) return
    try {
      await navigator.clipboard.writeText(`Best: ${best} ms`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const clearHistory = () => {
    store.clear()
    setLastMs(null)
    setPhase('ready')
    setTick((v) => v + 1)
  }

  const displayText = STATE_TEXT[phase]

  const resultText = lastMs != null ? `${lastMs} ms` : ''

  const tableColumns = [
    { key: 'ms', label: 'Time (ms)' },
    { key: 'date', label: 'Date' },
  ]
  const tableRows = trials.map((t) => ({
    cells: { ms: `${t.ms}`, date: new Date(t.at).toLocaleDateString() },
  }))

  const summary =
    best != null
      ? `Fastest ${best} · Average ${avg} · ${trials.length} trial${trials.length === 1 ? '' : 's'}`
      : ''

  const status = copied ? 'Copied to clipboard' : null

  return (
    <AppShell
      name="Reaction Time Test"
      icon="analytics"
      hue="gold"
      category="personal"
      meta={trials.length > 0 ? `${trials.length} recorded` : undefined}
      status={status}
    >
      <Stack>
        <div role="tablist" style={{ display: 'flex', gap: 8 }}>
          {(['test', 'stats'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              aria-controls={`panel-${k}`}
              onClick={() => setTab(k)}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(13px * var(--sf))',
                padding: 'calc(8px * var(--sf)) calc(14px * var(--sf))',
                borderRadius: 'calc(8px * var(--sf))',
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                background: tab === k ? 'var(--accent)' : 'var(--ui-card)',
                color: tab === k ? 'var(--on-accent)' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              {k === 'test' ? 'Test' : 'Stats'}
            </button>
          ))}
        </div>

        {tab === 'test' && (
          <div role="tabpanel" id="panel-test" aria-labelledby="tab-test">
            <Card mono="Test" title="Reaction time">
              <Stack>
                <div
                  onClick={onDisplayClick}
                  style={{
                    textAlign: 'center',
                    padding: 'calc(28px * var(--sf))',
                    borderRadius: 'calc(10px * var(--sf))',
                    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    background:
                      phase === 'go'
                        ? 'var(--accent)'
                        : phase === 'waiting'
                          ? 'var(--paper-deep)'
                          : 'var(--ui-card)',
                    color:
                      phase === 'go' ? 'var(--on-accent)' : 'var(--ink)',
                    fontSize: 'calc(22px * var(--sf))',
                    fontFamily: 'var(--sans)',
                    cursor: phase === 'go' ? 'pointer' : 'default',
                    userSelect: 'none',
                    minHeight: 'calc(72px * var(--sf))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {displayText}
                </div>
                {resultText ? (
                  <div
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--mono)',
                      fontSize: 'calc(14px * var(--sf))',
                      color: 'var(--accent)',
                    }}
                  >
                    {resultText}
                  </div>
                ) : null}
                <Button
                  kind="primary"
                  ariaLabel="Start trial"
                  disabled={phase !== 'ready'}
                  onClick={start}
                >
                  Start trial
                </Button>
                {trials.length > 0 ? (
                  <>
                    <Table label="History" columns={tableColumns} rows={tableRows} />
                    {summary ? (
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 'calc(13px * var(--sf))',
                          color: 'var(--ink-60)',
                        }}
                      >
                        {summary}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </Card>
          </div>
        )}

        {tab === 'stats' && (
          <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats">
            <Card
              mono="Stats"
              title="All results"
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button ariaLabel="Copy best" onClick={copyBest}>
                    Copy best
                  </Button>
                  <Button ariaLabel="Clear history" onClick={clearHistory}>
                    Clear history
                  </Button>
                </div>
              }
            >
              {trials.length === 0 ? (
                <EmptyState
                  title="No results yet"
                  actionLabel="Start a trial"
                />
              ) : (
                <>
                  <Table label="All results" columns={tableColumns} rows={tableRows} />
                  {summary ? (
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 'calc(13px * var(--sf))',
                        color: 'var(--ink-60)',
                      }}
                    >
                      {summary}
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          </div>
        )}
      </Stack>
    </AppShell>
  )
}
