import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Body, Button, Card, EmptyState, Kpi, KpiRow, Rail, Table, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { scheduleClick, scheduleNote, scheduleTone } from '@lacuna/tone-synth'
import { patternsStore, tempoStore, historyStore } from './host/mock'

const STEPS = 16
const MIN_BPM = 20
const MAX_BPM = 240
const DEFAULT_BPM = 120

type TrackId = 'bass' | 'snare' | 'hihat'

const TRACKS: { id: TrackId; label: string; note: string }[] = [
  { id: 'bass', label: 'Bass', note: 'C2' },
  { id: 'snare', label: 'Snare', note: 'D3' },
  { id: 'hihat', label: 'Hi-hat', note: 'B5' },
]

const EMPTY_PATTERN: Record<TrackId, boolean[]> = {
  bass: Array(STEPS).fill(false),
  snare: Array(STEPS).fill(false),
  hihat: Array(STEPS).fill(false),
}

type HistoryEntry = { id: string; name: string; bpm: number; savedAt: string; steps: number }

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function timestamp() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function activeAt(index: number, on: Record<TrackId, boolean[]>) {
  return TRACKS.some((track) => on[track.id][index])
}

const WORDS: Record<number, string> = {
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
}

function stepName(index: number) {
  const n = index + 1
  return WORDS[n] ? `Step ${WORDS[n]}` : `Step ${n}`
}

function patternString(on: Record<TrackId, boolean[]>) {
  const line = (track: TrackId) =>
    on[track]
      .map((lit, i) => (i % 4 === 0 ? ' ' : ''))
      .map((lit) => (lit ? '1' : '.'))
      .join('')
  return [line('bass'), line('snare'), line('hihat')].join('  ')
}

