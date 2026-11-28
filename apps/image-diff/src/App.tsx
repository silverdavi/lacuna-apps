import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent } from 'react'
import {
  Actions, AppShell, Body, Button, Card, Cols, EmptyState, ErrorState, Keys, Kpi, KpiRow, PrimaryButton, Rail, Stack, Table, Tabs,
} from '@lacuna/ui'
import { BeforeAfter } from '@lacuna/before-after'
import { RangeSlider } from '@lacuna/range-slider'
import { useClipboard } from '@lacuna/use-clipboard'
import { ACCENT_TOKEN, resolveRamp, tokenCss, tokenRgb } from './colors'
import { buildHeatmap, buildOverlay, DEFAULT_THRESHOLD, formatStats, MAX_THRESHOLD, type DiffResult, type Stats } from './diff.ts'
import { host } from './host'
import { ACCEPT_ATTR, canvasBlob, decode, prepare, runDiff, toCanvas, type Prepared, type Source } from './pipeline'
import { makeSample } from './sample'

const TABS = ['Heatmap', 'Overlay', 'Swipe', 'Blink', 'Side by side']
const ZOOMS = [25, 50, 75, 100, 150, 200, 300, 400]
const BLINK_MS = 600

type Side = 'A' | 'B'
interface Done { prep: Prepared; diff: DiffResult }

const fmtInt = (n: number) => n.toLocaleString('en-US')
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`

function useAppearanceTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const obs = new MutationObserver(() => setTick((t) => t + 1))
    obs.observe(document.documentElement, { attributes: true })
    return () => obs.disconnect()
  }, [])
  return tick
}

function DropZone({ side, label, source, onFiles }: { side: Side; label: string; source: Source | null; onFiles: (side: Side, files: File[]) => void }) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const take = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? [])
    if (files.length) onFiles(side, files)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files)
  }
  const onPaste = (e: ClipboardEvent) => {
    if (e.clipboardData.files.length) {
      e.preventDefault()
      take(e.clipboardData.files)
    }
  }
  return (
    <>
      <button
        type="button"
        className={`id-zone${over ? ' over' : ''}${source ? ' filled' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onPaste={onPaste}
      >
        <span className="id-zone-label">{side} · {label}</span>
        {source ? (
          <>
            <span className="id-zone-name">{source.name}</span>
            <span className="id-zone-hint">{source.bitmap.width}x{source.bitmap.height} · click, drop or paste to replace</span>
          </>
        ) : (
          <>
            <span className="id-zone-name">Drop an image here</span>
            <span className="id-zone-hint">or click to choose, or paste with Ctrl+V or Cmd+V while this box is focused</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        aria-label={`Choose image ${side}`}
        data-testid={`file-${side}`}
        onChange={(e) => { take(e.target.files); e.target.value = '' }}
      />
    </>
  )
}

function CanvasView({ source, zoom, label }: { source: HTMLCanvasElement; zoom: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = source.width
    c.height = source.height
    c.getContext('2d')!.drawImage(source, 0, 0)
  }, [source])
  return <canvas ref={ref} role="img" aria-label={label} style={{ width: `${(source.width * zoom) / 100}px`, height: `${(source.height * zoom) / 100}px` }} />
}

function StatsPanel({ stats, threshold, busy }: { stats: Stats | null; threshold: number; busy: boolean }) {
  const [wide] = useState(() => !window.matchMedia?.('(max-width: 45em)').matches)
  if (!stats) return <Body>{busy ? 'Comparing…' : 'No statistics yet.'}</Body>
  const rows: [string, string][] = [
    ['Changed pixels', `${fmtInt(stats.changed)} of ${fmtInt(stats.total)}`],
    ['Mean abs delta', `${stats.meanDelta.toFixed(2)} / 255`],
    ['Max abs delta', `${stats.maxDelta.toFixed(0)} / 255`],
    ['RMSE', stats.rmse.toFixed(2)],
    ['Mean delta R / G / B', `${stats.deltaR.toFixed(2)} / ${stats.deltaG.toFixed(2)} / ${stats.deltaB.toFixed(2)}`],
    ['Brightness A', stats.brightnessA.toFixed(1)],
    ['Brightness B', stats.brightnessB.toFixed(1)],
    ['Brightness shift', signed(stats.brightnessShift)],
    ['Bounding box x', stats.bbox ? `${stats.bbox.x0} to ${stats.bbox.x1}` : 'none'],
    ['Bounding box y', stats.bbox ? `${stats.bbox.y0} to ${stats.bbox.y1}` : 'none'],
  ]
  return (
    <Stack>
      <KpiRow>
        <Kpi value={`${stats.changedPct.toFixed(2)}%`} label="Changed" accent />
        <Kpi value={stats.meanDelta.toFixed(2)} label="Mean delta" />
        <Kpi value={stats.rmse.toFixed(2)} label="RMSE" />
      </KpiRow>
      {stats.changed === 0 && <p className="id-none" role="status">No pixels differ above the threshold ({threshold}).</p>}
      <details className="id-details" open={wide}>
        <summary>All statistics</summary>
        <Table
          label="Difference statistics"
          columns={[{ key: 'm', label: 'Measure' }, { key: 'v', label: 'Value', num: true }]}
          rows={rows.map(([m, v]) => ({ cells: { m, v } }))}
        />
      </details>
    </Stack>
  )
}

