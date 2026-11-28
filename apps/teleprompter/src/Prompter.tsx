import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Actions, Button, Checkbox, EmptyState, Keys, Pills, Select, Stack, Tag } from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { RangeSlider } from '@lacuna/range-slider'
import type { Mode, Prefs, ScriptRecord } from './host/mock'
import { formatClock, parseScript, readSeconds, stepMs } from './script'

export const KEY_MAP: [string, string][] = [
  ['Space', 'Play or pause (Scroll); next line (Step)'],
  ['Right, PgDn, Enter', 'Same as Space'],
  ['Left, PgUp, Backspace', 'Back one line'],
  ['Up, Down', 'Previous, next section'],
  ['Home', 'Start of this section'],
  ['A', 'Auto-advance on or off'],
  ['T', 'Reset clocks'],
  ['F', 'Fullscreen'],
  ['H', 'Clean mode: hide the controls'],
  ['[  ]', 'Smaller, larger text'],
  ['Esc', 'Back to the editor'],
]

const MODES: Record<string, Mode> = { Scroll: 'scroll', Step: 'step' }
const SIZE_MIN = 0.5
const SIZE_MAX = 3

interface Metrics {
  top: number[]
  centre: number[]
  bottom: number[]
}

function wakeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

export function Prompter({
  rec,
  prefs,
  onRec,
  onPrefs,
  onExit,
}: {
  rec: ScriptRecord
  prefs: Prefs
  onRec: (patch: Partial<ScriptRecord>) => void
  onPrefs: (patch: Partial<Prefs>) => void
  onExit: () => void
}) {
  const parsed = useMemo(() => parseScript(rec.text), [rec.text])
  const { steps, sections } = parsed
  const last = steps.length - 1
  const { mode, wpm, size } = rec

  const [idx, setIdx] = useState(() => Math.min(rec.pos, Math.max(0, last)))
  const [playing, setPlaying] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [ended, setEnded] = useState(false)
  const [clean, setClean] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [, redraw] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const metrics = useRef<Metrics>({ top: [], centre: [], bottom: [] })
  const posRef = useRef(0)
  const elapsed = useRef<number[]>([])
  const live = useRef({ idx, playing, mode, wpm })
  live.current = { idx, playing, mode, wpm }

  const applyPos = useCallback((p: number) => {
    posRef.current = p
    if (flowRef.current) flowRef.current.style.transform = `translateY(${-p}px)`
  }, [])

  const go = useCallback(
    (to: number) => {
      const i = Math.max(0, Math.min(last, to))
      setIdx(i)
      setEnded(false)
      const c = metrics.current.centre[i]
      if (c !== undefined) applyPos(c)
    },
    [last, applyPos],
  )

  const finish = useCallback(() => {
    setPlaying(false)
    setEnded(true)
  }, [])

  const measure = useCallback(() => {
    const m: Metrics = { top: [], centre: [], bottom: [] }
    itemRefs.current.slice(0, steps.length).forEach((el) => {
      const t = el?.offsetTop ?? 0
      const h = el?.offsetHeight ?? 0
      m.top.push(t)
      m.centre.push(t + h / 2)
      m.bottom.push(t + h)
    })
    metrics.current = m
    const { idx: i, playing: p, mode: md } = live.current
    if (md === 'step' || !p) {
      const c = m.centre[i]
      if (c !== undefined) applyPos(c)
    }
  }, [steps.length, applyPos])

  useLayoutEffect(() => {
    measure()
  }, [measure, size, prefs.ids, prefs.cues, steps])

  useEffect(() => {
    const flow = flowRef.current
    if (!flow || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(flow)
    return () => ro.disconnect()
  }, [measure])

  useEffect(() => {
    onRec({ pos: idx })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  // Scroll mode: the focus point moves at words-per-minute, via the average height of a word.
  useEffect(() => {
    if (!playing || mode !== 'scroll' || last < 0) return
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(100, now - prev) / 1000
      prev = now
      const { top, bottom } = metrics.current
      const span = (bottom[last] ?? 0) - (top[0] ?? 0)
      const speed = parsed.words > 0 ? (live.current.wpm / 60) * (span / parsed.words) : 0
      const end = bottom[last] ?? 0
      const p = posRef.current + speed * dt
      if (speed === 0 || p >= end) {
        applyPos(Math.min(p, end))
        finish()
        return
      }
      applyPos(p)
      let cur = 0
      while (cur < last && top[cur + 1] <= p) cur++
      if (cur !== live.current.idx) setIdx(cur)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, mode, last, parsed.words, applyPos, finish])

  // Step mode: stay on an item for words / wpm plus a beat, then move on.
  useEffect(() => {
    if (!playing || mode !== 'step' || last < 0) return
    const t = window.setTimeout(() => (idx >= last ? finish() : go(idx + 1)), stepMs(steps[idx], wpm))
    return () => window.clearTimeout(t)
  }, [playing, mode, idx, wpm, last, steps, go, finish])

  // Clocks run while playing.
  useEffect(() => {
    if (!playing) return
    let prev = performance.now()
    const t = window.setInterval(() => {
      const now = performance.now()
      const sec = steps[live.current.idx]?.section ?? 0
      elapsed.current[sec] = (elapsed.current[sec] ?? 0) + (now - prev)
      prev = now
      redraw((n) => n + 1)
    }, 200)
    return () => window.clearInterval(t)
  }, [playing, steps])

  // 3-2-1 before play.
  useEffect(() => {
    if (count === null) return
    const t = window.setTimeout(() => {
      if (count > 1) setCount(count - 1)
      else {
        setCount(null)
        setPlaying(true)
      }
    }, 1000)
    return () => window.clearTimeout(t)
  }, [count])

  // Keep the screen awake while reading, where the browser allows it.
  useEffect(() => {
    if (!playing || !wakeSupported()) return
    let lock: WakeLockSentinel | null = null
    let gone = false
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (gone) void l.release().catch(() => undefined)
        else lock = l
      })
      .catch(() => undefined)
    return () => {
      gone = true
      if (lock) void lock.release().catch(() => undefined)
    }
  }, [playing])

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', on)
    return () => {
      document.removeEventListener('fullscreenchange', on)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const restart = () => {
    elapsed.current = []
    setCount(null)
    go(0)
    redraw((n) => n + 1)
  }

  const togglePlay = () => {
    if (last < 0) return
    if (playing) setPlaying(false)
    else if (count !== null) setCount(null)
    else if (ended) {
      restart()
      setPlaying(true)
    } else if (prefs.countdown) setCount(3)
    else setPlaying(true)
  }

  const next = () => {
    if (idx >= last) finish()
    else go(idx + 1)
  }
  const back = () => go(idx - 1)
  const section = steps[idx]?.section ?? 0
  const goSection = (s: number) => {
    const target = sections[Math.max(0, Math.min(sections.length - 1, s))]
    if (target) go(target.start)
  }
  const setSize = (v: number) => onRec({ size: Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, v)) * 10) / 10 })
  const setMode = (m: Mode) => {
    onRec({ mode: m })
    const c = metrics.current.centre[idx]
    if (c !== undefined) applyPos(c)
  }
  const resetClocks = () => {
    elapsed.current = []
    redraw((n) => n + 1)
  }
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
      else void rootRef.current?.requestFullscreen().catch(() => undefined)
    } catch {
      // fullscreen is not available here
    }
  }

  const handlers = useRef<Record<string, () => void>>({})
  handlers.current = {
    play: togglePlay,
    next: () => (mode === 'scroll' ? togglePlay() : next()),
    back,
    prevSection: () => goSection(section - 1),
    nextSection: () => goSection(section + 1),
    home: () => goSection(section),
    auto: togglePlay,
    reset: resetClocks,
    fullscreen: toggleFullscreen,
    clean: () => setClean((c) => !c),
    smaller: () => setSize(size - 0.1),
    larger: () => setSize(size + 0.1),
    exit: () => (sheet ? setSheet(false) : onExit()),
  }

  useEffect(() => {
    const MAP: Record<string, string> = {
      ' ': 'next',
      ArrowRight: 'next',
      PageDown: 'next',
      Enter: 'next',
      ArrowLeft: 'back',
      PageUp: 'back',
      Backspace: 'back',
      ArrowUp: 'prevSection',
      ArrowDown: 'nextSection',
      Home: 'home',
      a: 'auto',
      t: 'reset',
      f: 'fullscreen',
      h: 'clean',
      '[': 'smaller',
      ']': 'larger',
      Escape: 'exit',
    }
    const onKey = (e: KeyboardEvent) => {
      if (keysOpen || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target instanceof HTMLElement ? e.target : null
      if (el?.closest('input, textarea, select, [role="slider"]')) return
      if (el?.closest('button') && (e.key === ' ' || e.key === 'Enter')) return
      const name = MAP[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!name) return
      e.preventDefault()
      handlers.current[name]?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keysOpen])

  // Tap toggles play; a vertical swipe nudges one line.
  const down = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: ReactPointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: ReactPointerEvent) => {
    const d = down.current
    down.current = null
    if (!d) return
    const dy = e.clientY - d.y
    const moved = Math.hypot(e.clientX - d.x, dy)
    if (sheet) {
      setSheet(false)
      return
    }
    if (moved < 10) togglePlay()
    else if (e.pointerType === 'touch' && Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(e.clientX - d.x)) {
      if (dy < 0) next()
      else back()
    }
  }

  const total = elapsed.current.reduce((a, b) => a + (b ?? 0), 0) / 1000
  const secMs = (elapsed.current[section] ?? 0) / 1000
  const sec = sections[section]
  const secTitle = sec?.title || 'Script'
  const progress = sec ? Math.round(((idx - sec.start + 1) / Math.max(1, sec.count)) * 100) : 0
  const flowStyle = { '--tp-size': size } as CSSProperties
  const stageStyle: CSSProperties = { transform: `scale(${rec.mirror ? -1 : 1}, ${rec.flip ? -1 : 1})` }

  const classes = ['tp', mode, prefs.contrast && 'hc', clean && 'clean', sheet && 'sheet'].filter(Boolean).join(' ')

  if (last < 0) {
    return (
      <div className="tp" ref={rootRef} role="region" aria-label="Prompter">
        <div className="tp-top">
          <Button onClick={onExit}>Back to editor</Button>
        </div>
        <div className="tp-empty">
          <EmptyState mono="Empty" title="Nothing to read yet" detail="Write or paste some text in the editor, then rehearse." actionLabel="Back to editor" onAction={onExit} />
        </div>
      </div>
    )
  }

  return (
    <div className={classes} ref={rootRef} role="region" aria-label="Prompter">
      <div className="tp-stage" style={stageStyle} onPointerDown={onDown} onPointerUp={onUp}>
        {prefs.anchor ? <div className="tp-anchor" aria-hidden /> : null}
        <div className="tp-flow" ref={flowRef} style={flowStyle}>
          {steps.map((s, i) => {
            const rel = i < idx ? 'past' : i === idx ? 'cur' : i === idx + 1 ? 'nx1' : i === idx + 2 ? 'nx2' : 'far'
            return (
              <div
                key={i}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className={`tp-item ${s.kind} ${rel}`}
                aria-current={i === idx ? 'true' : undefined}
              >
                {s.kind === 'section' ? (
                  <>
                    <span className="tp-sec-label">Section {s.section + 1}{s.target !== null ? ` · target ${formatClock(s.target)}` : ''}</span>
                    <span className="tp-sec-title">{s.title}</span>
                  </>
                ) : (
                  <>
                    <p className="tp-text">
                      {prefs.ids ? <span className="tp-id">L{s.n}</span> : null}
                      {s.segments.map((g, k) =>
                        g.direction ? (
                          <span key={k} className="tp-dir">
                            <Tag>{g.text.slice(1, -1).trim() || 'direction'}</Tag>
                          </span>
                        ) : (
                          <span key={k}>{g.text}</span>
                        ),
                      )}
                    </p>
                    {prefs.cues && s.cue ? <div className="tp-cue">{s.cue}</div> : null}
                  </>
                )}
              </div>
            )
          })}
        </div>
        {count !== null ? (
          <div className="tp-count" role="status" aria-live="assertive">
            {count}
          </div>
        ) : null}
        {ended ? (
          <div className="tp-end" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <span className="tp-end-label">End</span>
            <span className="tp-end-time">Total time {formatClock(total)}</span>
            <span className="tp-end-est">Estimated read {formatClock(readSeconds(parsed.words, wpm))} at {wpm} wpm</span>
            <Button kind="primary" onClick={restart}>
              Restart
            </Button>
          </div>
        ) : null}
      </div>

      <div className="tp-top">
        <Button onClick={onExit} ariaLabel="Back to editor">
          Editor
        </Button>
        <span className="tp-name">{rec.name}</span>
        <Button onClick={() => setKeysOpen(true)}>Keys</Button>
        <span className="tp-settings">
          <Button onClick={() => setSheet((s) => !s)} ariaLabel="Settings">
            Settings
          </Button>
        </span>
      </div>

      {clean ? (
        <span className="tp-reveal">
          <Button kind="ghost" onClick={() => setClean(false)}>
            Show controls
          </Button>
        </span>
      ) : null}

      <div className="tp-controls" role="group" aria-label="Prompter controls">
        <div className="tp-row">
          <Button kind="primary" onClick={togglePlay}>
            {playing ? 'Pause' : count !== null ? 'Cancel' : 'Play'}
          </Button>
          <Button onClick={back} disabled={idx <= 0}>
            Back
          </Button>
          <Button onClick={next} disabled={ended}>
            Next
          </Button>
          <Pills items={['Scroll', 'Step']} active={mode === 'scroll' ? 'Scroll' : 'Step'} onSelect={(v) => setMode(MODES[v])} />
          {sections.length > 1 ? (
            <Select
              label="Section"
              value={String(section)}
              onChange={(v) => goSection(Number(v))}
              options={sections.map((s, i) => ({ value: String(i), label: s.title || 'Script' }))}
            />
          ) : null}
        </div>
        <div className="tp-row">
          <div className="tp-slider"><RangeSlider label="Speed" value={wpm} onChange={(v) => onRec({ wpm: v })} min={60} max={240} step={5} format={(v) => `${v} wpm`} /></div>
          <div className="tp-slider"><RangeSlider label="Size" value={size} onChange={setSize} min={SIZE_MIN} max={SIZE_MAX} step={0.1} format={(v) => `${Math.round(v * 100)}%`} /></div>
        </div>
        <div className="tp-row">
          <Checkbox label="Mirror" checked={rec.mirror} onChange={(v) => onRec({ mirror: v })} />
          <Checkbox label="Flip" checked={rec.flip} onChange={(v) => onRec({ flip: v })} />
          <Checkbox label="Line ids" checked={prefs.ids} onChange={(v) => onPrefs({ ids: v })} />
          <Checkbox label="Cues" checked={prefs.cues} onChange={(v) => onPrefs({ cues: v })} />
          <Checkbox label="Anchor" checked={prefs.anchor} onChange={(v) => onPrefs({ anchor: v })} />
          <Checkbox label="High contrast" checked={prefs.contrast} onChange={(v) => onPrefs({ contrast: v })} />
          <Checkbox label="Countdown" checked={prefs.countdown} onChange={(v) => onPrefs({ countdown: v })} />
          <Checkbox label="Clean" checked={clean} onChange={setClean} />
          <Button onClick={toggleFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</Button>
        </div>
      </div>

      <div className="tp-foot">
        <span className="tp-foot-title">{secTitle}</span>
        <div className="tp-bar" role="progressbar" aria-label="Progress in section" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="tp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className={`tp-clock${sec?.target != null && secMs > sec.target ? ' over' : ''}`} aria-label="Section clock">
          {formatClock(secMs)}
          {sec?.target != null ? ` / ${formatClock(sec.target)}` : ''}
        </span>
        <span className="tp-clock" aria-label="Total clock">
          Total {formatClock(total)}
        </span>
        <Button kind="ghost" onClick={resetClocks}>
          Reset clocks
        </Button>
      </div>

      <Dialog open={keysOpen} onClose={() => setKeysOpen(false)} title="Keys">
        <Stack>
          <Keys items={KEY_MAP} />
          <Actions>
            <Button kind="primary" onClick={() => setKeysOpen(false)}>
              Close
            </Button>
          </Actions>
        </Stack>
      </Dialog>
    </div>
  )
}
