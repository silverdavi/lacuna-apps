// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { AppShell, Card, Stack, TextInput, Button, Actions } from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type SolveFor } from './host'

interface State {
  distance: string
  time: string
  pace: string
  solveFor: SolveFor
}

type Computed =
  | { kind: 'ok'; distance: number; time: number; pace: number; solvedFor: SolveFor }
  | { kind: 'error'; message: string }

function compute(state: State): Computed {
  const { distance, time, pace, solveFor } = state
  const d = Number(distance)
  const t = Number(time)
  const p = Number(pace)

  if (distance !== '' && d <= 0) {
    return { kind: 'error', message: 'Distance must be greater than 0' }
  }
  if (time !== '' && t <= 0) {
    return { kind: 'error', message: 'Time must be greater than 0' }
  }
  if (pace !== '' && p <= 0) {
    return { kind: 'error', message: 'Pace must be greater than 0' }
  }

  if (solveFor === 'pace') {
    if (distance === '' || time === '' || d <= 0 || t <= 0) {
      return { kind: 'error', message: 'Enter distance and time' }
    }
    return { kind: 'ok', distance: d, time: t, pace: t / d, solvedFor: 'pace' }
  }
  if (solveFor === 'time') {
    if (distance === '' || pace === '' || d <= 0 || p <= 0) {
      return { kind: 'error', message: 'Enter distance and pace' }
    }
    return { kind: 'ok', distance: d, time: d * p, pace: p, solvedFor: 'time' }
  }
  if (time === '' || pace === '' || t <= 0 || p <= 0) {
    return { kind: 'error', message: 'Enter time and pace' }
  }
  return { kind: 'ok', distance: t / p, time: t, pace: p, solvedFor: 'distance' }
}

function intOrZero(v: number): number {
  return Number.isInteger(v) ? v : 0
}

function fmtUnit(v: number, unit: string): string {
  const n = Number.isInteger(v) ? String(v) : v.toFixed(2)
  return `${n} ${unit}`
}

function loadInitialState(): State {
  const record = host.read()
  if (record) {
    return {
      distance: record.distance,
      time: record.time,
      pace: record.pace,
      solveFor: record.solveFor,
    }
  }
  return { distance: '', time: '', pace: '', solveFor: 'pace' }
}