export function App() {
  const saved = useMemo(() => host.readSettings({ threshold: DEFAULT_THRESHOLD, tab: 'Heatmap' }), [])
  const [a, setA] = useState<Source | null>(null)
  const [b, setB] = useState<Source | null>(null)
  const [error, setError] = useState<{ title: string; detail: string } | null>(null)
  const [threshold, setThreshold] = useState(saved.threshold)
  const [tab, setTab] = useState(TABS.includes(saved.tab) ? saved.tab : 'Heatmap')
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [viewW, setViewW] = useState(600)
  const [done, setDone] = useState<Done | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [blinkB, setBlinkB] = useState(false)
  const [hold, setHold] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const sync = useRef<{ busy: boolean }>({ busy: false })
  const stages = useRef<(HTMLDivElement | null)[]>([])
  const tick = useAppearanceTick()
  const clip = useClipboard()

  useEffect(() => { host.writeSettings({ threshold, tab }) }, [threshold, tab])

  const prepared = useMemo<{ prep: Prepared | null; failure: string | null }>(() => {
    if (!a || !b) return { prep: null, failure: null }
    try {
      return { prep: prepare(a, b), failure: null }
    } catch {
      return { prep: null, failure: 'These images are too large for this browser to compare. Try smaller ones.' }
    }
  }, [a, b])
  const prep = prepared.prep

  useEffect(() => {
    if (!prep) { setDone(null); setProgress(null); return }
    let dead = false
    setProgress(0)
    runDiff(prep.pixelsA, prep.pixelsB, threshold, (f) => { if (!dead) setProgress(f) }, () => dead).then((diff) => {
      if (dead || !diff) return
      setDone({ prep, diff })
      setProgress(null)
    })
    return () => { dead = true }
  }, [prep, threshold])

  const result = done && done.prep === prep ? done.diff : null
  const busy = progress !== null

  const ramp = useMemo(() => resolveRamp(), [tick])
  const accent = useMemo(() => tokenRgb(ACCENT_TOKEN), [tick])
  const accentCss = useMemo(() => tokenCss(ACCENT_TOKEN), [tick])
  const heat = useMemo(() => (result && prep ? toCanvas(buildHeatmap(result.sums, prep.width, prep.height, ramp)) : null), [result, prep, ramp])
  const overlay = useMemo(() => {
    if (!result || !prep) return null
    const canvas = toCanvas(buildOverlay(prep.pixelsA, result.sums, result.threshold, accent))
    const box = result.stats.bbox
    if (box) {
      const ctx = canvas.getContext('2d')!
      ctx.strokeStyle = accentCss
      ctx.lineWidth = Math.max(2, Math.round(Math.max(prep.width, prep.height) / 300))
      ctx.strokeRect(box.x0 - 0.5, box.y0 - 0.5, box.x1 - box.x0 + 2, box.y1 - box.y0 + 2)
    }
    return canvas
  }, [result, prep, accent, accentCss])

  // Fit follows the viewport width.
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const measure = () => setViewW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [prep, tab])

  const columns = tab === 'Side by side' && !window.matchMedia('(max-width: 45em)').matches ? 2 : 1
  const fitPct = prep ? Math.max(5, Math.floor(Math.min(100, ((viewW - (columns - 1) * 8) / columns / prep.width) * 100))) : 100
  const eff = zoom === 'fit' ? fitPct : zoom
  const stepZoom = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOMS.find((z) => z > eff) : [...ZOOMS].reverse().find((z) => z < eff)
    if (next) setZoom(next)
  }

  // Blink: alternate A and B, with a hold-to-show-B button and the B key.
  useEffect(() => {
    if (tab !== 'Blink' || !playing || hold) return
    const id = setInterval(() => setBlinkB((v) => !v), BLINK_MS)
    return () => clearInterval(id)
  }, [tab, playing, hold])
  useEffect(() => {
    if (tab !== 'Blink') return
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
    const down = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'b' && !e.repeat && !e.metaKey && !e.ctrlKey && !typing(e.target)) setHold(true) }
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'b') setHold(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); setHold(false) }
  }, [tab])

  const loadFiles = useCallback(async (side: Side, files: File[]) => {
    setError(null)
    const targets: Side[] = files.length >= 2 ? ['A', 'B'] : [side]
    for (let i = 0; i < targets.length; i++) {
      try {
        const src = await decode(files[i])
        if (targets[i] === 'A') setA(src)
        else setB(src)
        setZoom('fit')
      } catch (e) {
        setError({ title: 'That file cannot be compared', detail: e instanceof Error ? e.message : 'It could not be read.' })
      }
    }
  }, [])

  const sample = async () => {
    setError(null)
    const [sa, sb] = await makeSample()
    setA(sa)
    setB(sb)
    setZoom('fit')
  }
  const swap = () => { setA(b); setB(a) }
  const clear = () => { setA(null); setB(null); setError(null); setDone(null); setBlinkB(false) }

  const download = async (canvas: HTMLCanvasElement | null, name: string) => {
    const blob = canvas && (await canvasBlob(canvas))
    if (blob) host.saveFile(blob, name)
  }

  const onStageScroll = (idx: number) => () => {
    if (sync.current.busy) return
    const src = stages.current[idx], dst = stages.current[1 - idx]
    if (!src || !dst) return
    sync.current.busy = true
    dst.scrollLeft = src.scrollLeft
    dst.scrollTop = src.scrollTop
    requestAnimationFrame(() => { sync.current.busy = false })
  }

  const stage = (children: React.ReactNode, idx?: number) => (
    <div
      className={`id-stage${eff > 100 ? ' zoomed' : ''}`}
      ref={idx === undefined ? undefined : (el) => { stages.current[idx] = el }}
      onScroll={idx === undefined ? undefined : onStageScroll(idx)}
    >
      {children}
    </div>
  )

  const showB = hold || blinkB
  let view: React.ReactNode = null
  if (prep && heat && overlay) {
    if (tab === 'Heatmap') view = stage(<CanvasView source={heat} zoom={eff} label="Difference heatmap" />)
    else if (tab === 'Overlay') view = stage(<CanvasView source={overlay} zoom={eff} label="A with changed pixels and bounding box" />)
    else if (tab === 'Swipe') {
      const sw = (prep.width * eff) / 100
      const sh = (prep.height * eff) / 100
      const pinned = (c: HTMLCanvasElement, label: string) => (
        <div className="id-swipe-pin" style={{ width: `${sw}px`, height: `${sh}px` }}>
          <CanvasView source={c} zoom={eff} label={label} />
        </div>
      )
      view = stage(
        <div className="id-swipe" style={{ '--sw': `${sw}px`, '--sh': `${sh}px` } as React.CSSProperties}>
          <BeforeAfter
            ariaLabel="Swipe between A and B"
            before={pinned(prep.canvasA, 'A, before')}
            after={pinned(prep.canvasB, 'B, after')}
          />
        </div>,
      )
    }
    else if (tab === 'Blink') view = stage(<CanvasView source={showB ? prep.canvasB : prep.canvasA} zoom={eff} label={showB ? 'B, after' : 'A, before'} />)
    else view = (
      <div className="id-pair">
        <div><div className="id-pair-head">A · Before</div>{stage(<CanvasView source={prep.canvasA} zoom={eff} label="A, before" />, 0)}</div>
        <div><div className="id-pair-head">B · After</div>{stage(<CanvasView source={prep.canvasB} zoom={eff} label="B, after" />, 1)}</div>
      </div>
    )
  }

  const have = !!(a && b)
  return (
    <AppShell
      name="Image Diff"
      icon="search"
      hue="blue"
      category="Files"
      meta={result ? `${result.stats.changedPct.toFixed(2)}% changed` : 'Nothing compared yet'}
      side={
        <Rail title="Image Diff" note="Compared on this device" chips={['Nothing uploaded']}>
          <Keys items={[['B', 'Hold to show B (Blink tab)'], ['Ctrl+V', 'Paste into a focused box'], ['← →', 'Move the swipe divider']]} />
        </Rail>
      }
    >
      <Card mono="Inputs" title="Two images">
        <Stack>
          <div className="id-zones">
            <DropZone side="A" label="Before" source={a} onFiles={loadFiles} />
            <DropZone side="B" label="After" source={b} onFiles={loadFiles} />
          </div>
          {error && <ErrorState title={error.title} detail={error.detail} />}
          {prepared.failure && <ErrorState title="Cannot compare" detail={prepared.failure} />}
          {prep && prep.notices.length > 0 && (
            <div className="id-notices" role="status">{prep.notices.map((n) => <span key={n}>{n}</span>)}</div>
          )}
          <Actions>
            {have ? <Button kind="secondary" onClick={sample}>Try a sample</Button> : <PrimaryButton onClick={sample}>Try a sample</PrimaryButton>}
            <Button kind="secondary" onClick={swap} disabled={!a && !b}>Swap A/B</Button>
            <Button kind="ghost" onClick={clear} disabled={!a && !b}>Clear</Button>
          </Actions>
        </Stack>
      </Card>

      {!have && (
        <Card mono="Compare" title="Waiting for two images">
          <EmptyState mono="Empty" title="Add an image to each box" detail="Drop, choose or paste A and B, or generate a pair to see how it works." actionLabel="Try a sample" onAction={sample} />
        </Card>
      )}

      {have && (
        <Card mono="Compare" title="What changed">
          <Stack>
            <Tabs items={TABS} active={tab} onSelect={setTab} />
            <div className="id-toolbar">
              <div className="id-toolbar-grow">
                <RangeSlider label="Threshold" value={threshold} onChange={setThreshold} min={0} max={MAX_THRESHOLD} step={1} format={(v) => String(v)} />
              </div>
              <div className="id-zoom" role="group" aria-label="Zoom">
                <Button kind="secondary" onClick={() => stepZoom(-1)} ariaLabel="Zoom out" disabled={eff <= ZOOMS[0]}>−</Button>
                <span className="id-zoom-value" aria-live="polite">{eff}%</span>
                <Button kind="secondary" onClick={() => stepZoom(1)} ariaLabel="Zoom in" disabled={eff >= ZOOMS[ZOOMS.length - 1]}>+</Button>
                <Button kind="ghost" onClick={() => setZoom('fit')}>Fit</Button>
              </div>
            </div>
            {busy && (
              <div className="id-progress" role="status">
                <span>Comparing…</span>
                <progress value={progress ?? 0} max={1} aria-label="Comparison progress" />
              </div>
            )}
            {tab === 'Blink' && (
              <Actions>
                <Button kind="secondary" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause blink' : 'Start blink'}</Button>
                <span
                  onPointerDown={() => setHold(true)}
                  onPointerUp={() => setHold(false)}
                  onPointerLeave={() => setHold(false)}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setHold(true) }}
                  onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') setHold(false) }}
                >
                  <Button kind="secondary" ariaLabel="Hold to show B">Hold to show B</Button>
                </span>
                <span className="id-none" role="status">Showing {showB ? 'B (After)' : 'A (Before)'}</span>
              </Actions>
            )}
            <Cols kind="main-side">
              <div className="id-viewport" ref={viewport}>
                <Stack>
                  {view ?? <Body>{busy ? 'Comparing…' : 'Preparing…'}</Body>}
                  {tab === 'Heatmap' && (
                    <div className="id-legend">
                      <span>0</span>
                      <span className="id-legend-bar" aria-hidden="true">
                        {ramp.map((c, i) => <span key={i} style={{ background: `rgb(${c[0]} ${c[1]} ${c[2]})` }} />)}
                      </span>
                      <span>255 difference</span>
                    </div>
                  )}
                  {tab === 'Overlay' && <span className="id-none">Changed pixels are painted in the accent colour; the box encloses all of them.</span>}
                </Stack>
              </div>
              <StatsPanel stats={result?.stats ?? null} threshold={threshold} busy={busy} />
            </Cols>
            <Actions>
              <Button kind="secondary" disabled={!heat} onClick={() => download(heat, 'image-diff-heatmap.png')}>Download heatmap PNG</Button>
              <Button kind="secondary" disabled={!overlay} onClick={() => download(overlay, 'image-diff-overlay.png')}>Download overlay PNG</Button>
              <Button kind="secondary" disabled={!result} onClick={() => result && clip.copy(formatStats(result.stats, threshold))}>{clip.copied ? 'Copied' : 'Copy stats as text'}</Button>
            </Actions>
          </Stack>
        </Card>
      )}
    </AppShell>
  )
}