function TabBar({ items, active, onSelect }: { items: string[]; active: string; onSelect: (value: string) => void }) {
  return (
    <div className="lc-tabs" role="tablist" aria-label="View">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          role="tab"
          aria-selected={item === active}
          className={`lc-tab${item === active ? ' active' : ''}`}
          style={{ color: 'var(--ink-80)' }}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function playStep(ctx: AudioContext, index: number, on: Record<TrackId, boolean[]>) {
  if (on.bass[index]) scheduleTone(ctx, { freq: 65.41, duration: 0.16, gain: 0.45, type: 'sine' })
  if (on.snare[index]) scheduleNote(ctx, { midi: 51, duration: 0.09, gain: 0.4 })
  if (on.hihat[index]) scheduleClick(ctx, { duration: 0.02, gain: 0.6 })
}

export function App() {
  const [pattern, setPattern] = useState<Record<TrackId, boolean[]>>(() => patternsStore.get())
  const [tempo, setTempo] = useState<number>(() => tempoStore.get())
  const [running, setRunning] = useState(false)
  const [playingStep, setPlayingStep] = useState<number | null>(null)
  const [tab, setTab] = useState('Pattern')
  const [history, setHistory] = useState<HistoryEntry[]>(() => historyStore.get())
  const [tempoDraft, setTempoDraft] = useState(String(tempo))
  const [tempoError, setTempoError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [touched, setTouched] = useState<Set<number>>(() => new Set())
  const clipboard = useClipboard()
  const audioRef = useRef<AudioContext | null>(null)
  const patternRef = useRef(pattern)
  const tempoRef = useRef(tempo)
  const playingRef = useRef(false)

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    tempoRef.current = tempo
  }, [tempo])

  useEffect(() => {
    if (!running) return
    const ctx = new AudioContext()
    audioRef.current = ctx
    let index = 0
    let timer: number | undefined
    const stepMs = 60000 / tempoRef.current
    playingRef.current = true
    const tick = () => {
      playStep(ctx, index, patternRef.current)
      setPlayingStep(index)
      index = (index + 1) % STEPS
      timer = window.setTimeout(tick, stepMs)
    }
    tick()
    return () => {
      playingRef.current = false
      if (timer !== undefined) window.clearTimeout(timer)
      void ctx.close()
      audioRef.current = null
      setPlayingStep(null)
    }
  }, [running])

  const steps = useMemo(() => {
    let count = 0
    for (let i = 0; i < STEPS; i += 1) if (activeAt(i, pattern)) count += 1
    return count
  }, [pattern])
  const total = STEPS * TRACKS.length
  const pct = Math.round((steps / total) * 100)

  const clearPattern = () => {
    patternsStore.set(EMPTY_PATTERN)
    setPattern({
      bass: Array(STEPS).fill(false),
      snare: Array(STEPS).fill(false),
      hihat: Array(STEPS).fill(false),
    })
    setTouched(new Set())
  }

  const savePattern = () => {
    const entry: HistoryEntry = {
      id: `p-${Date.now()}`,
      name: `Pattern ${history.length + 1}`,
      bpm: tempo,
      savedAt: timestamp(),
      steps,
    }
    const next = [entry, ...history].slice(0, 10)
    historyStore.set(next)
    setHistory(next)
    setCopied(false)
  }

  const applyTempo = (raw: string) => {
    setTempoDraft(raw)
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < MIN_BPM || parsed > MAX_BPM) {
      setTempoError('Tempo must be a whole number between 20 and 240 BPM')
      return
    }
    setTempoError(null)
    tempoStore.set(parsed)
    setTempo(parsed)
  }

  const nudgeTempo = (delta: number) => {
    applyTempo(String(Math.min(MAX_BPM, Math.max(MIN_BPM, tempo + delta))))
  }

  const exportPattern = async () => {
    const text = `Drum Machine — ${tempo} BPM\n${patternString(pattern)}`
    setCopied(false)
    await clipboard.copy(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const removeHistory = (id: string) => {
    const next = history.filter((entry) => entry.id !== id)
    historyStore.set(next)
    setHistory(next)
  }

  const active = Array.from({ length: STEPS }, (_, i) => activeAt(i, pattern))
  const activeString = active
    .map((lit, i) => (i % 4 === 0 ? ' ' : ''))
    .map((lit) => (lit ? '1' : '.'))
    .join('')
  const activeNumbers = active
    .map((lit, i) => (lit ? i + 1 : null))
    .filter((n): n is number => n !== null)
  const patternReadout = activeNumbers.length ? activeNumbers.join(', ') : '—'

  const markTouched = (index: number) =>
    setTouched((current) => (current.has(index) ? current : new Set(current).add(index)))

  const lightCell = (index: number) => {
    setPattern((current) => {
      const next: Record<TrackId, boolean[]> = {
        bass: [...current.bass],
        snare: [...current.snare],
        hihat: [...current.hihat],
      }
      next.bass[index] = true
      patternsStore.set(next)
      return next
    })
    markTouched(index)
  }

  const clearCell = (index: number) => {
    setPattern((current) => {
      const next: Record<TrackId, boolean[]> = {
        bass: current.bass.map((lit, i) => (i === index ? false : lit)),
        snare: current.snare.map((lit, i) => (i === index ? false : lit)),
        hihat: current.hihat.map((lit, i) => (i === index ? false : lit)),
      }
      patternsStore.set(next)
      return next
    })
    markTouched(index)
  }

  const activateStep = (index: number) => {
    setPattern((current) => {
      const target = TRACKS[0].id
      const next: Record<TrackId, boolean[]> = {
        bass: [...current.bass],
        snare: [...current.snare],
        hihat: [...current.hihat],
      }
      next[target][index] = true
      patternsStore.set(next)
      return next
    })
    setTouched((current) => {
      if (current.has(index)) return current
      const next = new Set(current)
      next.add(index)
      return next
    })
  }

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key
    if (key >= '1' && key <= '9') {
      event.preventDefault()
      activateStep(Number(key) - 1)
    } else if (key === '0') {
      event.preventDefault()
      activateStep(9)
    }
  }

  return (
    <AppShell
      name="Drum Machine"
      icon="grid"
      hue="brown"
      category="Personal"
      meta={`${steps} active`}
      status={
        running
          ? `Playing · ${tempo} BPM · step ${String((playingStep ?? 0) + 1).padStart(2, '0')}`
          : `${tempo} BPM · ${steps} active · pattern saved on this device`
      }
      side={
        <Rail
          title="Session"
          note={running ? 'Playing' : 'Stopped'}
          chips={[`${tempo} BPM`, `${steps} active`, `${pct}% lit`, '16 steps']}
        >
          <KpiRow>
            <Kpi value={steps} label="Active hits" accent />
            <Kpi value={tempo} label="Tempo (BPM)" />
            <Kpi value={history.length} label="Saved patterns" />
          </KpiRow>
        </Rail>
      }
    >
      <Card mono="View" title="Drum Machine">
        <TabBar items={['Pattern', 'History']} active={tab} onSelect={setTab} />
      </Card>

      {tab === 'Pattern' ? (
        <>
          <Card
            mono={`${tempo} BPM`}
            title="Step grid"
            actions={
              <Button kind={running ? 'primary' : 'secondary'} onClick={() => setRunning((value) => !value)}>
                {running ? 'Stop' : 'Play'}
              </Button>
            }
          >
            <div className="dm-grid" role="table" aria-label="Step grid" onKeyDown={onGridKeyDown}>
              <div className="dm-row dm-head" role="row">
                <div className="dm-label" role="rowheader">Step</div>
                {Array.from({ length: STEPS }, (_, i) => (
                  <div key={i} className="dm-colhead" role="columnheader" aria-label={stepName(i)}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="dm-row" role="row">
                <div className="dm-label" role="rowheader">
                  Active
                </div>
                {active.map((lit, i) => (
                  <button
                    key={i}
                    type="button"
                    className={
                      'dm-cell' +
                      (lit ? ' on' : '') +
                      (running && playingStep === i ? ' now' : '')
                    }
                    role="cell"
                    aria-label={stepName(i)}
                    {...(touched.has(i) ? { 'aria-pressed': lit } : {})}
                    aria-description={
                      TRACKS.filter((track) => pattern[track.id][i])
                        .map((track) => track.label)
                        .join(' + ') || 'off'
                    }
                    onClick={() => (activeAt(i, pattern) ? clearCell(i) : lightCell(i))}
                  >
                    <span aria-hidden>{lit ? '1' : '.'}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="dm-readout" aria-live="polite">
              Pattern: {patternReadout}
            </p>
            <div className="dm-actions">
              <Button kind="secondary" onClick={clearPattern}>
                Clear
              </Button>
              <Button kind="primary" onClick={savePattern}>
                Save pattern
              </Button>
              <Button kind="secondary" onClick={() => void exportPattern()}>
                {copied ? 'Copied' : 'Export'}
              </Button>
            </div>
          </Card>

          <Card mono="Pattern" title="Tracks">
            <div className="dm-tracks">
              {TRACKS.map((track) => (
                <div key={track.id} className="dm-track-row">
                  <span className="dm-track-label">{track.label}</span>
                  <span className="dm-track-hits">{pattern[track.id].filter(Boolean).length} hits</span>
                  <span className="dm-track-seq" aria-hidden>
                    {pattern[track.id]
                      .map((lit) => (lit ? '1' : '.'))
                      .join('')}
                  </span>
                  <Button
                    kind="ghost"
                    ariaLabel={`Clear ${track.label}`}
                    onClick={() => {
                      setPattern((current) => {
                        const next = { ...current, [track.id]: Array(STEPS).fill(false) }
                        patternsStore.set(next)
                        return next
                      })
                    }}
                  >
                    Clear
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card mono="Tempo" title="Playback">
            <p className="dm-readout dm-tempo-readout">Tempo: {tempo}</p>
            <div className="dm-tempo">
              <div className="dm-field">
                <TextInput
                  label="Tempo"
                  type="number"
                  inputMode="numeric"
                  value={tempoDraft}
                  onChange={applyTempo}
                  error={tempoError}
                />
              </div>
              <div className="dm-tempo-nudges">
                <Button kind="secondary" ariaLabel="Slower by 4 BPM" onClick={() => nudgeTempo(-4)}>
                  -4
                </Button>
                <Button kind="secondary" ariaLabel="Faster by 4 BPM" onClick={() => nudgeTempo(4)}>
                  +4
                </Button>
                <Button kind="secondary" ariaLabel="Set 120 BPM" onClick={() => nudgeTempo(120 - tempo)}>
                  120
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card mono={`${history.length} saved`} title="History">
          {history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No patterns saved yet"
              detail="Save a pattern on the Pattern tab to keep it here."
              actionLabel="Back to pattern"
              onAction={() => setTab('Pattern')}
            />
          ) : (
            <Table
              label="Saved patterns"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'savedAt', label: 'Saved at' },
                { key: 'bpm', label: 'BPM', num: true },
                { key: 'steps', label: 'Hits', num: true },
                { key: 'actions', label: '' },
              ]}
              rows={history.map((entry) => ({
                cells: {
                  name: entry.name,
                  savedAt: entry.savedAt,
                  bpm: entry.bpm,
                  steps: entry.steps,
                  actions: (
                    <div className="dm-history-actions">
                      <Button kind="ghost" ariaLabel={`Delete ${entry.name}`} onClick={() => removeHistory(entry.id)}>
                        Delete
                      </Button>
                    </div>
                  ),
                },
              }))}
            />
          )}
        </Card>
      )}

      <Card mono="Guide" title="How to play">
        <Body sm>
          Tap cells to light hits, set the tempo, then press Play. The step grid plays left to right,
          one sixteenth per tick, and the pattern is kept on this device across reloads.
        </Body>
      </Card>
    </AppShell>
  )
}
