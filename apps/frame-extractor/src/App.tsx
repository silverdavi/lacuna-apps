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
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  buildContactSheet,
  extractVideoFrames,
  generateSampleExtractedFrames,
  packFramesZip,
  type ExtractedFrame,
} from './engine/frames'

interface FramePrefs {
  count: string
  cols: string
}

const DEFAULT_PREFS: FramePrefs = {
  count: '6',
  cols: '3',
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<FramePrefs>({
    key: 'frame-extractor.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [sourceName, setSourceName] = useState('')
  const [frames, setFrames] = useState<ExtractedFrame[]>([])
  const [sheet, setSheet] = useState<{ blob: Blob; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function finalizeFrames(name: string, nextFrames: ExtractedFrame[]) {
    setSourceName(name)
    setFrames(nextFrames)
    const built = await buildContactSheet(nextFrames, Number(prefs.cols))
    if (sheet?.url) URL.revokeObjectURL(sheet.url)
    setSheet(built)
  }

  async function onVideoUpload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const extracted = await extractVideoFrames(file, Number(prefs.count))
      await finalizeFrames(file.name, extracted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Frame extraction failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSample() {
    setBusy(true)
    setError(null)
    try {
      const sample = await generateSampleExtractedFrames(Number(prefs.count))
      await finalizeFrames('sample-clip.webm', sample)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sample extraction failed')
    } finally {
      setBusy(false)
    }
  }

  const side = (
    <Stack>
      <Rail title="Capture" note={sourceName || 'No video sampled'}>
        <KpiRow>
          <Kpi value={String(frames.length)} label="Frames" accent />
          <Kpi value={sheet ? `${(sheet.blob.size / 1024).toFixed(1)} KB` : '—'} label="Sheet" />
        </KpiRow>
      </Rail>
      <Rail title="Exports">
        <Keys
          items={[
            ['Grid', 'contact-sheet.png'],
            ['Bundle', 'frames.zip'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Video Frame Grabber"
      icon="meeting"
      hue="blue"
      category="Productivity"
      meta="Contact Sheet & ZIP"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onVideoUpload(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Extraction error" detail={error} /> : null}

        <Card mono="Settings" title="Sample timeline">
          <FormGrid>
            <Select
              label="Frames to capture"
              value={prefs.count}
              onChange={(v) => setPrefs((p) => ({ ...p, count: v }))}
              options={[
                { value: '4', label: '4 frames' },
                { value: '6', label: '6 frames' },
                { value: '9', label: '9 frames' },
                { value: '12', label: '12 frames' },
              ]}
            />
            <Select
              label="Contact sheet columns"
              value={prefs.cols}
              onChange={(v) => setPrefs((p) => ({ ...p, cols: v }))}
              options={[
                { value: '2', label: '2 columns' },
                { value: '3', label: '3 columns' },
                { value: '4', label: '4 columns' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={() => fileRef.current?.click()} disabled={busy}>
              Open video file
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void onSample()} disabled={busy}>
              {busy ? 'Sampling…' : 'Sample demo video'}
            </Button>
            <Button
              kind="secondary"
              disabled={!sheet}
              onClick={() => {
                if (sheet) saveBlob(sheet.blob, { filename: 'contact-sheet.png', mimeType: 'image/png' })
              }}
            >
              Download contact sheet
            </Button>
            <Button
              kind="secondary"
              disabled={frames.length === 0}
              onClick={() =>
                saveBlob(packFramesZip(frames), { filename: 'frames.zip', mimeType: 'application/zip' })
              }
            >
              Download frames.zip
            </Button>
          </Actions>
        </Card>

        {sheet ? (
          <Card mono="Contact Sheet" title="Tiled preview">
            <img src={sheet.url} alt="Video contact sheet" style={{ width: '100%', display: 'block' }} />
          </Card>
        ) : null}

        <Card mono="Frames" title="Captured stills">
          {frames.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No frames captured yet"
              detail="Open a video or sample the demo clip to generate still frames and a contact sheet."
              actionLabel="Sample demo video"
              onAction={() => void onSample()}
            />
          ) : (
            <List label="Captured frames">
              {frames.map((f) => (
                <Row
                  key={f.name}
                  title={f.name}
                  meta={`${f.timeSec.toFixed(2)}s · ${f.width}×${f.height}`}
                  value={<Tag>{`${(f.pngBytes.length / 1024).toFixed(1)} KB`}</Tag>}
                />
              ))}
            </List>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
