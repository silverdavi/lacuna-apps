// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Viewer registry and FilePreview. A format module registers a Viewer whose
// load() dynamically imports its heavy code, so nothing format-specific is in
// the host bundle until a file of that format is opened.
import { Component, useEffect, useRef, useState, type ComponentType, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card, MonoLabel, Tag } from '@lacuna/ui'
import {
  FormatError, detect, extensionOf, formatBytes, formatInfo, isFormatError,
  type ConversionWarning, type Detection, type FormatErrorCode, type FormatId, type FormatInfo, type Result,
} from '@lacuna/formats'
import './preview.css'

export interface OpenedFile {
  name: string
  size: number
  bytes: Uint8Array
  format: FormatInfo
  detection: Detection
}

export interface ViewerImpl<T> {
  /** Parse and validate. Throw FormatError for files the viewer cannot open. */
  prepare(file: OpenedFile, signal: AbortSignal): Promise<Result<T>>
  View: ComponentType<{ data: T; file: OpenedFile }>
  /** Release object URLs, workers, and documents. */
  dispose?(data: T): void
}

export interface Viewer<T = unknown> {
  id: string
  label: string
  formats: FormatId[]
  /** Larger files are refused before they are read. */
  maxBytes: number
  load(): Promise<ViewerImpl<T>>
}

const viewers: Viewer<any>[] = []

export function registerViewer<T>(v: Viewer<T>): void {
  const i = viewers.findIndex((x) => x.id === v.id)
  if (i >= 0) viewers.splice(i, 1, v)
  else viewers.push(v)
}

export function viewerFor(format: FormatId): Viewer<unknown> | null {
  return viewers.find((v) => v.formats.includes(format)) ?? null
}

export function listViewers(): Viewer<unknown>[] {
  return [...viewers]
}

/** "DOCX, PDF, PNG, …" for every format a registered viewer opens. */
export function previewableFormats(): string {
  const ids = [...new Set(viewers.flatMap((v) => v.formats))]
  return ids.map((id) => (formatInfo(id)?.extensions[0] ?? id).toUpperCase()).join(', ')
}

/** Nothing larger is read into memory, whatever the viewer allows. */
export const MAX_READ_BYTES = 100 * 1024 * 1024
const SNIFF_BYTES = 64 * 1024

/** Detect from the head and tail only, so a refused file is never read whole. */
export async function detectFile(file: Blob & { name: string }): Promise<Detection> {
  if (file.size <= SNIFF_BYTES * 2) return detect(new Uint8Array(await file.arrayBuffer()), file.name)
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer())
  const tail = new Uint8Array(await file.slice(file.size - SNIFF_BYTES).arrayBuffer())
  const both = new Uint8Array(head.length + tail.length)
  both.set(head)
  both.set(tail, head.length)
  return detect(both, file.name)
}

type State =
  | { phase: 'reading' }
  | { phase: 'ready'; file: OpenedFile; viewer: Viewer<unknown>; impl: ViewerImpl<unknown>; data: unknown; warnings: ConversionWarning[] }
  | { phase: 'error'; code: FormatErrorCode; title: string; message: string; detail?: string }

const ERROR_TITLE: Record<FormatErrorCode, string> = {
  corrupt: 'This file could not be read',
  encrypted: 'This file is password protected',
  unsupported: 'No preview for this file type',
  'too-large': 'This file is too large to preview',
  empty: 'This file is empty',
}

async function open(file: File, signal: AbortSignal): Promise<Extract<State, { phase: 'ready' }>> {
  if (file.size === 0) throw new FormatError('empty', 'The file has no contents.')
  if (file.size > MAX_READ_BYTES) {
    throw new FormatError('too-large', `${formatBytes(file.size)} is over the ${formatBytes(MAX_READ_BYTES)} preview limit.`)
  }
  const detection = await detectFile(file)
  const ext = extensionOf(file.name)
  if (!detection.format) {
    if (detection.claimed) {
      throw new FormatError('corrupt', `The name says ${detection.claimed.label}, but the contents are not a readable ${detection.claimed.label}. The file may be damaged or renamed.`)
    }
    throw new FormatError('unsupported', `Lacuna cannot preview ${ext ? `.${ext} files` : 'this file'} yet. It previews ${previewableFormats()}.`)
  }
  const viewer = viewerFor(detection.format.id)
  if (!viewer) {
    throw new FormatError('unsupported', `Lacuna cannot preview ${detection.format.label} files yet. It previews ${previewableFormats()}.`)
  }
  if (file.size > viewer.maxBytes) {
    throw new FormatError('too-large', `${formatBytes(file.size)} is over the ${formatBytes(viewer.maxBytes)} limit for ${detection.format.label} previews.`)
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const opened: OpenedFile = { name: file.name, size: file.size, bytes, format: detection.format, detection }
  let impl: ViewerImpl<unknown>
  try {
    impl = await viewer.load()
  } catch (e) {
    throw new FormatError('unsupported', `The ${viewer.label} could not be loaded. Check the connection and try again.`, { cause: e })
  }
  const result = await impl.prepare(opened, signal)
  const warnings = [...result.warnings]
  if (detection.claimed) {
    warnings.unshift({ code: 'renamed', message: `The name says ${detection.claimed.label}, but the contents are ${detection.format.label}. Shown as ${detection.format.label}.` })
  }
  return { phase: 'ready', file: opened, viewer, impl, data: result.output, warnings }
}

class ViewBoundary extends Component<{ children: ReactNode; onError(e: unknown): void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown, _info: ErrorInfo) { this.props.onError(e) }
  render() { return this.state.failed ? null : this.props.children }
}

