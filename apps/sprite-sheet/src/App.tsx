// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
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
  buildSpriteSheet,
  generateSampleSprites,
  loadSpriteFile,
  type PackResult,
  type SpriteInput,
} from './engine/packer'

interface SheetPrefs {
  padding: string
  metaFormat: 'json' | 'css'
}

const DEFAULT_PREFS: SheetPrefs = {
  padding: '4',
  metaFormat: 'json',
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<SheetPrefs>({
    key: 'sprite-sheet.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [sprites, setSprites] = useState<SpriteInput[]>([])
  const [result, setResult] = useState<PackResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function onFiles(list: FileList | File[]) {
    setError(null)
    try {
      const loaded: SpriteInput[] = []
      for (const f of Array.from(list)) loaded.push(await loadSpriteFile(f))
      setSprites((prev) => [...prev, ...loaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sprites')
    }
  }

  function loadSamples() {
    setError(null)
    setSprites(generateSampleSprites())
  }

  async function pack() {
    if (sprites.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await buildSpriteSheet(sprites, Number(prefs.padding))
      if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl)
      setResult(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Packing failed')
    } finally {
      setBusy(false)
    }
  }

  const metaCode = result ? (prefs.metaFormat === 'json' ? result.jsonAtlas : result.cssAtlas) : ''

  const side = (
    <Stack>
      <Rail title="Atlas" note="2D bin-packing (Potpack)">
        <KpiRow>
          <Kpi value={String(sprites.length)} label="Sprites" accent />
          <Kpi value={result ? `${result.width}×${result.height}` : '—'} label="Sheet" />
        </KpiRow>
      </Rail>
      <Rail title="Exports">
        <Keys
          items={[
            ['Image', 'spritesheet.png'],
            ['Coords', 'JSON Atlas or CSS'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Sprite Sheet Packer"
      icon="grid"
      hue="blue"
      category="Productivity"
      meta="PNG + JSON / CSS Atlas"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) void onFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Pack error" detail={error} /> : null}

        <Card mono="Input" title="Sprites">
          <Actions>
            <Button kind="secondary" onClick={() => fileRef.current?.click()}>
              Add sprite images
            </Button>
            <Button kind="secondary" onClick={loadSamples}>
              Load sample tiles
            </Button>
            {sprites.length > 0 ? (
              <Button kind="ghost" onClick={() => setSprites([])}>
                Clear sprites
              </Button>
            ) : null}
          </Actions>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            {sprites.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No sprites added"
                detail="Add PNG images or load sample tiles to pack a sprite sheet."
                actionLabel="Load sample tiles"
                onAction={loadSamples}
              />
            ) : (
              <List label="Sprite list">
                {sprites.map((s) => (
                  <Row
                    key={s.id}
                    title={s.name}
                    meta={`${s.width}×${s.height}`}
                    value={<Tag>Sprite</Tag>}
                  />
                ))}
              </List>
            )}
          </div>
        </Card>

        <Card mono="Settings" title="Pack atlas">
          <FormGrid>
            <Select
              label="Padding"
              value={prefs.padding}
              onChange={(v) => setPrefs((p) => ({ ...p, padding: v }))}
              options={[
                { value: '0', label: '0 (Tight)' },
                { value: '2', label: '2' },
                { value: '4', label: '4 (Default)' },
                { value: '8', label: '8' },
              ]}
            />
            <Select
              label="Metadata format"
              value={prefs.metaFormat}
              onChange={(v) => setPrefs((p) => ({ ...p, metaFormat: v as 'json' | 'css' }))}
              options={[
                { value: 'json', label: 'JSON Atlas (.json)' },
                { value: 'css', label: 'CSS Classes (.css)' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={() => void pack()} disabled={sprites.length === 0 || busy}>
              {busy ? 'Packing…' : 'Pack sprite sheet'}
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={!result}
              onClick={() => {
                if (result) saveBlob(result.pngBlob, { filename: 'spritesheet.png', mimeType: 'image/png' })
              }}
            >
              Download PNG
            </Button>
            <Button
              kind="secondary"
              disabled={!result}
              onClick={() => {
                if (!result) return
                const ext = prefs.metaFormat
                saveBlob(new Blob([metaCode], { type: 'text/plain;charset=utf-8' }), {
                  filename: `spritesheet.${ext}`,
                  mimeType: 'text/plain;charset=utf-8',
                })
              }}
            >
              Download {prefs.metaFormat.toUpperCase()}
            </Button>
            <Button kind="ghost" disabled={!metaCode} onClick={() => void copy(metaCode)}>
              {copied ? 'Copied' : 'Copy metadata'}
            </Button>
          </Actions>
        </Card>

        {result ? (
          <Card mono="Output" title="Packed sheet & coordinates">
            <div
              style={{
                padding: 'calc(16px * var(--sf))',
                background: 'var(--paper-deep)',
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 'calc(2px * var(--sf))',
                marginBottom: 'calc(12px * var(--sf))',
              }}
            >
              <img src={result.previewUrl} alt="Packed sprite sheet" style={{ maxWidth: '100%', display: 'block' }} />
            </div>
            <TextInput label="Atlas metadata" value={metaCode} onChange={() => {}} rows={9} />
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  )
}
