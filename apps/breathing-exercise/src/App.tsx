// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Body, Button, Card, MonoLabel, PrimaryButton, Stack } from '@lacuna/ui'
import { BigClock } from '@lacuna/big-clock'
import { ProgressRing } from '@lacuna/progress-ring'
import { createMockValue } from '@lacuna/host-mock'

type Pattern = 'box' | '478'

interface Phase {
  name: 'Inhale' | 'Hold' | 'Exhale'
  seconds: number
}

const PATTERNS: Record<Pattern, { label: string; phases: Phase[] }> = {
  box: {
    label: 'Box Breathing',
    phases: [
      { name: 'Inhale', seconds: 4 },
      { name: 'Hold', seconds: 4 },
      { name: 'Exhale', seconds: 4 },
      { name: 'Hold', seconds: 4 },
    ],
  },
  '478': {
    label: '4-7-8 Breathing',
    phases: [
      { name: 'Inhale', seconds: 4 },
      { name: 'Hold', seconds: 7 },
      { name: 'Exhale', seconds: 8 },
    ],
  },
}

interface Persisted {
  pattern: Pattern | null
  cycles: number
}

const KEY = 'lacuna.breathing-exercise.session'

function isPersisted(value: unknown): value is Persisted {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const pattern = v.pattern
  if (pattern !== null && pattern !== 'box' && pattern !== '478') return false
  return typeof v.cycles === 'number' && Number.isFinite(v.cycles)
}

const session = createMockValue<Persisted>({
  key: KEY,
  fallback: { pattern: null, cycles: 0 },
  validate: isPersisted,
})

export function App() {
  const [persisted, setPersisted] = useState<Persisted>(() => session.get())
  const [selected, setSelected] = useState<Pattern | null>(persisted.pattern)
  const [cycles, setCycles] = useState<number>(persisted.cycles)

  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [countdown, setCountdown] = useState(0)

  const pattern = selected ? PATTERNS[selected] : null
  const phase: Phase | null = pattern ? pattern.phases[phaseIndex] : null
  const cycleLength = pattern ? pattern.phases.reduce((sum, p) => sum + p.seconds, 0) : 0
  const elapsedInCycle = pattern
    ? pattern.phases.slice(0, phaseIndex).reduce((sum, p) => sum + p.seconds, 0) + (phase ? phase.seconds - countdown : 0)
    : 0
  const active = running || countdown > 0 || phaseIndex > 0
  const progressPct = active && cycleLength > 0 ? Math.round((elapsedInCycle / cycleLength) * 100) : 0

  const commit = (patternValue: Pattern | null, cycleCount: number) => {
    const next = { pattern: patternValue, cycles: cycleCount }
    setPersisted(next)
    session.set(next)
  }

  const start = () => {
    if (!selected) return
    setPhaseIndex(0)
    setCountdown(PATTERNS[selected].phases[0].seconds)
    setCycles(0)
    setStarted(true)
    setRunning(true)
    commit(selected, 0)
  }

  const pause = () => {
    setRunning(false)
  }

  const resume = () => {
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    setStarted(false)
    setPhaseIndex(0)
    setCountdown(0)
    setCycles(0)
    commit(selected, 0)
  }

  const stateRef = useRef({ phaseIndex: 0, countdown: 0, cycles: 0, selected: null as Pattern | null })
  stateRef.current = { phaseIndex, countdown, cycles, selected }

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const { selected: sel, phaseIndex: idx, countdown: cd, cycles: cy } = stateRef.current
      if (!sel) return
      const phases = PATTERNS[sel].phases
      if (cd > 1) {
        setCountdown(cd - 1)
        return
      }
      const nextIdx = idx + 1
      if (nextIdx < phases.length) {
        setPhaseIndex(nextIdx)
        setCountdown(phases[nextIdx].seconds)
        return
      }
      const done = cy + 1
      setPhaseIndex(0)
      setCountdown(phases[0].seconds)
      setCycles(done)
      commit(sel, done)
    }, 120)
    return () => window.clearInterval(id)
  }, [running])

  return (
    <AppShell
      name="Breathing Exercise"
      icon="tasks"
      hue="rust"
      category="Personal"
      meta={running ? (phase ? phase.name : 'Breathing') : 'Ready'}
    >
      <Card mono="Pattern" title="Breathing Exercise">
        <Stack>
          <Body>Follow a pattern at your own pace. The clock steps through each phase and counts the cycles you complete.</Body>
          <Stack>
            {(Object.keys(PATTERNS) as Pattern[]).map((key) => (
              <Button
                key={key}
                kind={selected === key ? 'primary' : 'secondary'}
                onClick={() => {
                  if (selected !== key) {
                    setRunning(false)
                    setStarted(false)
                    setPhaseIndex(0)
                    setCountdown(0)
                  }
                  setSelected(key)
                  commit(key, cycles)
                }}
              >
                {PATTERNS[key].label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Card>

      <Card mono={pattern ? `${cycles} ${cycles === 1 ? 'cycle' : 'cycles'}` : 'Ready'} title="Breath">
        {pattern ? (
          <Stack>
            <div
              id="big-clock"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}
            >
              <MonoLabel sm>{running || countdown > 0 ? phase!.name : 'Ready'}</MonoLabel>
              <BigClock ms={countdown * 1000} label="Breath countdown" />
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)', fontSize: 'calc(20px * var(--tf))' }}>{countdown}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
              <div id="progress-ring">
                <ProgressRing value={progressPct} max={100} label="Cycle progress" size={14} strokeWidth={3}>
                  {progressPct}%
                </ProgressRing>
              </div>
              <MonoLabel sm>Cycles: {cycles}</MonoLabel>
            </div>
            <Actions>
              {running ? (
                <PrimaryButton onClick={pause}>Pause</PrimaryButton>
              ) : (
                <PrimaryButton onClick={started ? resume : start}>{started ? 'Resume' : 'Start'}</PrimaryButton>
              )}
              <Button onClick={reset}>Reset</Button>
            </Actions>
          </Stack>
        ) : (
          <Body>Select a pattern to begin</Body>
        )}
      </Card>
    </AppShell>
  )
}
