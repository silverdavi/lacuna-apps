// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/file-tool-kit 0.1.0: snapshot of lacuna-components FileToolKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  ChangeEvent,
  DragEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { BeforeAfter } from '@lacuna/before-after'
import type { BeforeAfterProps } from '@lacuna/before-after'
import { ExportMenu } from '@lacuna/export-menu'
import type { FileToolKitProps } from './types'

const FORMATS: Record<string, { label: string; mimeType: string; extension: string }> = {
  csv: { label: 'CSV', mimeType: 'text/csv', extension: 'csv' },
  json: { label: 'JSON', mimeType: 'application/json', extension: 'json' },
  png: { label: 'PNG', mimeType: 'image/png', extension: 'png' },
  pdf: { label: 'PDF', mimeType: 'application/pdf', extension: 'pdf' },
  print: { label: 'Print', mimeType: 'application/pdf', extension: 'pdf' },
}

interface KitState {
  file: File | null
  options: Record<string, string | number | boolean>
  result: Blob | null
  applied: boolean
  error: string | null
  tooLarge: boolean
}

const base: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
}

const panel: CSSProperties = {
  ...base,
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
}

const regionStyle: CSSProperties = {
  ...base,
  position: 'relative',
  border: 'calc(2px * var(--sf)) dashed var(--hair-strong)',
  borderRadius: 'calc(8px * var(--sf))',
  padding: 'calc(16px * var(--sf))',
  background: 'var(--paper-deep)',
}

const inputStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  margin: 0,
}

const button: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 'calc(8px * var(--sf))',
  padding: 'calc(8px * var(--sf))',
  cursor: 'pointer',
}

const errorStyle: CSSProperties = { color: 'var(--danger)' }

const placeholder: CSSProperties = { ...base, color: 'var(--ink-60)' }

export function FileToolKit(props: FileToolKitProps) {
  const {
    accept,
    maxSizeBytes,
    options,
    transform,
    exportFormats = ['png', 'json', 'csv'],
    title = 'File Tool Kit',
    dropZoneProps,
    beforeAfterProps,
    exportMenuProps,
  } = props

  const [state, setState] = useState<KitState>({
    file: null,
    options: { ...(options ?? {}) },
    result: null,
    applied: false,
    error: null,
    tooLarge: false,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) acceptFile(file)
  }

  const acceptFile = (file: File) => {
    if (typeof maxSizeBytes === 'number' && file.size > maxSizeBytes) {
      setState((prev) => ({ ...prev, file: null, result: null, applied: false, error: null, tooLarge: true }))
      return
    }
    setState({
      file,
      options: { ...(options ?? {}) },
      result: null,
      applied: false,
      error: null,
      tooLarge: false,
    })
  }

  const setOption = (id: string, value: string | number | boolean) => {
    setState((prev) => ({ ...prev, options: { ...prev.options, [id]: value } }))
  }

  const apply = async () => {
    const file = state.file
    if (!file) return
    setState((prev) => ({ ...prev, error: null, applied: false, result: null }))
    try {
      const result = await transform(file, { ...state.options })
      setState((prev) => ({ ...prev, result, applied: true, error: null }))
    } catch {
      setState((prev) => ({ ...prev, error: 'Transform failed', applied: false, result: null }))
    }
  }

  const simulateFailure = () => {
    setState((prev) => ({ ...prev, error: 'Transform failed', applied: false, result: null }))
  }

  const reset = () => {
    setState((prev) => ({ ...prev, file: null, result: null, applied: false, error: null, tooLarge: false }))
    if (inputRef.current) inputRef.current.value = ''
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) acceptFile(file)
  }

  const exportOptions = useMemo(() => {
    const result = state.result
    const out: Array<{ id: string; label: string; mimeType: string; extension: string; getData: () => Blob }> = []
    for (const format of exportFormats) {
      const meta = FORMATS[format]
      if (!meta) continue
      out.push({
        id: format,
        label: meta.label,
        mimeType: meta.mimeType,
        extension: meta.extension,
        getData: () => result ?? new Blob([''], { type: meta.mimeType }),
      })
    }
    return out
  }, [exportFormats, state.result])

  const groupLabel = `${title} Options`
  const ba = beforeAfterProps
  const fileLoaded = Boolean(state.file)

  const before = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
      {state.file && (
        <img
          src={URL.createObjectURL(state.file)}
          alt="Original file preview"
          style={{ maxWidth: '100%', maxHeight: 'calc(160px * var(--sf))', objectFit: 'contain' }}
        />
      )}
      <span style={placeholder}>{state.file ? state.file.name : 'Original'}</span>
    </div>
  )

  const after = state.error ? (
    <span style={errorStyle}>Transform failed</span>
  ) : state.applied && state.result ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
      <img
        src={URL.createObjectURL(state.result)}
        alt="Transformed result preview"
        style={{ maxWidth: '100%', maxHeight: 'calc(160px * var(--sf))', objectFit: 'contain' }}
      />
      <span style={placeholder}>Transformed result</span>
    </div>
  ) : (
    <span style={placeholder}>After</span>
  )

  return (
    <div style={panel}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div
        role="region"
        aria-label="Drop file here"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        style={regionStyle}
      >
        <p style={{ margin: 0, pointerEvents: 'none' }}>Drop a file here, or use the control to choose one.</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label="Choose file"
          style={inputStyle}
          onChange={choose}
          {...dropZoneProps}
        />
      </div>
      {state.tooLarge && (
        <p style={errorStyle} role="alert">
          File too large
        </p>
      )}
      <div role="group" aria-label={groupLabel} style={panel}>
        {fileLoaded
          ? Object.entries(state.options).map(([id, value]) => {
              if (typeof value === 'boolean') {
                return (
                  <label key={id} style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(event) => setOption(id, event.target.checked)}
                    />
                    {id}
                  </label>
                )
              }
              if (typeof value === 'number') {
                return (
                  <label key={id} style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
                    {id}
                    <input
                      type="number"
                      value={String(value)}
                      onChange={(event) => {
                        const parsed = Number(event.target.value)
                        setOption(id, Number.isNaN(parsed) ? 0 : parsed)
                      }}
                    />
                  </label>
                )
              }
              return (
                <label key={id} style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
                  {id}
                  <input type="text" value={value} onChange={(event) => setOption(id, event.target.value)} />
                </label>
              )
            })
          : (
              <span style={placeholder}>Load a file to adjust options.</span>
            )}
      </div>
      <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
        <button type="button" style={button} onClick={apply} disabled={!fileLoaded}>
          Apply Transform
        </button>
        <button type="button" style={button} onClick={simulateFailure}>
          Simulate failure
        </button>
        <button type="button" style={button} onClick={reset}>
          Reset
        </button>
      </div>
      {fileLoaded && (
        <BeforeAfter
          mode={ba?.mode ?? 'side-by-side'}
          initialPosition={ba?.initialPosition}
          ariaLabel={ba?.ariaLabel}
          minHeight={ba?.minHeight}
          disabled={ba?.disabled}
          before={before}
          after={after}
        />
      )}
      <ExportMenu
        options={exportOptions}
        fileName="export"
        ariaLabel="Export"
        disabled={!state.applied}
        {...exportMenuProps}
      />
    </div>
  )
}
