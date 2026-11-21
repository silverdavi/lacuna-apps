// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
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
  PrimaryButton,
  Row,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { ProgressRing } from '@lacuna/progress-ring'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveBlob } from '@lacuna/file-save-open'
import { useGifProject } from './host/mock'
import { SAMPLE_FRAMES, type GifProject } from './host'
import { gifBlobFromCanvases, renderSampleFrames } from './gif'
import './app.css'

type Tab = 'frames' | 'settings' | 'history'

interface HistoryEntry {
  filename: string
  frameCount: number
  delayMs: number
  width: number
  height: number
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'frames', label: 'Frames' },
  { id: 'settings', label: 'Settings' },
  { id: 'history', label: 'History' },
]

const monoText: CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'calc(14px * var(--tf))' }

function summaryText(project: GifProject): string {
  const parts = [`Frames: ${project.frames.length}`]
  if (project.delayMs !== 100) parts.push(`Delay: ${project.delayMs}ms`)
  if (project.width !== 800 || project.height !== 600) parts.push(`Size: ${project.width}x${project.height}`)
  return parts.join(', ')
}

function gifName(project: GifProject): string {
  return `gif-maker-${project.width}x${project.height}.gif`
}

export function App() {
  const { value: project, set: setProject } = useGifProject()
  const [tab, setTab] = useState<Tab>('frames')
  const [delayDraft, setDelayDraft] = useState(String(project.delayMs))
  const [widthDraft, setWidthDraft] = useState(String(project.width))
  const [heightDraft, setHeightDraft] = useState(String(project.height))
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const { copied, copy } = useClipboard()

  useEffect(() => setDelayDraft(String(project.delayMs)), [project.delayMs])
  useEffect(() => setWidthDraft(String(project.width)), [project.width])
  useEffect(() => setHeightDraft(String(project.height)), [project.height])

  const addSamples = () => {
    setProject((prev) => ({ ...prev, frames: SAMPLE_FRAMES.map((f) => ({ name: f.name })) }))
  }

  const removeFrame = (name: string) => {
    setProject((prev) => ({ ...prev, frames: prev.frames.filter((f) => f.name !== name) }))
  }

  const applyDelay = () => {
    const n = Number.parseInt(delayDraft, 10)
    if (Number.isNaN(n) || n < 1) return
    setProject((prev) => ({ ...prev, delayMs: n }))
  }

  const applySize = () => {
    const w = Number.parseInt(widthDraft, 10)
    const h = Number.parseInt(heightDraft, 10)
    if (Number.isNaN(w) || w < 1 || Number.isNaN(h) || h < 1) return
    setProject((prev) => ({ ...prev, width: w, height: h }))
  }

  const startExport = () => {
    if (exporting || project.frames.length === 0) return
    setExporting(true)
    setReady(false)
    setExportProgress(0)
    let step = 0
    const tick = () => {
      step += 1
      if (step >= 10) {
        setExportProgress(100)
        setExporting(false)
        setReady(true)
        return
      }
      setExportProgress(step * 10)
      window.setTimeout(tick, 60)
    }
    window.setTimeout(tick, 60)
  }

  const download = useCallback(async () => {
    if (!ready) return
    const canvases = renderSampleFrames(project.frames, project.width, project.height)
    const blob = gifBlobFromCanvases(canvases, project.delayMs)
    saveBlob(blob, { filename: gifName(project), mimeType: 'image/gif' })
    const entry: HistoryEntry = {
      filename: gifName(project),
      frameCount: project.frames.length,
      delayMs: project.delayMs,
      width: project.width,
      height: project.height,
    }
    setHistory((prev) => [entry, ...prev].slice(0, 10))
    setReady(false)
    await copy(gifName(project))
  }, [ready, project, copy])

  const filename = gifName(project)

  return (
    <AppShell
      name="GIF Maker"
      icon="paint"
      hue="gold"
      category="Productivity"
      meta={summaryText(project)}
      status={copied ? 'Copied to clipboard' : undefined}
    >
      <div role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`lc-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' ? (
        <Card mono="Output" title="Size">
          <FormGrid>
            <TextInput label="Width" type="number" value={widthDraft} onChange={setWidthDraft} />
            <TextInput label="Height" type="number" value={heightDraft} onChange={setHeightDraft} />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={applySize} disabled={exporting}>
              Apply
            </PrimaryButton>
          </Actions>
        </Card>
      ) : tab === 'history' ? (
        <Card mono={`${history.length} exports`} title="Export history">
          {history.length === 0 ? (
            <EmptyState
              mono="No exports yet"
              title="No GIFs exported"
              detail="Export a GIF to see it here."
              actionLabel="Go to Frames"
              onAction={() => setTab('frames')}
            />
          ) : (
            <List label="Exports">
              {history.map((h, i) => (
                <Row
                  key={`${h.filename}-${i}`}
                  title={<span className="gf-frame">{h.filename}</span>}
                  meta={`${h.frameCount} frames, ${h.delayMs}ms, ${h.width}x${h.height}`}
                />
              ))}
            </List>
          )}
        </Card>
      ) : (
        <>
          <Card mono={`${project.frames.length} frames`} title="Frames">
            {project.frames.length === 0 ? (
              <EmptyState
                mono="Drop"
                title="Drop images or video here"
                detail="Or add the sample frames to get started."
                actionLabel="Add sample frames"
                onAction={addSamples}
              />
            ) : (
              <List label="Frames">
                {project.frames.map((frame) => (
                  <Row
                    key={frame.name}
                    title={<span className="gf-frame">{frame.name}</span>}
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${frame.name}`} onClick={() => removeFrame(frame.name)}>
                        Delete
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
          <Card mono="Timing" title="Frame delay">
            <FormGrid>
              <TextInput label="Frame delay (ms)" type="number" value={delayDraft} onChange={setDelayDraft} />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={applyDelay} disabled={exporting}>
                Apply
              </PrimaryButton>
            </Actions>
          </Card>
        </>
      )}

      <Card mono="Export" title="Export">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--sf))' }}>
          {exporting && <ProgressRing value={exportProgress} label="Export progress" />}
          <div>
            {exporting ? (
              <div>
                <div style={monoText}>Rendering frames...</div>
                <div style={{ ...monoText, color: 'var(--ink-60)' }}>{Math.round(exportProgress)}%</div>
              </div>
            ) : ready ? (
              <div>
                <Tag accent>GIF ready: {filename}</Tag>
                <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
                  <Button kind="secondary" onClick={download}>
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <Button kind="secondary" onClick={startExport} disabled={project.frames.length === 0 || exporting}>
                Export GIF
              </Button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
          <KpiRow>
            <Kpi value={project.frames.length} label="Frames" />
            <Kpi value={`${project.delayMs}ms`} label="Delay" />
            <Kpi value={`${project.width}x${project.height}`} label="Size" />
          </KpiRow>
        </div>
      </Card>
    </AppShell>
  )
}
