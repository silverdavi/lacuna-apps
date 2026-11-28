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
  decodeAudioFile,
  generateSampleAudioFile,
  transcodeAudio,
  type AudioOutputFormat,
  type DecodedAudio,
} from './engine/audio'

interface HistoryRow {
  id: string
  inputName: string
  outputName: string
  bytes: number
}

interface AudioPrefs {
  format: AudioOutputFormat
  sampleRate: string
  channels: string
  normalize: boolean
  reverse: boolean
  history: HistoryRow[]
}

const DEFAULT_PREFS: AudioPrefs = {
  format: 'wav-16',
  sampleRate: '44100',
  channels: '2',
  normalize: true,
  reverse: false,
  history: [],
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<AudioPrefs>({
    key: 'audio-converter.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [decoded, setDecoded] = useState<DecodedAudio | null>(null)
  const [output, setOutput] = useState<{ blob: Blob; filename: string; mime: string; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function onLoadFile(file: File) {
    setError(null)
    setOutput(null)
    setBusy(true)
    try {
      const dec = await decodeAudioFile(file)
      setDecoded(dec)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not decode audio file')
    } finally {
      setBusy(false)
    }
  }

  async function onSample() {
    const f = await generateSampleAudioFile()
    await onLoadFile(f)
  }

  async function convert() {
    if (!decoded || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await transcodeAudio(decoded, {
        format: prefs.format,
        sampleRate: Number(prefs.sampleRate),
        channels: Number(prefs.channels) as 1 | 2,
        normalize: prefs.normalize,
        reverse: prefs.reverse,
      })
      if (output?.url) URL.revokeObjectURL(output.url)
      const url = res.mime === 'audio/wav' ? URL.createObjectURL(res.blob) : ''
      setOutput({ ...res, url })
      setPrefs((p) => ({
        ...p,
        history: [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            inputName: decoded.name,
            outputName: res.filename,
            bytes: res.blob.size,
          },
          ...p.history,
        ].slice(0, 30),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audio transcoding failed')
    } finally {
      setBusy(false)
    }
  }

  const side = (
    <Stack>
      <Rail title="Track" note={decoded ? decoded.name : 'No audio loaded'}>
        <KpiRow>
          <Kpi value={decoded ? `${decoded.buffer.duration.toFixed(2)}s` : '—'} label="Duration" accent />
          <Kpi value={decoded ? `${Math.round(decoded.buffer.sampleRate / 1000)} kHz` : '—'} label="Source" />
          <Kpi value={output ? `${(output.blob.size / 1024).toFixed(1)} KB` : '—'} label="Output" />
        </KpiRow>
      </Rail>
      <Rail title="DSP">
        <Keys
          items={[
            ['Resample', '16 / 22 / 44.1 / 48 kHz'],
            ['Bit depth', '16-bit, 24-bit, 32-bit float'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Audio Converter"
      icon="meeting"
      hue="blue"
      category="Productivity"
      meta="Web Audio DSP"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onLoadFile(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Audio error" detail={error} /> : null}

        <Card mono="Input" title="Source audio">
          <Actions>
            <Button kind="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Open audio file
            </Button>
            <Button kind="secondary" onClick={() => void onSample()} disabled={busy}>
              Generate sample chord
            </Button>
          </Actions>
          {decoded ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <List label="Loaded track">
                <Row
                  title={decoded.name}
                  meta={`${decoded.buffer.duration.toFixed(2)}s · ${decoded.buffer.sampleRate} Hz · ${decoded.buffer.numberOfChannels} ch`}
                  value={<Tag accent>{output ? 'Encoded' : 'Decoded'}</Tag>}
                />
              </List>
            </div>
          ) : null}
        </Card>

        <Card mono="Settings" title="Transcode">
          <FormGrid>
            <Select
              label="Output format"
              value={prefs.format}
              onChange={(v) => setPrefs((p) => ({ ...p, format: v as AudioOutputFormat }))}
              options={[
                { value: 'wav-16', label: 'WAV 16-bit PCM (.wav)' },
                { value: 'wav-24', label: 'WAV 24-bit PCM (.wav)' },
                { value: 'wav-32f', label: 'WAV 32-bit Float (.wav)' },
                { value: 'pcm-16', label: 'Raw 16-bit PCM (.pcm)' },
              ]}
            />
            <Select
              label="Sample rate"
              value={prefs.sampleRate}
              onChange={(v) => setPrefs((p) => ({ ...p, sampleRate: v }))}
              options={[
                { value: '48000', label: '48 kHz (Studio)' },
                { value: '44100', label: '44.1 kHz (CD)' },
                { value: '22050', label: '22.05 kHz (Compact)' },
                { value: '16000', label: '16 kHz (Voice)' },
              ]}
            />
            <Select
              label="Channels"
              value={prefs.channels}
              onChange={(v) => setPrefs((p) => ({ ...p, channels: v }))}
              options={[
                { value: '2', label: 'Stereo (2 ch)' },
                { value: '1', label: 'Mono (1 ch)' },
              ]}
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', marginTop: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
            <Checkbox label="Normalize peak (-1 dB)" checked={prefs.normalize} onChange={(c) => setPrefs((p) => ({ ...p, normalize: c }))} />
            <Checkbox label="Reverse audio" checked={prefs.reverse} onChange={(c) => setPrefs((p) => ({ ...p, reverse: c }))} />
          </div>
          <Actions>
            <PrimaryButton onClick={() => void convert()} disabled={!decoded || busy}>
              {busy ? 'Encoding…' : 'Convert audio'}
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={!output}
              onClick={() => {
                if (output) saveBlob(output.blob, { filename: output.filename, mimeType: output.mime })
              }}
            >
              Download {output?.filename ?? 'output'}
            </Button>
          </Actions>
          {output?.url ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <audio controls src={output.url} style={{ width: '100%' }} />
            </div>
          ) : null}
        </Card>

        <Card mono="History" title="Recent conversions">
          {prefs.history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No audio converted yet"
              detail="Open a WAV/MP3/OGG file or generate a sample chord to test offline resampling."
              actionLabel="Generate sample chord"
              onAction={() => void onSample()}
            />
          ) : (
            <>
              <List label="Audio history">
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
