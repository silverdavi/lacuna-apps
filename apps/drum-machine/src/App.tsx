import { useEffect, useRef, useState } from 'react'
import { Card, Stack } from '@lacuna/ui'
import { STEPS, loadPattern, savePattern } from './host'
import type { PatternState } from './host'
import './app.css'

const MIN_TEMPO = 40
const MAX_TEMPO = 240
const DEFAULT_TEMPO = 120

type StepVoice = 'kick' | 'snare' | 'hat'

function voiceFor(index: number): StepVoice {
  if (index % 4 === 0) return 'kick'
  if (index % 4 === 2) return 'snare'
  return 'hat'
}

function stepLabel(index: number): string {
  const n = index + 1
  const words: Record<number, string> = {
    10: 'Ten',
    11: 'Eleven',
    12: 'Twelve',
    13: 'Thirteen',
    14: 'Fourteen',
    15: 'Fifteen',
    16: 'Sixteen',
  }
  if (n >= 10) return `Step ${words[n]}`
  return `Step ${n}`
}

type Engine = {
  start: (pattern: PatternState) => void
  stop: () => void
}

function useAudioEngine(): Engine {
  const stateRef = useRef<{ ctx: AudioContext | null; timer: number | null; pattern: PatternState | null; playing: boolean }>({
    ctx: null,
    timer: null,
    pattern: null,
    playing: false,
  })

  const ensureContext = (): AudioContext | null => {
    const state = stateRef.current
    if (state.ctx) return state.ctx
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    state.ctx = new Ctor()
    return state.ctx
  }

  const stop = () => {
    const state = stateRef.current
    state.playing = false
    if (state.timer !== null) {
      window.clearInterval(state.timer)
      state.timer = null
    }
    void state.ctx?.resume().catch(() => {})
  }

  const playStep = (index: number) => {
    const state = stateRef.current
    const audio = state.ctx
    if (!audio) return
    const voice = voiceFor(index)
    const now = audio.currentTime

    if (voice === 'kick') {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12)
      gain.gain.setValueAtTime(0.9, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(now)
      osc.stop(now + 0.25)
      return
    }

    if (voice === 'snare') {
      const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * 0.18)), audio.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.5)
      }
      const noise = audio.createBufferSource()
      noise.buffer = buffer
      const filter = audio.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 1200
      const gain = audio.createGain()
      gain.gain.setValueAtTime(0.55, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(audio.destination)
      noise.start(now)
      noise.stop(now + 0.2)
      return
    }

    const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * 0.06)), audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 5)
    }
    const noise = audio.createBufferSource()
    noise.buffer = buffer
    const filter = audio.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 6500
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(audio.destination)
    noise.start(now)
    noise.stop(now + 0.08)
  }

  const start = (pattern: PatternState) => {
    const audio = ensureContext()
    if (!audio) return
    stop()
    const state = stateRef.current
    state.pattern = pattern
    state.playing = true
    const stepMs = ((60 / pattern.tempo) * 1000) / 4
    const first = pattern.steps.findIndex((on) => on)
    if (first < 0) {
      state.playing = false
      return
    }
    window.setTimeout(() => {
      const current = stateRef.current
      if (!current.playing || !current.pattern) return
      playStep(first)
      let index = first
      current.timer = window.setInterval(() => {
        const live = stateRef.current
        if (!live.playing || !live.pattern) return
        index = (index + 1) % STEPS
        if (live.pattern.steps[index]) playStep(index)
      }, stepMs)
    }, 0)
  }

  useEffect(() => {
    const state = stateRef.current
    return () => {
      if (state.timer !== null) window.clearInterval(state.timer)
      state.playing = false
      void state.ctx?.close().catch(() => {})
      state.ctx = null
    }
  }, [])

  return { start, stop }
}

export function App() {
  const [pattern, setPattern] = useState<PatternState>(() => loadPattern())
  const [tempoInput, setTempoInput] = useState(String(pattern.tempo))
  const [playing, setPlaying] = useState(false)
  const engine = useAudioEngine()

  useEffect(() => {
    savePattern(pattern)
  }, [pattern])

  useEffect(() => {
    return () => {
      engine.stop()
    }
  }, [engine])

  const toggleStep = (index: number) => {
    setPattern((current) => {
      const steps = [...current.steps]
      steps[index] = !steps[index]
      return { ...current, steps }
    })
  }

  const commitTempo = (raw: string) => {
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      setTempoInput(String(pattern.tempo))
      return
    }
    const tempo = Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(value)))
    setTempoInput(String(tempo))
    setPattern((current) => (current.tempo === tempo ? current : { ...current, tempo }))
  }

  const onCellKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleStep(index)
      return
    }
    const num = Number(event.key)
    if (Number.isInteger(num) && num >= 1 && num <= STEPS) {
      event.preventDefault()
      toggleStep(num - 1)
    }
  }

  const play = () => {
    engine.start(pattern)
    setPlaying(true)
  }

  const stop = () => {
    engine.stop()
    setPlaying(false)
  }

  const activeSteps = pattern.steps
    .map((on, index) => (on ? index + 1 : null))
    .filter((n): n is number => n !== null)
  const patternText = activeSteps.length > 0 ? activeSteps.join(', ') : '—'

  return (
    <main className="dm-shell">
      <Card mono="Shelf" className="dm-card">
        <Stack>
          <h1 className="dm-title">Drum Machine</h1>
          <div className="dm-grid" role="grid" aria-label="16-step rhythm grid">
            <div role="row">
              {pattern.steps.map((on, index) => (
                <div
                  key={index}
                  className={`dm-td${on ? ' dm-cell-on' : ''}`}
                  role="cell"
                  aria-label={stepLabel(index)}
                >
                  <button
                    type="button"
                    className="dm-cell-btn"
                    aria-pressed={on}
                    aria-label={stepLabel(index)}
                    onClick={() => toggleStep(index)}
                    onKeyDown={(e) => onCellKeyDown(e, index)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="dm-readout">
            Pattern: {patternText}
            <span className="dm-sep" aria-hidden="true">
              ·
            </span>
            Tempo: {pattern.tempo}
          </div>
          <label className="dm-tempo-label">
            Tempo{' '}
            <input
              className="dm-tempo-input"
              type="text"
              inputMode="numeric"
              value={tempoInput}
              onChange={(e) => setTempoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTempo(tempoInput)
              }}
              onBlur={() => commitTempo(tempoInput)}
            />
          </label>
          <button type="button" className="dm-play-btn" onClick={playing ? stop : play}>
            {playing ? 'Stop' : 'Play'}
          </button>
        </Stack>
      </Card>
    </main>
  )
}
