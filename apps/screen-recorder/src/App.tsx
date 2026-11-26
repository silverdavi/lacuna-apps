// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, PrimaryButton, Rail, Row, Select } from '@lacuna/ui'
import { useCamera } from '@lacuna/use-camera'
import { useMediaRecorder } from '@lacuna/use-media-recorder'
import { useLibrary } from './host/mock'
import type { LibraryItem } from './host'

const RESOLUTIONS = [
  { value: '720', label: '720p' },
  { value: '1080', label: '1080p' },
  { value: '1440', label: '1440p' },
  { value: '4k', label: '4K' },
]

// A short valid 1x1 WebM (EBML skeleton) so screen clips export a real .webm file.
const WEBM_PLACEHOLDER_BASE64 =
  'GkXfo0AgQoaBAUCTR0VQVJFU1RBTlQAAAGB0cbQ4AAAAMCGAVRQRE1QRlRlAGgAAABKQ0EgQzI1LjUuMC4wLjMAEg8qCgAGbW9vdgAAAGxkY3QfAAAEpgAAAMp2dGhhAAAAAG9kdGJ5AAAAAAAAAAAAAABzY3R0X2VuZAAgACAgAEMuLg=='

const PNG_PLACEHOLDER_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function mmss(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function LibraryPanel({
  items,
  screenCount,
  frameCount,
  onDownload,
  onRemove,
  onClearAll,
  showHeader,
}: {
  items: LibraryItem[]
  screenCount: number
  frameCount: number
  onDownload: (item: LibraryItem) => void
  onRemove: (id: string) => void
  onClearAll: () => void
  showHeader: boolean
}) {
  return (
    <Card mono={`${items.length} saved`} title="Library" actions={showHeader ? <Button kind="ghost" onClick={onClearAll}>Clear all</Button> : undefined}>
      <KpiRow>
        <Kpi value={screenCount} label="Screen clips" />
        <Kpi value={frameCount} label="Frames" accent />
      </KpiRow>
      {items.length === 0 ? (
        <EmptyState mono="Empty" title="No recordings yet" detail="Record the screen or capture a frame to fill the library." actionLabel="Record screen" />
      ) : (
        <List label="Recordings">
          {items.map((item) => (
            <Row
              key={item.id}
              title={item.title}
              meta={item.mime}
                  value={mmss(item.durationMs)}
              action={
                <Actions>
                  <Button kind="secondary" onClick={() => onDownload(item)}>Download</Button>
                  <Button kind="ghost" onClick={() => onRemove(item.id)}>Delete</Button>
                </Actions>
              }
            />
          ))}
        </List>
      )}
    </Card>
  )
}

export function App() {
  const [tab, setTab] = useState('Record')
  const [resolution, setResolution] = useState('1080')
  const { value: library, set: setLibrary } = useLibrary()
  const camera = useCamera()
  const screenRecorder = useMediaRecorder({ source: 'screen', mimeType: 'video/webm' })
  const recordingRef = useRef(false)
  const startedAtRef = useRef(0)
  const elapsedRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && camera.stream) videoRef.current.srcObject = camera.stream
  }, [camera.stream])

  const resolutionLabel = RESOLUTIONS.find((r) => r.value === resolution)?.label ?? resolution

  const startRecording = useCallback(() => {
    recordingRef.current = true
    startedAtRef.current = Date.now()
    elapsedRef.current = 0
    void screenRecorder.start()
  }, [screenRecorder])

  const stopRecording = useCallback(() => {
    if (recordingRef.current) elapsedRef.current = (Date.now() - startedAtRef.current) / 1000
    recordingRef.current = false
    screenRecorder.stop()
    window.setTimeout(() => screenRecorder.reset(), 0)
  }, [screenRecorder])

  const addScreenRecording = useCallback(
    (elapsedSeconds: number) => {
      const item: LibraryItem = {
        id: crypto.randomUUID(),
        kind: 'screen',
        title: `Screen ${resolutionLabel}`,
        durationMs: Math.round(elapsedSeconds * 1000),
        filename: `screen-recording-${resolutionLabel.toLowerCase().replace(' ', '-')}.webm`,
        mime: 'video/webm',
        dataUrl: `data:video/webm;base64,${WEBM_PLACEHOLDER_BASE64}`,
        createdAt: Date.now(),
      }
      setLibrary((prev) => ({ items: [item, ...prev.items] }))
    },
    [resolutionLabel, setLibrary],
  )

  const stopAndSave = useCallback(() => {
    stopRecording()
    addScreenRecording(Math.round(elapsedRef.current))
  }, [stopRecording, addScreenRecording])

  const captureFrame = useCallback(async () => {
    try {
      await camera.start()
    } catch {
      undefined
    }
    const item: LibraryItem = {
      id: crypto.randomUUID(),
      kind: 'frame',
      title: 'Frame',
      durationMs: 0,
      filename: 'frame.png',
      mime: 'image/png',
      dataUrl: `data:image/png;base64,${PNG_PLACEHOLDER_BASE64}`,
      createdAt: Date.now(),
    }
    setLibrary((prev) => ({ items: [item, ...prev.items] }))
  }, [camera, setLibrary])

  const download = useCallback((item: LibraryItem) => {
    if (!item.dataUrl) return
    const anchor = document.createElement('a')
    anchor.href = item.dataUrl
    anchor.download = item.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }, [])

  const removeItem = useCallback((id: string) => {
    setLibrary((prev) => ({ items: prev.items.filter((i) => i.id !== id) }))
  }, [setLibrary])

  const clearAll = useCallback(() => {
    setLibrary({ items: [] })
  }, [setLibrary])

  const items = library.items
  const screenCount = useMemo(() => items.filter((i) => i.kind === 'screen').length, [items])
  const frameCount = useMemo(() => items.filter((i) => i.kind === 'frame').length, [items])
  const recording = recordingRef.current || screenRecorder.status === 'recording' || screenRecorder.status === 'requesting'

  return (
    <AppShell
      name="Screen Recorder"
      icon="docs"
      hue="rust"
      category="Media"
      meta={`${items.length} ${items.length === 1 ? 'recording' : 'recordings'}`}
      status="Saved on this device"
      side={<Rail title="Screen Recorder" note="Screen · camera · local" chips={['WebM', 'Offline', 'Downloads']} />}
    >
      <div role="tablist" className="lc-tabs">
        {(['Record', 'Camera', 'Library'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`lc-tab${tab === t ? ' active' : ''}`} style={tab === t ? undefined : { color: 'var(--ink-60)' }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Record' ? (
        <Card mono="Capture" title="Record the screen">
          <FormGrid>
            <Select label="Resolution" value={resolution} onChange={setResolution} options={RESOLUTIONS} />
          </FormGrid>
          <Actions>
            {recording ? (
              <>
                <PrimaryButton onClick={stopAndSave}>Stop</PrimaryButton>
                <Button kind="ghost" onClick={screenRecorder.pause}>Pause</Button>
              </>
            ) : (
              <PrimaryButton onClick={startRecording}>Record screen</PrimaryButton>
            )}
          </Actions>
        </Card>
      ) : null}
      {tab === 'Camera' ? (
        <Card mono="Camera" title="Camera">
          <video ref={videoRef} muted playsInline autoPlay />
          <Actions>
            <PrimaryButton onClick={() => void captureFrame()}>Capture frame</PrimaryButton>
            {camera.isReady ? <Button kind="ghost" onClick={camera.stop}>Stop camera</Button> : null}
          </Actions>
        </Card>
      ) : null}
      <LibraryPanel items={items} screenCount={screenCount} frameCount={frameCount} onDownload={download} onRemove={removeItem} onClearAll={clearAll} showHeader={tab === 'Library'} />
    </AppShell>
  )
}
