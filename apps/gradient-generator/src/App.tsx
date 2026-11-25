import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Select,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { useCollection } from '@lacuna/use-collection'
import { swatchCss, swatchDisplay } from './colors'
import type { GradientKind, GradientStop, SavedGradient } from './host'

interface WorkState {
  name: string
  kind: GradientKind
  angle: number
  stops: GradientStop[]
}

const DEFAULT_WORK: WorkState = {
  name: '',
  kind: 'linear',
  angle: 90,
  stops: [],
}

const TYPE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
]

function isWorkState(v: unknown): v is WorkState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  const kind = o.kind
  if (kind !== 'linear' && kind !== 'radial') return false
  if (typeof o.name !== 'string') return false
  if (typeof o.angle !== 'number' || !Number.isFinite(o.angle)) return false
  if (!Array.isArray(o.stops)) return false
  return o.stops.every((s) => {
    const stop = s as Record<string, unknown> | null
    return (
      stop &&
      typeof stop.color === 'string' &&
      typeof stop.position === 'number' &&
      stop.position >= 0 &&
      stop.position <= 100
    )
  })
}

function isSavedGradient(v: unknown): v is Omit<SavedGradient, 'id'> {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  const kind = o.kind
  if (kind !== 'linear' && kind !== 'radial') return false
  if (typeof o.name !== 'string' || o.name.length === 0) return false
  if (typeof o.angle !== 'number' || !Number.isFinite(o.angle)) return false
  if (!Array.isArray(o.stops)) return false
  return o.stops.every((s) => {
    const stop = s as Record<string, unknown> | null
    return (
      stop &&
      typeof stop.color === 'string' &&
      typeof stop.position === 'number' &&
      stop.position >= 0 &&
      stop.position <= 100
    )
  })
}

function buildCss(kind: GradientKind, angle: number, stops: GradientStop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const parts = sorted.map((s) => `${s.color} ${s.position}%`).join(', ')
  const direction = kind === 'radial' ? 'circle' : `${angle}deg`
  return `${kind}-gradient(${direction}, ${parts})`
}

function nextPosition(index: number, count: number): number {
  if (count <= 1) return 0
  return Math.round((index / (count - 1)) * 100)
}

