// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  Cols,
  ErrorState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  optimizeSvg,
  parseSvgDimensions,
  rasterizeSvg,
  SAMPLE_SVG,
  svgToCssBackground,
  svgToDataUri,
  svgToJsx,
  type SvgOutputTarget,
} from './engine/svg'

interface SvgState {
  source: string
  target: SvgOutputTarget
  scale: string
  stripComments: boolean
  stripMetadata: boolean
  roundDecimals: boolean
  minifyWhitespace: boolean
}

const DEFAULT_STATE: SvgState = {
  source: SAMPLE_SVG,
  target: 'svg-min',
  scale: '2',
  stripComments: true,
  stripMetadata: true,
  roundDecimals: true,
  minifyWhitespace: true,
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<SvgState>({
    key: 'svg-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const computed = useMemo(() => {
    try {
      const dims = parseSvgDimensions(state.source)
      const optimized = optimizeSvg(state.source, {
        stripComments: state.stripComments,
        stripMetadata: state.stripMetadata,
        roundDecimals: state.roundDecimals,
        minifyWhitespace: state.minifyWhitespace,
      })
      const previewUri = svgToDataUri(optimized)
      const textOut =
        state.target === 'datauri'
          ? previewUri
          : state.target === 'css'
            ? svgToCssBackground(optimized)
            : state.target === 'jsx'
              ? svgToJsx(optimized)
              : optimized
      return { dims, optimized, previewUri, textOut, parseError: null as string | null }
    } catch (e) {
      return {
        dims: { width: 0, height: 0 },
        optimized: '',
        previewUri: '',
        textOut: '',
        parseError: e instanceof Error ? e.message : 'Invalid SVG',
      }
    }
  }, [state])

  const savingsPct = useMemo(() => {
    if (!state.source.length || !computed.optimized.length) return '0%'
    const pct = Math.round(((computed.optimized.length - state.source.length) / state.source.length) * 100)
    return pct > 0 ? `+${pct}%` : `${pct}%`
  }, [state.source.length, computed.optimized.length])

  async function download() {
    if (computed.parseError || busy) return
    setError(null)
    if (state.target === 'png' || state.target === 'jpeg' || state.target === 'webp') {
      setBusy(true)
      try {
        const { blob } = await rasterizeSvg(computed.optimized, state.target, Number(state.scale))
        const ext = state.target === 'jpeg' ? 'jpg' : state.target
        saveBlob(blob, { filename: `graphic-${state.scale}x.${ext}`, mimeType: blob.type })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Rasterization failed')
      } finally {
        setBusy(false)
      }
      return
    }
    const ext = state.target === 'jsx' ? 'tsx' : state.target === 'css' ? 'css' : state.target === 'datauri' ? 'txt' : 'svg'
    const mime = state.target === 'svg-min' ? 'image/svg+xml;charset=utf-8' : 'text/plain;charset=utf-8'
    saveBlob(new Blob([computed.textOut], { type: mime }), { filename: `graphic.${ext}`, mimeType: mime })
  }

  const side = (
    <Stack>
      <Rail title="Metrics" note={`${computed.dims.width}×${computed.dims.height} base viewBox`}>
        <KpiRow>
          <Kpi value={`${state.source.length} B`} label="Raw" />
          <Kpi value={`${computed.optimized.length} B`} label="Optimized" accent />
          <Kpi value={savingsPct} label="Delta" />
        </KpiRow>
      </Rail>
      <Rail title="Outputs">
        <Keys
          items={[
            ['Vector', 'Optimized SVG, JSX, CSS'],
            ['Raster', 'PNG, JPEG, WebP (1x–4x)'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="SVG Converter"
      icon="design"
      hue="blue"
      category="Productivity"
      meta="Optimize & rasterize"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void f.text().then((t) => setState((p) => ({ ...p, source: t })))
            e.target.value = ''
          }}
        />

        {computed.parseError || error ? (
          <ErrorState title="SVG error" detail={computed.parseError ?? error ?? ''} />
        ) : null}

        <Card mono="Settings" title="Export target">
          <FormGrid>
            <Select
              label="Output format"
              value={state.target}
              onChange={(v) => setState((p) => ({ ...p, target: v as SvgOutputTarget }))}
              options={[
                { value: 'svg-min', label: 'Optimized SVG (.svg)' },
                { value: 'png', label: 'PNG Raster (.png)' },
                { value: 'jpeg', label: 'JPEG Raster (.jpg)' },
                { value: 'webp', label: 'WebP Raster (.webp)' },
                { value: 'datauri', label: 'Data URI (.txt)' },
                { value: 'css', label: 'CSS background-image (.css)' },
                { value: 'jsx', label: 'React JSX Component (.tsx)' },
              ]}
            />
            <Select
              label="Raster scale"
              value={state.scale}
              onChange={(v) => setState((p) => ({ ...p, scale: v }))}
              options={[
                { value: '1', label: '1x' },
                { value: '2', label: '2x (Retina)' },
                { value: '3', label: '3x' },
                { value: '4', label: '4x (Print)' },
              ]}
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', marginTop: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
            <Checkbox label="Strip comments" checked={state.stripComments} onChange={(c) => setState((p) => ({ ...p, stripComments: c }))} />
            <Checkbox label="Strip metadata" checked={state.stripMetadata} onChange={(c) => setState((p) => ({ ...p, stripMetadata: c }))} />
            <Checkbox label="Round decimals" checked={state.roundDecimals} onChange={(c) => setState((p) => ({ ...p, roundDecimals: c }))} />
            <Checkbox label="Minify whitespace" checked={state.minifyWhitespace} onChange={(c) => setState((p) => ({ ...p, minifyWhitespace: c }))} />
          </div>
          <Actions>
            <PrimaryButton onClick={() => void download()} disabled={Boolean(computed.parseError) || busy}>
              {busy ? 'Rendering…' : 'Download output'}
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void copy(computed.textOut)} disabled={!computed.textOut}>
              {copied ? 'Copied' : 'Copy code'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open SVG
            </Button>
          </Actions>
        </Card>

        {computed.previewUri ? (
          <Card mono="Preview" title="Live render">
            <div
              style={{
                padding: 'calc(16px * var(--sf))',
                background: 'var(--paper-deep)',
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 'calc(2px * var(--sf))',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <img
                src={computed.previewUri}
                alt="SVG preview"
                style={{ maxWidth: '100%', maxHeight: 'calc(220px * var(--sf))', display: 'block' }}
              />
            </div>
          </Card>
        ) : null}

        <Cols kind="2">
          <Card mono="Source" title="SVG markup">
            <TextInput
              label="SVG source"
              value={state.source}
              onChange={(v) => setState((p) => ({ ...p, source: v }))}
              rows={10}
            />
          </Card>
          <Card mono="Result" title="Converted code">
            <TextInput
              label="Output code"
              value={computed.textOut}
              onChange={() => {}}
              rows={10}
            />
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
