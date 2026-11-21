import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Select,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  deleteGradient,
  listGradients,
  loadState,
  saveGradient,
  saveState,
  type GradientKind,
  type GradientStop,
  type SavedGradient,
} from './host'

const TYPE_OPTIONS: { value: GradientKind; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
]

const STOP_COLORS = ['ff0000', '0000ff']

function nextPosition(index: number, count: number): number {
  if (count <= 1) return 0
  return Math.round((index / (count - 1)) * 100)
}

function buildCss(kind: GradientKind, angle: number, stops: GradientStop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const parts = sorted.map((s) => `${s.color} ${s.position}%`).join(', ')
  const direction = kind === 'radial' ? 'at center' : `${angle}deg`
  return `${kind}-gradient(${direction}, ${parts})`
}

function parsePosition(raw: string): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}

function clampText(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max)
}

export function App() {
  const [initial] = useState(loadState)
  const [kind, setKind] = useState<GradientKind>(initial.kind)
  const [angle, setAngle] = useState(String(initial.angle))
  const [stops, setStops] = useState<GradientStop[]>(initial.stops)
  const [name, setName] = useState(initial.name)
  const [library, setLibrary] = useState<SavedGradient[]>(listGradients)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const clipboard = useClipboard({
    onError: () => setToast('Copy failed'),
  })

  const flash = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1600)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const persist = useCallback(
    (nextStops: GradientStop[], nextName: string, nextKind: GradientKind, nextAngle: string) => {
      saveState({
        name: nextName,
        kind: nextKind,
        angle: Number(nextAngle) || 0,
        stops: nextStops,
      })
    },
    [],
  )

  const addStop = useCallback(() => {
    setStops((prev) => {
      const index = prev.length
      const next: GradientStop = {
        color: `#${STOP_COLORS[index % STOP_COLORS.length]}`,
        position: nextPosition(index, index + 1),
      }
      persist([...prev, next], name, kind, angle)
      return [...prev, next]
    })
  }, [angle, kind, name, persist])

  const updateStop = useCallback(
    (index: number, patch: Partial<GradientStop>) => {
      setStops((prev) => {
        const next = prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
        persist(next, name, kind, angle)
        return next
      })
    },
    [angle, kind, name, persist],
  )

  const removeStop = useCallback(
    (index: number) => {
      setStops((prev) => {
        const next = prev.filter((_, i) => i !== index)
        persist(next, name, kind, angle)
        return next
      })
    },
    [angle, kind, name, persist],
  )

  const css = useMemo(() => buildCss(kind, Number(angle) || 0, stops), [kind, angle, stops])

  const changeType = useCallback(
    (value: string) => {
      const nextKind = value as GradientKind
      setKind(nextKind)
      persist(stops, name, nextKind, angle)
    },
    [angle, name, persist, stops],
  )

  const changeAngle = useCallback(
    (value: string) => {
      const clamped = clampText(value.replace(/[^0-9]/g, ''), 3)
      setAngle(clamped)
      persist(stops, name, kind, clamped)
    },
    [kind, name, persist, stops],
  )

  const changeName = useCallback(
    (value: string) => {
      setName(value)
      persist(stops, value, kind, angle)
    },
    [angle, kind, persist, stops],
  )

  const copyCss = useCallback(() => {
    void clipboard.copy(css)
    flash('CSS copied')
  }, [clipboard, css, flash])

  const saveGradientNow = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) {
      flash('Name the gradient first')
      return
    }
    saveGradient({
      name: trimmed,
      kind,
      angle: Number(angle) || 0,
      stops,
    })
    setLibrary(listGradients())
    flash('Saved to library')
  }, [angle, flash, kind, name, stops])

  const deleteSaved = useCallback(
    (gradient: SavedGradient) => {
      deleteGradient(gradient.id)
      setLibrary(listGradients())
      flash(`Deleted ${gradient.name}`)
    },
    [flash],
  )

  return (
    <AppShell
      name="Gradient Generator"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta={stops.length > 0 ? `${stops.length} stop${stops.length === 1 ? '' : 's'}` : 'Ready'}
      status={toast ?? 'Local · no network'}
      side={
        <Rail title="Gradient Generator" note="CSS gradient · local" chips={['Linear', 'Radial']}>
          <Card mono="Library" title="Saved gradients" flush>
            {library.length === 0 ? (
              <EmptyState
                mono="Library"
                title="No gradients saved"
                detail="Name your gradient and press Save gradient to keep it here."
                actionLabel="Save gradient"
              />
            ) : (
              <div>
                {library.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'calc(8px * var(--sf))',
                      padding: 'calc(8px * var(--sf)) 0',
                      borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    }}
                  >
                    <div>
                      <div>{g.name}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', opacity: 0.7 }}>
                        {g.kind} · {g.stops.length} stop{g.stops.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <Button kind="ghost" ariaLabel={`Delete ${g.name}`} onClick={() => deleteSaved(g)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Rail>
      }
    >
      <Card mono="Mix" title="Stops">
        <FormGrid>
          <Select label="Type" value={kind} onChange={changeType} options={TYPE_OPTIONS} />
          {kind === 'linear' ? (
            <TextInput
              label="Angle (deg)"
              value={angle}
              onChange={changeAngle}
              type="number"
              placeholder="90"
            />
          ) : null}
        </FormGrid>

        {stops.length === 0 ? (
          <EmptyState
            mono="Stops"
            title="No stops yet"
            detail="Press Add stop to start mixing your gradient."
            actionLabel="Add stop"
          />
        ) : (
          <div>
            {stops.map((stop, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'calc(10px * var(--sf))',
                  flexWrap: 'wrap',
                  padding: 'calc(8px * var(--sf)) 0',
                  borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                }}
              >
                <span style={{ minWidth: 'calc(48px * var(--sf))' }}>Stop {index + 1}</span>
                <input
                  type="color"
                  aria-label={`Stop ${index + 1} color`}
                  value={stop.color}
                  onChange={(event) => updateStop(index, { color: event.target.value })}
                  style={{
                    width: 'calc(28px * var(--sf))',
                    height: 'calc(24px * var(--sf))',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontFamily: 'var(--mono)' }}>{stop.color}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--sf))' }}>
                  <span>Position</span>
                  <input
                    className="lc-input"
                    type="number"
                    min={0}
                    max={100}
                    aria-label={`Stop ${index + 1} Position`}
                    value={String(stop.position)}
                    onChange={(event) => {
                      const parsed = parsePosition(event.target.value)
                      if (parsed != null) updateStop(index, { position: parsed })
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        const parsed = parsePosition(event.currentTarget.value)
                        if (parsed != null) updateStop(index, { position: parsed })
                      }
                    }}
                    style={{ width: 'calc(64px * var(--sf))' }}
                  />
                  <span style={{ fontFamily: 'var(--mono)' }}>{stop.position}%</span>
                </label>
                <span style={{ flex: '1 1 auto' }} />
                <Button kind="ghost" onClick={() => removeStop(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        <Actions>
          <Button onClick={addStop}>Add stop</Button>
        </Actions>
      </Card>

      <Card
        mono="Output"
        title="CSS preview"
        actions={
          <Actions>
            <Button onClick={copyCss}>{clipboard.copied ? 'Copied' : 'Copy CSS'}</Button>
          </Actions>
        }
      >
        {stops.length === 0 ? (
          <EmptyState mono="CSS" title="Nothing to preview" detail="Add a stop to generate the CSS." actionLabel="Add stop" />
        ) : (
          <>
            <div
              aria-label="Gradient preview"
              style={{
                height: 'calc(56px * var(--sf))',
                borderRadius: 'calc(6px * var(--sf))',
                background: css,
              }}
            />
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 'calc(13px * var(--tf))',
                marginTop: 'calc(8px * var(--sf))',
                wordBreak: 'break-all',
              }}
            >
              {css}
            </div>
          </>
        )}
      </Card>

      <Card mono="Library" title="Save this gradient">
        <FormGrid>
          <TextInput label="Name" value={name} onChange={changeName} placeholder="e.g. Sunset" />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={saveGradientNow}>Save gradient</Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
