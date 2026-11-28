// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useRef, useState } from 'react'
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
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  generateIconKit,
  HTML_HEAD_SNIPPET,
  type GeneratedKit,
  type IconKitSpec,
} from './engine/icons'

interface KitPrefs {
  appName: string
  monogram: string
  bgStyle: IconKitSpec['bgStyle']
  rounded: boolean
}

const DEFAULT_PREFS: KitPrefs = {
  appName: 'Lacuna Studio',
  monogram: 'LS',
  bgStyle: 'cobalt',
  rounded: true,
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<KitPrefs>({
    key: 'favicon-kit.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null)
  const [kit, setKit] = useState<GeneratedKit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function buildKit() {
    setBusy(true)
    setError(null)
    try {
      const next = await generateIconKit({ ...prefs, customImageUrl })
      if (kit?.previewUrl) URL.revokeObjectURL(kit.previewUrl)
      setKit(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Icon generation failed')
    } finally {
      setBusy(false)
    }
  }

  function onImageFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => setCustomImageUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const side = (
    <Stack>
      <Rail title="Bundle" note="ICO + Apple Touch + PWA icons + manifest.">
        <KpiRow>
          <Kpi value={kit ? String(kit.files.length) : '8'} label="Files" accent />
          <Kpi value={kit ? `${(kit.zipBlob.size / 1024).toFixed(1)} KB` : '—'} label="ZIP Size" />
        </KpiRow>
      </Rail>
      <Rail title="Included sizes">
        <Keys
          items={[
            ['favicon.ico', '16, 32, 48 multi-icon'],
            ['Apple / PWA', '180, 192, 512 PNG'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Icon Pack Converter"
      icon="design"
      hue="blue"
      category="Productivity"
      meta="ICO · PWA · Manifest"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImageFile(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Icon error" detail={error} /> : null}

        <Card mono="Source" title="Design or upload icon">
          <FormGrid>
            <TextInput
              label="App name"
              value={prefs.appName}
              onChange={(v) => setPrefs((p) => ({ ...p, appName: v }))}
            />
            <TextInput
              label="Monogram (1-2 letters)"
              value={prefs.monogram}
              onChange={(v) => setPrefs((p) => ({ ...p, monogram: v.slice(0, 2) }))}
            />
            <Select
              label="Badge hue"
              value={prefs.bgStyle}
              onChange={(v) => setPrefs((p) => ({ ...p, bgStyle: v as IconKitSpec['bgStyle'] }))}
              options={[
                { value: 'cobalt', label: 'Cobalt Blue' },
                { value: 'rust', label: 'Lacuna Rust' },
                { value: 'ink', label: 'Charcoal Ink' },
                { value: 'forest', label: 'Forest Green' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Rounded corners"
              checked={prefs.rounded}
              onChange={(c) => setPrefs((p) => ({ ...p, rounded: c }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={() => void buildKit()} disabled={busy}>
              {busy ? 'Generating…' : 'Generate icon pack'}
            </PrimaryButton>
            <Button kind="secondary" onClick={() => fileRef.current?.click()}>
              Upload custom logo
            </Button>
            {customImageUrl ? (
              <Button kind="ghost" onClick={() => setCustomImageUrl(null)}>
                Use monogram
              </Button>
            ) : null}
          </Actions>
        </Card>

        {kit ? (
          <Card mono="Output" title="Generated bundle">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--sf))', marginBottom: 'calc(12px * var(--sf))' }}>
              <img
                src={kit.previewUrl}
                alt="Generated icon preview"
                style={{
                  width: 'calc(64px * var(--sf))',
                  height: 'calc(64px * var(--sf))',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  borderRadius: 'calc(2px * var(--sf))',
                }}
              />
              <Actions>
                <PrimaryButton
                  onClick={() =>
                    saveBlob(kit.zipBlob, { filename: 'favicon-kit.zip', mimeType: 'application/zip' })
                  }
                >
                  Download favicon-kit.zip
                </PrimaryButton>
                <Button
                  kind="secondary"
                  onClick={() =>
                    saveBlob(kit.icoBlob, { filename: 'favicon.ico', mimeType: 'image/x-icon' })
                  }
                >
                  Download favicon.ico
                </Button>
              </Actions>
            </div>
            <List label="Generated files">
              {kit.files.map((f) => (
                <Row
                  key={f.name}
                  title={f.name}
                  meta={`${(f.bytes / 1024).toFixed(1)} KB`}
                  value={<Tag>Ready</Tag>}
                />
              ))}
            </List>
          </Card>
        ) : null}

        <Card mono="HTML" title="Head tags">
          <TextInput label="HTML snippet" value={HTML_HEAD_SNIPPET} onChange={() => {}} rows={5} />
          <Actions>
            <Button kind="secondary" onClick={() => void copy(HTML_HEAD_SNIPPET)}>
              {copied ? 'Copied' : 'Copy HTML tags'}
            </Button>
          </Actions>
        </Card>
      </Stack>
    </AppShell>
  )
}
