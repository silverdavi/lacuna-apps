import { useState } from 'react'
import type { KeyboardEvent } from 'react'
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
  Stack,
  Tag,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { SAMPLES, swatchDisplay } from './colors'
import { DEFAULT_WORK, deleteGradient, listGradients, saveGradient as persistGradient } from './host'
import type { GradientKind, GradientStop, SavedGradient, WorkState } from './host'

const TYPE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
]

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

function AngleInput({
  value,
  error,
  onChange,
  onCommit,
}: {
  value: string
  error: string | null
  onChange: (v: string) => void
  onCommit: () => void
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onCommit()
  }
  return (
    <label className="lc-field">
      <span className="lc-field-label">Angle (deg)</span>
      <input
        className="lc-input"
        type="number"
        inputMode="decimal"
        value={value}
        placeholder="90"
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={onKeyDown}
      />
      {error ? <span className="lk-field-error" role="alert">{error}</span> : null}
    </label>
  )
}

function PositionInput({
  value,
  error,
  onChange,
}: {
  value: number
  error: string | null
  onChange: (v: number) => void
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">Position</span>
      <input
        className="lc-input"
        type="number"
        inputMode="decimal"
        value={String(value)}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          const n = Number(event.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
      />
      {error ? <span className="lk-field-error" role="alert">{error}</span> : null}
    </label>
  )
}

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">Name</span>
      <input
        className="lc-input"
        type="text"
        value={value}
        placeholder="e.g. Sunset"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function App() {
  const { value: work, set: setWork } = useLocalRecord<WorkState>({
    key: 'lacuna.gradient-generator.work',
    version: 1,
    defaultValue: DEFAULT_WORK,
  })

  const [library, setLibrary] = useState<SavedGradient[]>(() => listGradients())
  const [notice, setNotice] = useState<string | null>(null)

  const clipboard = useClipboard({
    timeoutMs: 2000,
    onSuccess: () => setNotice('CSS copied'),
    onError: () => setNotice('Copy failed — select the CSS and copy it'),
  })

  const setWorkState = (next: WorkState) => setWork(() => next)

  const stops = work.stops
  const css = stops.length > 0 ? buildCss(work.kind, work.angle, stops) : ''

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

  const angleError = (() => {
    const draft = work.angleDraft.trim()
    if (draft === '') return 'Enter the angle in degrees'
    const n = Number(draft)
    if (!Number.isFinite(n)) return 'Enter a number between 0 and 360'
    if (n < 0 || n > 360) return 'Keep the angle between 0 and 360'
    return null
  })()

  const commitAngle = () => {
    if (angleError != null) return
    setWorkState({ ...work, angle: Number(work.angleDraft.trim()) })
  }

  const positionError = (position: number): string | null => {
    if (position < 0 || position > 100) return 'Keep the position between 0 and 100'
    return null
  }

  const loadSample = (sample: (typeof SAMPLES)[number]) => {
    setWorkState({
      name: sample.name,
      kind: sample.kind,
      angle: sample.angle,
      angleDraft: String(sample.angle),
      stops: sample.stops.map((s) => ({ ...s })),
    })
    setNotice(`Loaded ${sample.name}`)
  }

  const loadSaved = (record: SavedGradient) => {
    setWorkState({
      name: record.name,
      kind: record.kind,
      angle: record.angle,
      angleDraft: String(record.angle),
      stops: record.stops.map((s) => ({ ...s })),
    })
    setNotice(`Loaded ${record.name}`)
  }

  const copyCss = () => {
    void clipboard.copy(css)
  }

  const saveGradient = () => {
    const name = work.name.trim()
    if (!name) {
      setNotice('Name the gradient first')
      return
    }
    persistGradient({
      name,
      kind: work.kind,
      angle: work.angle,
      stops: stops.map((s) => ({ ...s })),
    })
    setLibrary(listGradients())
    setNotice(`Saved ${name}`)
  }

  const deleteSaved = (id: string, name: string) => {
    deleteGradient(id)
    setLibrary(listGradients())
    setNotice(`Deleted ${name}`)
  }

  return (
    <AppShell
      name="Gradient Generator"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={stops.length > 0 ? `${stops.length} stop${stops.length === 1 ? '' : 's'}` : 'Ready'}
      status={notice ?? (clipboard.copied ? 'CSS copied' : 'Local · no network')}
      side={
        <Rail
          title="Gradient Generator"
          note="CSS gradient · local library"
          chips={['Linear or radial', 'Live CSS preview', 'Copy to clipboard', 'Save to library']}
        >
          <Card mono="Samples" title="Starting points" flush>
            <List label="Samples">
              {SAMPLES.map((sample) => (
                <Row
                  key={sample.name}
                  title={sample.name}
                  meta={
                    <Tag>
                      {sample.kind} · {sample.stops.length} stop{sample.stops.length === 1 ? '' : 's'}
                    </Tag>
                  }
                  action={
                    <Button kind="ghost" ariaLabel={`Load ${sample.name}`} onClick={() => loadSample(sample)}>
                      Load
                    </Button>
                  }
                />
              ))}
            </List>
          </Card>
          <Card mono="Library" title="Saved gradients" flush>
            {library.length === 0 ? (
              <EmptyState
                mono="Library"
                title="No gradients saved"
                detail="Name your gradient and press Save gradient to keep it here."
                actionLabel="Save gradient"
              />
            ) : (
              <List label="Saved gradients">
                {library.map((record) => (
                  <Row
                    key={record.id}
                    title={record.name}
                    meta={
                      <Tag>
                        {record.kind} · {record.stops.length} stop{record.stops.length === 1 ? '' : 's'}
                      </Tag>
                    }
                    value={
                      <Button kind="ghost" ariaLabel={`Load ${record.name}`} onClick={() => loadSaved(record)}>
                        Load
                      </Button>
                    }
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${record.name}`} onClick={() => deleteSaved(record.id, record.name)}>
                        Delete {record.name}
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
      <Card mono="Mix" title="Stops">
        <FormGrid>
          <Select
            label="Type"
            value={work.kind}
            onChange={(v) => setWorkState({ ...work, kind: v as GradientKind })}
            options={TYPE_OPTIONS}
          />
          <AngleInput
            value={work.angleDraft}
            error={angleError}
            onChange={(v) => setWorkState({ ...work, angleDraft: v })}
            onCommit={commitAngle}
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
                title={`Stop ${index + 1}`}
                meta={
                  <PositionInput
                    value={stop.position}
                    error={positionError(stop.position)}
                    onChange={(n) => updateStop(index, { position: n })}
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
          <Stack>
            {clipboard.copied ? (
              <span role="status" aria-label="CSS copied" style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))' }}>
                CSS copied
              </span>
            ) : null}
            <div aria-label="Gradient preview" style={{ height: 'calc(56px * var(--sf))', background: css }} />
            <KpiRow>
              <Kpi
                value={
                  <span
                    role="status"
                    aria-label="CSS preview"
                    style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', wordBreak: 'break-all' }}
                  >
                    {css}
                  </span>
                }
                label="CSS"
                accent
              />
            </KpiRow>
          </Stack>
        )}
      </Card>

      <Card mono="Library" title="Save this gradient">
        <FormGrid>
          <NameInput value={work.name} onChange={(v) => setWorkState({ ...work, name: v })} />
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