/** Read, detect, and preview one local file. Nothing is uploaded or stored. */
export function FilePreview({ file, onClose }: { file: File; onClose?: () => void }) {
  const [state, setState] = useState<State>({ phase: 'reading' })
  const live = useRef<Extract<State, { phase: 'ready' }> | null>(null)

  useEffect(() => {
    const ctl = new AbortController()
    setState({ phase: 'reading' })
    open(file, ctl.signal).then(
      (ready) => {
        if (ctl.signal.aborted) { ready.impl.dispose?.(ready.data); return }
        live.current = ready
        setState(ready)
      },
      (e: unknown) => {
        if (ctl.signal.aborted) return
        setState(toError(e))
      },
    )
    return () => {
      ctl.abort()
      const r = live.current
      live.current = null
      if (r) r.impl.dispose?.(r.data)
    }
  }, [file])

  const kind = state.phase === 'ready' ? state.file.format.label : state.phase === 'error' ? 'Not previewed' : 'Opening'
  return (
    <Card
      className="lc-fp"
      mono={`${kind.toUpperCase()} · ${formatBytes(file.size)} · THIS DEVICE ONLY`}
      title={<span className="lc-fp-name" data-testid="preview-name">{file.name}</span>}
      actions={onClose && <Button kind="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="lc-fp-body" data-testid="file-preview" data-phase={state.phase} data-format={state.phase === 'ready' ? state.file.format.id : ''} data-error={state.phase === 'error' ? state.code : ''}>
        {state.phase === 'reading' && <MonoLabel sm faint>Reading the file on this device…</MonoLabel>}
        {state.phase === 'error' && (
          <div className="lc-fp-error" role="alert" data-testid="preview-error">
            <Tag accent>{state.code === 'too-large' ? 'Too large' : state.code === 'unsupported' ? 'Unsupported' : state.code === 'encrypted' ? 'Locked' : state.code === 'empty' ? 'Empty' : 'Unreadable'}</Tag>
            <strong>{state.title}</strong>
            <p>{state.message}</p>
            {state.detail && <MonoLabel sm faint>{state.detail}</MonoLabel>}
          </div>
        )}
        {state.phase === 'ready' && (
          <>
            {state.warnings.length > 0 && (
              <ul className="lc-fp-warnings" data-testid="preview-warnings" aria-label="Conversion notes">
                {state.warnings.map((w, i) => <li key={`${w.code}-${i}`} data-code={w.code}>{w.message}</li>)}
              </ul>
            )}
            <ViewBoundary onError={(e) => setState(toError(e))}>
              <state.impl.View data={state.data} file={state.file} />
            </ViewBoundary>
          </>
        )}
      </div>
    </Card>
  )
}

/** Drop area and file picker. Hands the first file to `onFile`; reads nothing itself. */
export function FileDrop({ onFile, title = 'Open a file from this device', hint }: { onFile(file: File): void; title?: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className={`lc-fp-drop${over ? ' over' : ''}`}
      data-testid="file-drop"
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
    >
      <div>
        <strong>{title}</strong>
        <span>{hint ?? `Drop it here or choose it. Previews ${previewableFormats()}. The file stays on this device.`}</span>
      </div>
      <Button kind="secondary" onClick={() => input.current?.click()}>Choose file</Button>
      <input
        ref={input}
        type="file"
        hidden
        data-testid="file-input"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0]
          if (f) onFile(f)
          e.currentTarget.value = ''
        }}
      />
    </div>
  )
}

function toError(e: unknown): Extract<State, { phase: 'error' }> {
  if (isFormatError(e)) return { phase: 'error', code: e.code, title: ERROR_TITLE[e.code], message: e.message }
  const detail = e instanceof Error ? e.message.slice(0, 160) : undefined
  return { phase: 'error', code: 'corrupt', title: ERROR_TITLE.corrupt, message: 'The file may be damaged or in a variant Lacuna does not read yet.', detail }
}
