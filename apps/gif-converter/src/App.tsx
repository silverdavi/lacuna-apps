// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
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
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  encodeAnimatedGif,
  generateDemoFrames,
  loadImageFrame,
  type GifFrameInput,
} from './engine/gif'

interface GifPrefs {
  fps: string
  width: string
  loop: boolean
  boomerang: boolean
  reverse: boolean
  lastExport: string | null
}

const DEFAULT_PREFS: GifPrefs = {
  fps: '6',
  width: '240',
  loop: true,
  boomerang: false,
  reverse: false,
  lastExport: null,
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<GifPrefs>({
    key: 'gif-converter.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [frames, setFrames] = useState<GifFrameInput[]>([])
  const [gifBlob, setGifBlob] = useState<Blob | null>(null)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function onFiles(fileList: FileList | File[]) {
    setError(null)
    try {
      const loaded: GifFrameInput[] = []
      for (const f of Array.from(fileList)) {
        loaded.push(await loadImageFrame(f))
      }
      setFrames((prev) => [...prev, ...loaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load frames')
    }
  }

  function loadDemo() {
    setError(null)
    setFrames(generateDemoFrames())
  }

  async function buildGif() {
    if (frames.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const blob = await encodeAnimatedGif(frames, {
        width: Number(prefs.width),
        fps: Number(prefs.fps),
        loop: prefs.loop,
        boomerang: prefs.boomerang,
        reverse: prefs.reverse,
      })
      if (gifUrl) URL.revokeObjectURL(gifUrl)
      setGifBlob(blob)
      setGifUrl(URL.createObjectURL(blob))
      setPrefs((p) => ({
        ...p,
        lastExport: `${frames.length} frames · ${(blob.size / 1024).toFixed(1)} KB`,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GIF encoding failed')
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!gifBlob) return
    saveBlob(gifBlob, { filename: 'animation.gif', mimeType: 'image/gif' })
  }

  const side = (
    <Stack>
      <Rail title="Animation" note={prefs.lastExport ?? 'Ready to encode GIF89a.'}>
        <KpiRow>
          <Kpi value={String(frames.length)} label="Frames" accent />
          <Kpi value={`${prefs.fps} fps`} label="Rate" />
          <Kpi value={gifBlob ? `${(gifBlob.size / 1024).toFixed(1)} KB` : '—'} label="GIF Size" />
        </KpiRow>
      </Rail>
      <Rail title="Encoder">
        <Keys
          items={[
            ['Format', 'GIF89a + Netscape loop'],
            ['Codec', 'Pure-TS LZW 256-color'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="GIF Studio"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta="GIF89a encoder"
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

        {error ? <ErrorState title="GIF error" detail={error} /> : null}

        <Card mono="Frames" title="Sequence">
          <Actions>
            <Button kind="secondary" onClick={() => fileRef.current?.click()}>
              Add image frames
            </Button>
            <Button kind="secondary" onClick={loadDemo}>
              Generate demo frames
            </Button>
            {frames.length > 0 ? (
              <Button kind="ghost" onClick={() => setFrames([])}>
                Clear frames
              </Button>
            ) : null}
          </Actions>

          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            {frames.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No frames loaded"
                detail="Add PNG or JPEG images, or generate 6 demo frames to build an animated GIF."
                actionLabel="Generate demo frames"
                onAction={loadDemo}
              />
            ) : (
              <List label="Frame sequence">
                {frames.map((f, idx) => (
                  <Row
                    key={f.id}
                    title={f.name}
                    meta={`${f.width}×${f.height}`}
                    value={<Tag>#{idx + 1}</Tag>}
                    action={
                      <Button
                        kind="ghost"
                        onClick={() => setFrames((prev) => prev.filter((x) => x.id !== f.id))}
                      >
                        Remove
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </div>
        </Card>

        <Card mono="Settings" title="Encode GIF">
          <FormGrid>
            <Select
              label="Frame rate"
              value={prefs.fps}
              onChange={(v) => setPrefs((p) => ({ ...p, fps: v }))}
              options={[
                { value: '2', label: '2 fps (Slow)' },
                { value: '4', label: '4 fps' },
                { value: '6', label: '6 fps (Standard)' },
                { value: '10', label: '10 fps' },
                { value: '15', label: '15 fps (Smooth)' },
              ]}
            />
            <Select
              label="Output width"
              value={prefs.width}
              onChange={(v) => setPrefs((p) => ({ ...p, width: v }))}
              options={[
                { value: '160', label: '160 px wide' },
                { value: '240', label: '240 px wide' },
                { value: '320', label: '320 px wide' },
                { value: '480', label: '480 px wide' },
              ]}
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', marginTop: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
            <Checkbox label="Loop forever" checked={prefs.loop} onChange={(c) => setPrefs((p) => ({ ...p, loop: c }))} />
            <Checkbox label="Boomerang (ping-pong)" checked={prefs.boomerang} onChange={(c) => setPrefs((p) => ({ ...p, boomerang: c }))} />
            <Checkbox label="Reverse order" checked={prefs.reverse} onChange={(c) => setPrefs((p) => ({ ...p, reverse: c }))} />
          </div>
          <Actions>
            <PrimaryButton onClick={() => void buildGif()} disabled={frames.length === 0 || busy}>
              {busy ? 'Encoding GIF…' : 'Encode GIF'}
            </PrimaryButton>
            <Button kind="secondary" onClick={download} disabled={!gifBlob}>
              Download animation.gif
            </Button>
          </Actions>
        </Card>

        {gifUrl ? (
          <Card mono="Preview" title="Encoded GIF">
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
              <img src={gifUrl} alt="Animated GIF preview" style={{ maxWidth: '100%', display: 'block' }} />
            </div>
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  )
}
