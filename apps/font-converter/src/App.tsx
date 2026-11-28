// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  ErrorState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  buildFontFaceCss,
  createSampleFontBytes,
  inspectFontBytes,
  type FontInspection,
} from './engine/font'

interface FontPrefs {
  family: string
  weight: string
  style: string
  display: string
  inlineBase64: boolean
}

const DEFAULT_PREFS: FontPrefs = {
  family: 'BrandSans',
  weight: '400',
  style: 'normal',
  display: 'swap',
  inlineBase64: true,
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<FontPrefs>({
    key: 'font-converter.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [inspection, setInspection] = useState<FontInspection>(() =>
    inspectFontBytes(createSampleFontBytes(), 'sample-font.ttf'),
  )
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const cssOutput = useMemo(
    () => buildFontFaceCss({ ...prefs, inspection }),
    [prefs, inspection],
  )

  async function onUpload(file: File) {
    setError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setInspection(inspectFontBytes(bytes, file.name))
      setPrefs((p) => ({ ...p, family: file.name.replace(/\.[^.]+$/, '') }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not inspect font')
    }
  }

  const side = (
    <Stack>
      <Rail title="Font Header" note={inspection.filename}>
        <KpiRow>
          <Kpi value={inspection.format} label="Format" accent />
          <Kpi value={String(inspection.numTables)} label="Tables" />
          <Kpi value={`${inspection.bytes} B`} label="Bytes" />
        </KpiRow>
      </Rail>
      <Rail title="Supported">
        <Keys
          items={[
            ['Web', 'WOFF2, WOFF'],
            ['Desktop', 'TTF, OTF (SFNT)'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Font Converter"
      icon="design"
      hue="blue"
      category="Productivity"
      meta="TTF · OTF · WOFF · WOFF2"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onUpload(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Font error" detail={error} /> : null}

        <Card mono="Settings" title="@font-face CSS generator">
          <FormGrid>
            <TextInput
              label="Font family name"
              value={prefs.family}
              onChange={(v) => setPrefs((p) => ({ ...p, family: v }))}
            />
            <Select
              label="Font weight"
              value={prefs.weight}
              onChange={(v) => setPrefs((p) => ({ ...p, weight: v }))}
              options={[
                { value: '300', label: '300 (Light)' },
                { value: '400', label: '400 (Regular)' },
                { value: '500', label: '500 (Medium)' },
                { value: '600', label: '600 (SemiBold)' },
                { value: '700', label: '700 (Bold)' },
                { value: '100 900', label: '100 900 (Variable)' },
              ]}
            />
            <Select
              label="Font style"
              value={prefs.style}
              onChange={(v) => setPrefs((p) => ({ ...p, style: v }))}
              options={[
                { value: 'normal', label: 'normal' },
                { value: 'italic', label: 'italic' },
              ]}
            />
            <Select
              label="font-display"
              value={prefs.display}
              onChange={(v) => setPrefs((p) => ({ ...p, display: v }))}
              options={[
                { value: 'swap', label: 'swap' },
                { value: 'optional', label: 'optional' },
                { value: 'fallback', label: 'fallback' },
                { value: 'block', label: 'block' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Embed inline Base64 Data URI"
              checked={prefs.inlineBase64}
              onChange={(c) => setPrefs((p) => ({ ...p, inlineBase64: c }))}
            />
          </div>
          {inspection.tables.length > 0 ? (
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
              {inspection.tables.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          ) : null}
          <Actions>
            <PrimaryButton
              onClick={() =>
                saveBlob(new Blob([cssOutput], { type: 'text/css;charset=utf-8' }), {
                  filename: `${(prefs.family || 'font').toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.css`,
                  mimeType: 'text/css;charset=utf-8',
                })
              }
            >
              Download CSS
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void copy(cssOutput)}>
              {copied ? 'Copied' : 'Copy CSS'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open font file
            </Button>
          </Actions>
        </Card>

        <Card mono="Output" title="Generated stylesheet">
          <TextInput label="Generated @font-face CSS" value={cssOutput} onChange={() => {}} rows={9} />
        </Card>
      </Stack>
    </AppShell>
  )
}