export function App() {
  const [state, setState] = useState<State>(loadInitialState)
  const { copied, copy } = useClipboard()
  const [tab, setTab] = useState<'Table' | 'Chart'>('Table')
  const computed = compute(state)

  // When the computed result is valid, write the solved-for value back into
  // the input and persist the record so a reload keeps the last calculation.
  const lastKey = useRef('')
  useEffect(() => {
    if (computed.kind !== 'ok') {
      lastKey.current = ''
      return
    }
    const key = `${computed.solvedFor}:${computed[computed.solvedFor].toFixed(2)}`
    if (key === lastKey.current) return
    lastKey.current = key
    setState((prev) => ({
      ...prev,
      [computed.solvedFor]: computed[computed.solvedFor].toFixed(2),
    }))
    host.write({
      solveFor: computed.solvedFor,
      distance: state.distance,
      time: state.time,
      pace: state.pace,
      at: Date.now(),
    })
  })

  function update(key: keyof State, value: string) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function handleCopy() {
    if (computed.kind === 'ok') {
      const text = `Pace: ${computed.pace.toFixed(2)} min/km, Distance: ${computed.distance.toFixed(2)} km, Time: ${computed.time.toFixed(2)} min`
      void copy(text)
    }
  }

  const chartData =
    computed.kind === 'ok'
      ? [{ label: `${computed.distance.toFixed(2)} km`, value: computed.pace }]
      : []

  const chartLabel =
    computed.kind === 'ok'
      ? `x=${intOrZero(computed.distance)}, y=${intOrZero(computed.pace)}`
      : 'No data'

  return (
    <AppShell
      name="Running Pace Calculator"
      icon="timesheets"
      hue="gold"
      category="Productivity"
      meta="Solve for pace, time, or distance"
    >
      <Stack>
        <Card mono="Inputs" title="Inputs">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(16px * var(--sf))',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
              <label
                className="lc-field-label"
                htmlFor="solve-for"
                style={{ fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}
              >
                Solve for
              </label>
              <select
                id="solve-for"
                className="lc-input"
                value={state.solveFor}
                onChange={(e) => update('solveFor', e.target.value as SolveFor)}
              >
                <option value="pace">Pace</option>
                <option value="time">Time</option>
                <option value="distance">Distance</option>
              </select>
            </div>
            <TextInput
              label="Distance (km)"
              value={state.distance}
              onChange={(v) => update('distance', v)}
              inputMode="decimal"
              placeholder="0"
            />
            <TextInput
              label="Time (min)"
              value={state.time}
              onChange={(v) => update('time', v)}
              inputMode="decimal"
              placeholder="0"
            />
            <TextInput
              label="Pace (min/km)"
              value={state.pace}
              onChange={(v) => update('pace', v)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          {computed.kind === 'error' ? (
            <div
              role="alert"
              style={{
                color: 'var(--danger)',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(13px * var(--tf))',
                marginTop: 'calc(12px * var(--sf))',
              }}
            >
              {computed.message}
            </div>
          ) : null}
        </Card>

        {computed.kind === 'ok' ? (
          <Stack>
            <Card
              mono="Result"
              title="Result"
              actions={
                <Actions>
                  <Button kind="ghost" onClick={handleCopy} ariaLabel="Copy result">
                    Copy result
                  </Button>
                </Actions>
              }
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(24px * var(--sf))',
                  alignItems: 'baseline',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                  <span style={{ fontSize: 'calc(22px * var(--tf))' }}>
                    {computed.distance.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: 'calc(13px * var(--tf))',
                      color: 'var(--ink-60)',
                      marginLeft: 'calc(4px * var(--sf))',
                    }}
                  >
                    km
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                  <span style={{ fontSize: 'calc(22px * var(--tf))' }}>
                    {computed.time.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: 'calc(13px * var(--tf))',
                      color: 'var(--ink-60)',
                      marginLeft: 'calc(4px * var(--sf))',
                    }}
                  >
                    min
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                  <span style={{ fontSize: 'calc(22px * var(--tf))' }}>
                    {computed.pace.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: 'calc(13px * var(--tf))',
                      color: 'var(--ink-60)',
                      marginLeft: 'calc(4px * var(--sf))',
                    }}
                  >
                    min/km
                  </span>
                </div>
              </div>
              {copied ? (
                <div
                  role="status"
                  style={{
                    fontSize: 'calc(13px * var(--tf))',
                    color: 'var(--ink)',
                    fontFamily: 'var(--mono)',
                    marginTop: 'calc(8px * var(--sf))',
                  }}
                >
                  Result copied to clipboard
                </div>
              ) : null}
            </Card>

            <Card mono="Details" title="Details">
              <div role="tablist" className="lc-tabs">
                <button
                  role="tab"
                  type="button"
                  className={tab === 'Table' ? 'lc-tab active' : 'lc-tab'}
                  aria-selected={tab === 'Table'}
                  onClick={() => setTab('Table')}
                >
                  Table
                </button>
                <button
                  role="tab"
                  type="button"
                  className={tab === 'Chart' ? 'lc-tab active' : 'lc-tab'}
                  aria-selected={tab === 'Chart'}
                  onClick={() => setTab('Chart')}
                >
                  Chart
                </button>
              </div>
              <div style={{ paddingTop: 'calc(12px * var(--sf))' }}>
                <table
                  aria-label="Breakdown"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(13px * var(--tf))',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                      }}
                    >
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 'calc(8px * var(--sf))',
                          fontWeight: 400,
                          color: 'var(--ink)',
                        }}
                      >
                        Distance
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 'calc(8px * var(--sf))',
                          fontWeight: 400,
                          color: 'var(--ink)',
                        }}
                      >
                        Time
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 'calc(8px * var(--sf))',
                          fontWeight: 400,
                          color: 'var(--ink)',
                        }}
                      >
                        Pace
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          color: 'var(--ink)',
                        }}
                      >
                        {fmtUnit(computed.distance, 'km')}
                      </td>
                      <td
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          color: 'var(--ink)',
                        }}
                      >
                        {fmtUnit(computed.time, 'min')}
                      </td>
                      <td
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          color: 'var(--ink)',
                        }}
                      >
                        {fmtUnit(computed.pace, 'min/km')}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
                  <Chart type="line" data={chartData} ariaLabel={chartLabel} />
                </div>
              </div>
            </Card>
          </Stack>
        ) : null}
      </Stack>
    </AppShell>
  )
}
