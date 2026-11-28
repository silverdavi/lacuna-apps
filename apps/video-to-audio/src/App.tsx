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
import { extractAudioFromMedia, generateDemoMediaAudio } from './engine/extract'

interface HistoryItem {
  id: string
  source: string
  output: string
  duration: string
  bytes: number
}

interface ExtractPrefs {
  sampleRate: string
  channels: string
  normalize: boolean
  history: HistoryItem[]
}

const DEFAULT_PREFS: ExtractPrefs = {
  sampleRate: '44100',
  channels: '2',
  normalize: true,
  history: [],
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<ExtractPrefs>({
    key: 'video-to-audio.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ blob: Blob; duration: number; filename: string; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function runExtract(targetFile: File) {
    setBusy(true)
    setError(null)
    try {
      const out = await extractAudioFromMedia(targetFile, {
        sampleRate: Number(prefs.sampleRate),
        channels: Number(prefs.channels) as 1 | 2,
        normalize: prefs.normalize,
      })
      if (result?.url) URL.revokeObjectURL(result.url)
      setFile(targetFile)
      setResult({ ...out, url: URL.createObjectURL(out.blob) })
      setPrefs((p) => ({
        ...p,
        history: [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: targetFile.name,
            output: out.filename,
            duration: `${out.duration.toFixed(2)}s`,
            bytes: out.blob.size,
          },
          ...p.history,
        ].slice(0, 30),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not extract audio track')
    } finally {
      setBusy(false)
    }
  }

  const side = (
    <Stack>
      <Rail title="Extracted" note={file ? file.name : 'No media loaded'}>
        <KpiRow>
          <Kpi value={result ? `${result.duration.toFixed(2)}s` : '—'} label="Duration" accent />
          <Kpi value={result ? `${(result.blob.size / 1024).toFixed(1)} KB` : '—'} label="WAV Size" />
        </KpiRow>
      </Rail>
      <Rail title="Pipeline">
        <Keys
          items={[
            ['Decode', 'MP4, WebM, MOV, WAV'],
            ['Export', '16-bit PCM WAV'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Audio Extractor"
      icon="meeting"
      hue="blue"
      category="Productivity"
      meta="Video → WAV"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,audio/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void runExtract(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Extraction error" detail={error} /> : null}

        <Card mono="Settings" title="Extract audio track">
          <FormGrid>
            <Select
              label="Sample rate"
              value={prefs.sampleRate}
              onChange={(v) => setPrefs((p) => ({ ...p, sampleRate: v }))}
              options={[
                { value: '48000', label: '48 kHz' },
                { value: '44100', label: '44.1 kHz' },
                { value: '22050', label: '22.05 kHz' },
                { value: '16000', label: '16 kHz (Voice)' },
              ]}
            />
            <Select
              label="Channels"
              value={prefs.channels}
              onChange={(v) => setPrefs((p) => ({ ...p, channels: v }))}
              options={[
                { value: '2', label: 'Stereo' },
                { value: '1', label: 'Mono' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Normalize peak volume (-1 dB)"
              checked={prefs.normalize}
              onChange={(c) => setPrefs((p) => ({ ...p, normalize: c }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Extracting…' : 'Open video or audio'}
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={busy}
              onClick={() => void runExtract(generateDemoMediaAudio())}
            >
              Extract demo clip
            </Button>
            <Button
              kind="secondary"
              disabled={!result}
              onClick={() => {
                if (result) saveBlob(result.blob, { filename: result.filename, mimeType: 'audio/wav' })
              }}
            >
              Download {result?.filename ?? 'WAV'}
            </Button>
          </Actions>
          {result ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <audio controls src={result.url} style={{ width: '100%' }} />
            </div>
          ) : null}
        </Card>

        <Card mono="History" title="Recent extractions">
          {prefs.history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No tracks extracted yet"
              detail="Open a video file or extract the demo clip to download a clean WAV."
              actionLabel="Extract demo clip"
              onAction={() => void runExtract(generateDemoMediaAudio())}
            />
          ) : (
            <>
              <List label="Extraction history">
                {prefs.history.map((h) => (
                  <Row
                    key={h.id}
                    title={`${h.source} \u2192 ${h.output}`}
                    meta={`${h.duration} · ${(h.bytes / 1024).toFixed(1)} KB`}
                    value={<Tag>WAV</Tag>}
                  />
                ))}
              </List>
              <Actions>
                <Button kind="ghost" onClick={() => setPrefs((p) => ({ ...p, history: [] }))}>
                  Clear history
                </Button>
              </Actions>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