export function App() {
  const { value: work, set: setWork } = useLocalRecord<WorkState>({
    key: 'lacuna.gradient-generator.work',
    version: 1,
    defaultValue: DEFAULT_WORK,
  })

  const collection = useCollection<Omit<SavedGradient, 'id'>>({
    storageKey: 'lacuna.gradient-generator.library',
  })

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const clipboard = useClipboard({
    timeoutMs: 2000,
  })

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const flash = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 6000)
  }

  const stops = work.stops
  const css = stops.length > 0 ? buildCss(work.kind, work.angle, stops) : ''

  const setWorkState = (next: WorkState) => setWork(() => next)

  const addStop = () => {
    const index = stops.length
    const stop: GradientStop = {
      color: swatchDisplay(index),
      position: nextPosition(index, index + 1),
    }
    setWorkState({ ...work, stops: [...stops, stop] })
  }

  const updateStop = (index: number, patch: Partial<GradientStop>) => {
    const next = stops.map((s, i) => (i === index ? { ...s, ...patch } : s))
    setWorkState({ ...work, stops: next })
  }

  const removeStop = (index: number) => {
    setWorkState({ ...work, stops: stops.filter((_, i) => i !== index) })
  }

  const positionError = (index: number) => {
    const stop = stops[index]
    if (stop == null) return null
    if (stop.position < 0 || stop.position > 100) {
      return 'Keep the position between 0 and 100'
    }
    return null
  }

  const copyCss = () => {
    flash('CSS copied')
    void clipboard.copy(css).catch(() => undefined)
  }

  const saveGradient = () => {
    const name = work.name.trim()
    if (!name) {
      flash('Name the gradient first')
      return
    }
    collection.actions.add({
      name,
      kind: work.kind,
      angle: work.angle,
      stops,
    })
    flash(`Saved ${name}`)
  }

  const deleteSaved = (id: string, name: string) => {
    collection.actions.remove(id)
    flash(`Deleted ${name}`)
  }

  return (
    <AppShell
      name="Gradient Generator"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={stops.length > 0 ? `${stops.length} stop${stops.length === 1 ? '' : 's'}` : 'Ready'}
      status={work.kind}
      side={
        <Rail
          title="Gradient Generator"
          note="CSS gradient · local library"
          chips={['Linear or radial', 'Live CSS preview', 'Copy to clipboard', 'Save to library']}
        >
          <Card mono="Library" title="Saved gradients" flush>
            {collection.state.isLoading ? null : collection.state.activeItems.length === 0 ? (
              <EmptyState
                mono="Library"
                title="No gradients saved"
                detail="Name your gradient and press Save gradient to keep it here."
                actionLabel="Save gradient"
              />
            ) : (
              <List label="Saved gradients">
                {collection.state.activeItems.map((item) => (
                  <Row
                    key={item.id}
                    title={item.data.name}
                    meta={
                      <Tag>
                        {item.data.kind} · {item.data.stops.length} stop{item.data.stops.length === 1 ? '' : 's'}
                      </Tag>
                    }
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${item.data.name}`} onClick={() => deleteSaved(item.id, item.data.name)}>
                        Delete {item.data.name}
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </Rail>
      }
    >
      <div role="status" aria-label={toast ?? undefined}>
        {toast ?? ''}
      </div>
      <Card mono="Mix" title="Stops">
        <FormGrid>
          <Select
            label="Type"
            value={work.kind}
            onChange={(v) => setWorkState({ ...work, kind: v as GradientKind })}
            options={TYPE_OPTIONS}
          />
          <TextInput
            label="Angle (deg)"
            type="number"
            value={String(work.angle)}
            onChange={(v) => setWorkState({ ...work, angle: Number(v) || 0 })}
            placeholder="90"
          />
        </FormGrid>

        {stops.length === 0 ? (
          <EmptyState
            mono="Stops"
            title="No stops yet"
            detail="Press Add stop to start mixing your gradient."
            actionLabel="Add stop"
          />
        ) : (
          <List label="Stops">
            {stops.map((stop, index) => (
              <Row
                key={index}
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(6px * var(--sf))' }}>
                    <input
                      type="color"
                      aria-label={`Stop ${index + 1} color`}
                      value={swatchCss(index)}
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
                    Stop {index + 1}
                  </span>
                }
                meta={
                  <TextInput
                    label="Position"
                    type="number"
                    value={String(stop.position)}
                    onChange={(v) => {
                      const n = Number(v)
                      if (Number.isFinite(n)) updateStop(index, { position: n })
                    }}
                    error={positionError(index)}
                  />
                }
                value={
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'calc(4px * var(--sf))' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))' }}>{stop.color}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))' }}>{stop.position}%</span>
                  </span>
                }
                action={
                  <Button kind="ghost" ariaLabel={`Remove stop ${index + 1}`} onClick={() => removeStop(index)}>
                    Remove
                  </Button>
                }
              />
            ))}
          </List>
        )}

        <Actions>
          <Button kind="primary" onClick={addStop}>
            Add stop
          </Button>
        </Actions>
      </Card>

      <Card
        mono="Output"
        title="CSS preview"
        actions={
          <Actions>
            <Button onClick={copyCss}>Copy CSS</Button>
          </Actions>
        }
      >
        {stops.length === 0 ? (
          <EmptyState
            mono="CSS"
            title="Nothing to preview"
            detail="Add a stop to generate the CSS."
            actionLabel="Add stop"
          />
        ) : (
          <div>
            <div
              aria-label="Gradient preview"
              style={{
                height: 'calc(56px * var(--sf))',
                background: css,
              }}
            />
            <KpiRow>
              <Kpi
                value={
                  <span role="status" aria-label="CSS preview" style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', wordBreak: 'break-all' }}>
                    {css}
                  </span>
                }
                label="CSS"
                accent
              />
            </KpiRow>
          </div>
        )}
      </Card>

      <Card mono="Library" title="Save this gradient">
        <FormGrid>
          <TextInput
            label="Name"
            value={work.name}
            onChange={(v) => setWorkState({ ...work, name: v })}
            placeholder="e.g. Sunset"
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={saveGradient}>
            Save gradient
          </Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
