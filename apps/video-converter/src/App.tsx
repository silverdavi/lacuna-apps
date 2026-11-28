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
  capturePosterPng,
  generateTestVideoFile,
  probeVideoFile,
  transcodeToWebm,
  type VideoProbe,
} from './engine/video'

interface HistoryEntry {
  id: string
  inputName: string
  outputName: string
  bytes: number
}

interface VideoPrefs {
  maxHeight: string
  codec: string
  bitrate: string
  mute: boolean
  history: HistoryEntry[]
}

const DEFAULT_PREFS: VideoPrefs = {
  maxHeight: '480',
  codec: 'video/webm;codecs=vp9',
  bitrate: '1200000',
  mute: true,
  history: [],
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<VideoPrefs>({
    key: 'video-converter.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [file, setFile] = useState<File | null>(null)
  const [probe, setProbe] = useState<VideoProbe | null>(null)
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function loadVideo(f: File) {
    setError(null)
    setOutputBlob(null)
    try {
      const info = await probeVideoFile(f)
      setFile(f)
      setProbe(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to inspect video')
    }
  }

  async function onGenerateSample() {
    setBusy(true)
    setError(null)
    try {
      const clip = await generateTestVideoFile()
      await loadVideo(clip)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate test clip')
    } finally {
      setBusy(false)
    }
  }

  async function convert() {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    try {
      const blob = await transcodeToWebm(file, {
        maxHeight: Number(prefs.maxHeight),
        codec: prefs.codec,
        bitrate: Number(prefs.bitrate),
        mute: prefs.mute,
      })
      setOutputBlob(blob)
      const outName = file.name.replace(/\.[^.]+$/, '') + '.webm'
      setPrefs((p) => ({
        ...p,
        history: [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            inputName: file.name,
            outputName: outName,
            bytes: blob.size,
          },
          ...p.history,
        ].slice(0, 30),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Video transcoding failed')
    } finally {
      setBusy(false)
    }
  }

  async function grabPoster() {
    if (!file || busy) return
    setError(null)
    try {
      const png = await capturePosterPng(file)
      const outName = file.name.replace(/\.[^.]+$/, '') + '-poster.png'
      saveBlob(png, { filename: outName, mimeType: 'image/png' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Poster capture failed')
    }
  }

  const outputName = file ? file.name.replace(/\.[^.]+$/, '') + '.webm' : 'converted.webm'

  const side = (
    <Stack>
      <Rail title="Clip Info" note={file ? file.name : 'No video loaded'}>
        <KpiRow>
          <Kpi value={probe ? `${probe.width}×${probe.height}` : '—'} label="Resolution" accent />
          <Kpi value={file ? `${(file.size / 1024).toFixed(1)} KB` : '—'} label="Input" />
          <Kpi value={outputBlob ? `${(outputBlob.size / 1024).toFixed(1)} KB` : '—'} label="Output" />
        </KpiRow>
      </Rail>
      <Rail title="Engine">
        <Keys
          items={[
            ['Transcode', 'Canvas + MediaRecorder'],
            ['Poster', 'Instant PNG frame grab'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Video Converter"
      icon="meeting"
      hue="blue"
      category="Productivity"
      meta="WebM & poster grab"
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
            if (f) void loadVideo(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Video error" detail={error} /> : null}

        <Card mono="Input" title="Source video">
          <Actions>
            <Button kind="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Open video file
            </Button>
            <Button kind="secondary" onClick={() => void onGenerateSample()} disabled={busy}>
              Generate test clip
            </Button>
          </Actions>
          {file && probe ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <List label="Loaded video">
                <Row
                  title={file.name}
                  meta={`${probe.width}×${probe.height} · ${(file.size / 1024).toFixed(1)} KB`}
                  value={<Tag accent>{outputBlob ? 'Converted' : 'Loaded'}</Tag>}
                />
              </List>
            </div>
          ) : null}
        </Card>

        <Card mono="Settings" title="Transcode">
          <FormGrid>
            <Select
              label="Target height"
              value={prefs.maxHeight}
              onChange={(v) => setPrefs((p) => ({ ...p, maxHeight: v }))}
              options={[
                { value: '0', label: 'Original resolution' },
                { value: '720', label: '720p max' },
                { value: '480', label: '480p max' },
                { value: '360', label: '360p max' },
              ]}
            />
            <Select
              label="Codec"
              value={prefs.codec}
              onChange={(v) => setPrefs((p) => ({ ...p, codec: v }))}
              options={[
                { value: 'video/webm;codecs=vp9', label: 'WebM (VP9)' },
                { value: 'video/webm;codecs=vp8', label: 'WebM (VP8)' },
                { value: 'video/webm', label: 'WebM (Auto)' },
              ]}
            />
            <Select
              label="Bitrate"
              value={prefs.bitrate}
              onChange={(v) => setPrefs((p) => ({ ...p, bitrate: v }))}
              options={[
                { value: '2500000', label: '2.5 Mbps (High)' },
                { value: '1200000', label: '1.2 Mbps (Balanced)' },
                { value: '600000', label: '600 Kbps (Compact)' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Mute audio track"
              checked={prefs.mute}
              onChange={(c) => setPrefs((p) => ({ ...p, mute: c }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={() => void convert()} disabled={!file || busy}>
              {busy ? 'Processing…' : 'Convert to WebM'}
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={!outputBlob}
              onClick={() => {
                if (outputBlob) saveBlob(outputBlob, { filename: outputName, mimeType: 'video/webm' })
              }}
            >
              Download WebM
            </Button>
            <Button kind="secondary" disabled={!file || busy} onClick={() => void grabPoster()}>
              Grab poster PNG
            </Button>
          </Actions>
        </Card>

        <Card mono="History" title="Recent conversions">
          {prefs.history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No videos converted yet"
              detail="Open a video file or generate a test clip to transcode locally."
              actionLabel="Generate test clip"
              onAction={() => void onGenerateSample()}
            />
          ) : (
            <>
              <List label="Video history">
                {prefs.history.map((h) => (
                  <Row
                    key={h.id}
                    title={`${h.inputName} \u2192 ${h.outputName}`}
                    meta={`${(h.bytes / 1024).toFixed(1)} KB`}
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
