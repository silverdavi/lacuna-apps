import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button, MonoLabel, PrimaryButton, Tag } from '@lacuna/ui'
import type { Card } from '../data/deck'
import { beep, TONES } from '../lib/beep'
import { classifyTilt, screenFacing, type Played, type Result } from '../lib/game'

const SWIPE = 48
const TAP_SLOP = 16
const FLASH_MS = 100

type TiltState = 'off' | 'active' | 'unavailable' | 'denied'

/** The name, as large as fits the box without overflowing its width or height. */
function FitName({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null)
  const el = useRef<HTMLDivElement>(null)

  const fit = useCallback(() => {
    const b = box.current
    const e = el.current
    if (!b || !e) return
    let lo = 1
    let hi = 28
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2
      e.style.fontSize = `calc(${mid}rem * var(--tf))`
      if (e.scrollWidth <= b.clientWidth && e.offsetHeight <= b.clientHeight) lo = mid
      else hi = mid
    }
    e.style.fontSize = `calc(${lo}rem * var(--tf))`
  }, [])

  useLayoutEffect(fit, [fit, text])
  useEffect(() => {
    const b = box.current
    if (!b || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    return () => ro.disconnect()
  }, [fit])

  return (
    <div className="fc-name-box" ref={box}>
      <div className="fc-name" ref={el} data-testid="card-name">{text}</div>
    </div>
  )
}

