// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
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
  PrimaryButton,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  computePeaks,
  decodeAudio,
  generateSampleMelodyFile,
  trimAudioBuffer,
} from './engine/trim'

interface TrimmerPrefs {
  fadeInMs: string
  fadeOutMs: string
  speed: string
  reverse: boolean
}

const DEFAULT_PREFS: TrimmerPrefs = {
  fadeInMs: '100',
  fadeOutMs: '150',
  speed: '1',
  reverse: false,
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<TrimmerPrefs>({
    key: 'audio-trimmer.state',
    version: 1,
    defaultValue: DEFAULT_PREFS,
  })

  const [fileName, setFileName] = useState<string>('')
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [startSec, setStartSec] = useState('0')
  const [endSec, setEndSec] = useState('0')
  const [trimmedBlob, setTrimmedBlob] = useState<Blob | null>(null)
  const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const peaks = useMemo(() => (buffer ? computePeaks(buffer, 100) : []), [buffer])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !buffer || peaks.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgb(245, 241, 232)'
    ctx.fillRect(0, 0, w, h)

    const sRatio = Math.max(0, Math.min(1, Number(startSec) / Math.max(0.01, buffer.duration)))
    const eRatio = Math.max(sRatio, Math.min(1, Number(endSec) / Math.max(0.01, buffer.duration)))

    // Highlight selected region
    ctx.fillStyle = 'rgba(34, 87, 166, 0.14)'
    ctx.fillRect(sRatio * w, 0, (eRatio - sRatio) * w, h)

    const barW = w / peaks.length
    peaks.forEach((p, idx) => {
      const ratio = idx / peaks.length
      const inRange = ratio >= sRatio && ratio <= eRatio
      ctx.fillStyle = inRange ? 'rgb(34, 87, 166)' : 'rgb(168, 164, 156)'
      const barH = Math.max(4, p * (h - 16))
      ctx.fillRect(idx * barW + 1, (h - barH) / 2, Math.max(2, barW - 2), barH)
    })
  }, [buffer, peaks, startSec, endSec])

  async function onLoadFile(file: File) {
    setError(null)
    setTrimmedBlob(null)
    try {
      const decoded = await decodeAudio(file)
      setFileName(file.name)
      setBuffer(decoded)
      setStartSec('0')
      setEndSec(decoded.duration.toFixed(2))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not decode audio')
    }
  }

  function onSample() {
    const f = generateSampleMelodyFile()
    void onLoadFile(f)
  }

  function applyTrim() {
    if (!buffer) return
    setError(null)
    const s = Number(startSec)
    const e = Number(endSec)
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e <= s || e > buffer.duration + 0.05) {
      setError('Enter a valid start and end time within the track duration.')
      return
    }
    const blob = trimAudioBuffer(buffer, {
      startSec: s,
      endSec: e,
      fadeInMs: Number(prefs.fadeInMs),
      fadeOutMs: Number(prefs.fadeOutMs),
      speed: Number(prefs.speed),
      reverse: prefs.reverse,
    })
    if (trimmedUrl) URL.revokeObjectURL(trimmedUrl)
    setTrimmedBlob(blob)
    setTrimmedUrl(URL.createObjectURL(blob))
  }

  const outName = (fileName.replace(/\.[^.]+$/, '') || 'clip') + '-trimmed.wav'
  const clipDuration = buffer
    ? Math.max(0, (Number(endSec) - Number(startSec)) / Math.max(0.25, Number(prefs.speed)))
    : 0

  const side = (
    <Stack>
      <Rail title="Selection" note={fileName || 'No track loaded'}>
        <KpiRow>
          <Kpi value={buffer ? `${buffer.duration.toFixed(2)}s` : '—'} label="Original" />
          <Kpi value={buffer ? `${clipDuration.toFixed(2)}s` : '—'} label="Cut length" accent />
          <Kpi value={trimmedBlob ? `${(trimmedBlob.size / 1024).toFixed(1)} KB` : '—'} label="WAV Size" />
        </KpiRow>
      </Rail>
      <Rail title="Controls">
        <Keys
          items={[
            ['Bounds', 'Exact start & end seconds'],
            ['Fades', 'Linear fade-in / fade-out'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Audio Cutter"
      icon="meeting"
      hue="blue"
      category="Productivity"
      meta="Waveform trimmer"
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

        {error ? <ErrorState title="Trim error" detail={error} /> : null}

        <Card mono="Waveform" title={fileName || 'Load audio'}>
          <Actions>
            <Button kind="secondary" onClick={() => fileRef.current?.click()}>
              Open audio file
            </Button>
            <Button kind="secondary" onClick={onSample}>
              Load sample melody
            </Button>
          </Actions>

          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            {!buffer ? (
              <EmptyState
                mono="Empty"
                title="No waveform loaded"
                detail="Open an audio file or load the sample melody to inspect and trim."
                actionLabel="Load sample melody"
                onAction={onSample}
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={140}
                aria-label="Audio waveform preview"
                style={{
                  width: '100%',
                  height: 'calc(140px * var(--sf))',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  borderRadius: 'calc(2px * var(--sf))',
                  display: 'block',
                }}
              />
            )}
          </div>
        </Card>

        <Card mono="Cut" title="Trim & export">
          <FormGrid>
            <TextInput
              label="Start (seconds)"
              value={startSec}
              onChange={setStartSec}
              inputMode="decimal"
            />
            <TextInput
              label="End (seconds)"
              value={endSec}
              onChange={setEndSec}
              inputMode="decimal"
            />
            <Select
              label="Fade in"
              value={prefs.fadeInMs}
              onChange={(v) => setPrefs((p) => ({ ...p, fadeInMs: v }))}
              options={[
                { value: '0', label: 'None' },
                { value: '100', label: '100 ms' },
                { value: '250', label: '250 ms' },
                { value: '500', label: '500 ms' },
              ]}
            />
            <Select
              label="Fade out"
              value={prefs.fadeOutMs}
              onChange={(v) => setPrefs((p) => ({ ...p, fadeOutMs: v }))}
              options={[
                { value: '0', label: 'None' },
                { value: '150', label: '150 ms' },
                { value: '300', label: '300 ms' },
                { value: '600', label: '600 ms' },
              ]}
            />
            <Select
              label="Playback speed"
              value={prefs.speed}
              onChange={(v) => setPrefs((p) => ({ ...p, speed: v }))}
              options={[
                { value: '0.5', label: '0.5x (Half)' },
                { value: '0.75', label: '0.75x' },
                { value: '1', label: '1.0x (Normal)' },
                { value: '1.25', label: '1.25x' },
                { value: '1.5', label: '1.5x' },
                { value: '2', label: '2.0x (Double)' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Reverse clip"
              checked={prefs.reverse}
              onChange={(c) => setPrefs((p) => ({ ...p, reverse: c }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={applyTrim} disabled={!buffer}>
              Render cut
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={!trimmedBlob}
              onClick={() => {
                if (trimmedBlob) saveBlob(trimmedBlob, { filename: outName, mimeType: 'audio/wav' })
              }}
            >
              Download {outName}
            </Button>
          </Actions>
          {trimmedUrl ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <audio controls src={trimmedUrl} style={{ width: '100%' }} />
            </div>
          ) : null}
        </Card>
      </Stack>
    </AppShell>
  )
}