export function Play({ phase, queue, seconds, controls, tilt, sound, teamLabel, note, onStarted, onTiltState, onSeen, onFinish }: {
  phase: 'ready' | 'play'
  queue: Card[]
  seconds: number
  controls: 'tap' | 'tilt'
  tilt: TiltState
  sound: boolean
  teamLabel: string
  note: string
  onStarted: () => void
  onTiltState: (s: TiltState) => void
  onSeen: (text: string) => void
  onFinish: (played: Played[], exhausted: boolean) => void
}) {
  const [count, setCount] = useState(3)
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(seconds * 1000)
  const [paused, setPaused] = useState(false)
  const [flash, setFlash] = useState<Result | null>(null)
  const playedRef = useRef<Played[]>([])
  const doneRef = useRef(false)
  const leftRef = useRef(seconds * 1000)
  const flashTimer = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const lastSecond = useRef<number>(seconds)
  const rootRef = useRef<HTMLDivElement>(null)
  const tiltOn = controls === 'tilt' && tilt === 'active'

  // Take focus from the setup screen underneath so keys reach the game, not a hidden button.
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    rootRef.current?.focus()
  }, [phase])

  // 3-2-1
  useEffect(() => {
    if (phase !== 'ready') return
    const t = window.setTimeout(() => {
      if (sound) beep(TONES.tick)
      if (count > 1) setCount(count - 1)
      else onStarted()
    }, 1000)
    return () => window.clearTimeout(t)
  }, [phase, count, sound, onStarted])

  const end = useCallback((exhausted: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    onFinish(playedRef.current, exhausted)
  }, [onFinish])

  // Timer
  useEffect(() => {
    if (phase !== 'play' || paused) return
    const endAt = Date.now() + leftRef.current
    const id = window.setInterval(() => {
      const l = Math.max(0, endAt - Date.now())
      leftRef.current = l
      setLeft(l)
      const s = Math.ceil(l / 1000)
      if (s !== lastSecond.current) {
        lastSecond.current = s
        if (sound && s > 0 && s <= 5) beep(TONES.tick, 60)
      }
      if (l <= 0) end(false)
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, paused, sound, end])

  // Mark each card as seen when it is shown.
  useEffect(() => {
    if (phase === 'play' && queue[idx]) onSeen(queue[idx].text)
  }, [phase, idx, queue, onSeen])

  // Keep the screen awake while playing.
  useEffect(() => {
    if (phase !== 'play' || paused) return
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => {
      if (cancelled) void l.release().catch(() => undefined)
      else lock = l
    }).catch(() => undefined)
    return () => {
      cancelled = true
      void lock?.release().catch(() => undefined)
    }
  }, [phase, paused])

  const act = (result: Result) => {
    if (phase !== 'play' || paused || doneRef.current) return
    const card = queue[idx]
    if (!card) return
    playedRef.current = [...playedRef.current, { card, result }]
    setFlash(result)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS)
    if (sound) beep(result === 'correct' ? TONES.correct : TONES.pass)
    if (idx + 1 >= queue.length) end(true)
    else setIdx(idx + 1)
  }
  const actRef = useRef(act)
  actRef.current = act
  const pauseRef = useRef(() => {})
  pauseRef.current = () => {
    if (phase === 'play') setPaused((p) => !p)
  }

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON'
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) {
        e.preventDefault()
        actRef.current('correct')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        actRef.current('pass')
      } else if ((e.key === ' ' && !onButton) || e.key === 'Escape') {
        e.preventDefault()
        pauseRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Tilt: the phone is read from the ready screen on, so a missing sensor is found before the round.
  useEffect(() => {
    if (!tiltOn) return
    let armed = false
    let got = false
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      got = true
      const r = classifyTilt(screenFacing(e.beta, e.gamma), armed)
      armed = r.armed
      if (r.call && phase === 'play') actRef.current(r.call)
    }
    window.addEventListener('deviceorientation', onOrient)
    const t = window.setTimeout(() => {
      if (!got) onTiltState('unavailable')
    }, 2200)
    return () => {
      window.removeEventListener('deviceorientation', onOrient)
      window.clearTimeout(t)
    }
  }, [tiltOn, phase, onTiltState])

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY }
  }
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current
    start.current = null
    if (!s || tiltOn) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dy) >= SWIPE && Math.abs(dy) > Math.abs(dx) * 1.2) act(dy > 0 ? 'correct' : 'pass')
    else if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) {
      const r = e.currentTarget.getBoundingClientRect()
      act(e.clientX - r.left >= r.width / 2 ? 'correct' : 'pass')
    }
  }

  const secs = Math.ceil(left / 1000)
  const urgent = phase === 'play' && secs <= 5 && secs > 0
  const card = queue[idx]
  const tiltNote = tilt === 'denied' ? 'Tilt permission was denied, so tap controls are on.' : tilt === 'unavailable' && controls === 'tilt' ? 'This device cannot report tilt, so tap controls are on.' : ''

  if (phase === 'ready') {
    return (
      <div className="fc-fill fc-ready" role="dialog" aria-label="Get ready" tabIndex={-1} ref={rootRef}>
        {teamLabel && <MonoLabel accent>{teamLabel}</MonoLabel>}
        <p className="fc-ready-title">Hold the phone to your forehead</p>
        <div className="fc-count-big" aria-live="polite" data-testid="countdown">{count}</div>
        <p className="fc-hint fc-landscape-hint">Turn the phone sideways for bigger names.</p>
        {(tiltNote || note) && <p className="fc-hint" role="status">{[tiltNote, note].filter(Boolean).join(' ')}</p>}
        <p className="fc-hint">{tiltOn ? 'Tilt face-down for Correct, face-up for Pass.' : 'Right half Correct, left half Pass. Swipe down Correct, up Pass.'}</p>
      </div>
    )
  }

  return (
    <div className="fc-fill fc-play" role="dialog" aria-label="Playing" tabIndex={-1} ref={rootRef}>
      <div className="fc-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { start.current = null }}>
        <div className="fc-top">
          <Tag>{card?.category ?? ''}</Tag>
          <span className={`fc-timer${urgent ? ' urgent' : ''}`} data-testid="timer" aria-label={`${secs} seconds left`}>{secs}</span>
          <span className="fc-top-end">
            <button type="button" className="lc-btn ghost" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={() => setPaused(true)}>Pause</button>
          </span>
        </div>
        {card && <FitName text={card.text} />}
        <div className="fc-bottom" aria-hidden="true">
          <span>{tiltOn ? 'Face-up: Pass' : 'Pass'}</span>
          <span>{teamLabel}</span>
          <span>{tiltOn ? 'Face-down: Correct' : 'Correct'}</span>
        </div>
      </div>
      {flash && (
        <div className={`fc-flash ${flash}`} aria-hidden="true">{flash === 'correct' ? 'Correct' : 'Pass'}</div>
      )}
      {paused && (
        <div className="fc-pause" role="dialog" aria-label="Paused">
          <p className="fc-ready-title">Paused</p>
          <div className="fc-pause-actions">
            <PrimaryButton onClick={() => setPaused(false)}>Resume</PrimaryButton>
            <Button onClick={() => end(false)}>End round</Button>
          </div>
        </div>
      )}
    </div>
  )
}
