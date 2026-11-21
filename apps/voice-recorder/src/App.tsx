import { useCallback, useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, List, Rail, Select } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { humanizeDuration } from '@lacuna/format-duration'
import { clips, settings } from './host'
import type { Clip } from './host'

// Local recorder: identical in shape to @lacuna/use-media-recorder but with a
// timeslice so data accumulates during recording (not only at stop).
type RecStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error'
interface LocalRecorder {
  status: RecStatus
  elapsed: number
  blob: Blob | null
  error: string | null
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
}
function useLocalRecorder(tickMs = 100): LocalRecorder {
  const [status, setStatus] = useState<RecStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const statusRef = useRef<RecStatus>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)
  const setStatusAndRef = useCallback((next: RecStatus) => { statusRef.current = next; setStatus(next) }, [])
  const clearTick = useCallback(() => { if (tickRef.current !== null) { window.clearInterval(tickRef.current); tickRef.current = null } }, [])
  const start = useCallback(async () => {
    const current = statusRef.current
    if (current === 'recording' || current === 'requesting') return
    if (current === 'paused') { recorderRef.current?.resume(); setStatusAndRef('recording'); return }
    if (current !== 'idle' && current !== 'error' && current !== 'stopped') return
    chunksRef.current = []
    setBlob(null); setError(null); setElapsed(0)
    setStatusAndRef('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setStatusAndRef('error'); setError(err instanceof Error ? err.message : String(err)); return
    }
    if (statusRef.current === 'idle') { stream.getTracks().forEach((t) => t.stop()); return }
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop())
      setStatusAndRef('error'); setError(err instanceof Error ? err.message : String(err)); return
    }
    rec.ondataavailable = (e: BlobEvent) => { if (e.data) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      if (chunksRef.current.length > 0) setBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
    }
    recorderRef.current = rec
    rec.start(250)
    setStatusAndRef('recording')
    tickRef.current = window.setInterval(() => { if (statusRef.current === 'recording') setElapsed((e) => e + tickMs / 1000) }, tickMs)
  }, [setStatusAndRef, tickMs])
  const stop = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') {
      if (statusRef.current === 'requesting' || statusRef.current === 'recording' || statusRef.current === 'paused') setStatusAndRef('stopped')
      return
    }
    rec.stop()
    recorderRef.current = null
    setStatusAndRef('stopped')
  }, [setStatusAndRef])
  const pause = useCallback(() => { if (statusRef.current !== 'recording') return; recorderRef.current?.pause(); setStatusAndRef('paused') }, [setStatusAndRef])
  const resume = useCallback(() => { if (statusRef.current !== 'paused') return; recorderRef.current?.resume(); setStatusAndRef('recording') }, [setStatusAndRef])
  const reset = useCallback(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop() }
    recorderRef.current = null
    chunksRef.current = []
    clearTick()
    setStatusAndRef('idle')
    setBlob(null); setElapsed(0); setError(null)
  }, [clearTick, setStatusAndRef])
  useEffect(() => () => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop() }
    recorderRef.current = null
    clearTick()
  }, [clearTick])
  return { status, elapsed, blob, error, start, pause, resume, stop, reset }
}

type Format = 'WAV' | 'MP3'

const MIME_BY_FORMAT: Record<Format, string> = {
  WAV: 'audio/wav',
  MP3: 'audio/mpeg',
}

const pad2 = (value: number) => String(value).padStart(2, '0')

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the clip'))
    reader.readAsDataURL(blob)
  })
}

function decodeDataUrl(data: string): Uint8Array<ArrayBuffer> {
  const base64 = data.split(',')[1] ?? ''
  const bytes = atob(base64)
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i)
  return out
}

export function App() {
  const [tab, setTab] = useState('Recorder')
  const [notice, setNotice] = useState('')
  const [savedClips, setSavedClips] = useState<Clip[]>([])
  const [format, setFormat] = useState<Format>(() => (settings.load().format === 'MP3' ? 'MP3' : 'WAV'))

  const counterRef = useRef(1)
  const recorder = useLocalRecorder(100)

  function refresh() {
    setSavedClips(clips.list())
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveClip(blob: Blob, durationMs: number) {
    try {
      const data = await blobToDataUrl(blob)
      clips.add({
        name: `Clip ${counterRef.current}`,
        data,
        mime: blob.type || 'audio/webm',
        size: blob.size,
        durationMs,
        format,
        createdAt: Date.now(),
      })
      counterRef.current += 1
      refresh()
    } catch {
      setNotice('The clip could not be saved')
    }
  }

  async function record() {
    setNotice('')
    await recorder.start()
  }

  function stop() {
    recorder.stop()
  }

  function discard() {
    recorder.reset()
    setNotice('')
  }

  const savingRef = useRef(false)
  useEffect(() => {
    if (recorder.status !== 'stopped' || !recorder.blob || savingRef.current) return
    savingRef.current = true
    void (async () => {
      if (recorder.error) setNotice('The clip could not be saved')
      await saveClip(recorder.blob as Blob, Math.max(1000, Math.ceil(recorder.elapsed * 1000)))
      recorder.reset()
      savingRef.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status, recorder.blob, recorder.elapsed, recorder.error])

  function removeClip(id: string) {
    clips.remove(id)
    refresh()
  }

  function downloadClip(clip: Clip) {
    const bytes = decodeDataUrl(clip.data)
    const mime = clip.format === 'MP3' ? 'audio/mpeg' : clip.mime
    saveBlob(new Blob([bytes], { type: mime }), {
      filename: `${clip.name}.${clip.format.toLowerCase()}`,
      mimeType: mime,
    })
  }

  function chooseFormat(next: string) {
    const value: Format = next === 'MP3' ? 'MP3' : 'WAV'
    setFormat(value)
    settings.save({ ...settings.load(), format: value, trimStart: 0, trimEnd: 0 })
  }

  const busy = recorder.status === 'recording'
  const totalMs = savedClips.reduce((sum, clip) => sum + clip.durationMs, 0)

  return (
    <AppShell
      name="Voice Recorder"
      icon="notes"
      hue="rust"
      category="Apps"
      meta={`${savedClips.length} ${savedClips.length === 1 ? 'clip' : 'clips'}`}
      status="Local · no network"
      side={
          <Rail title="Voice Recorder" note={`${savedClips.length} ${savedClips.length === 1 ? 'clip' : 'clips'} · local`} chips={['WAV', 'MP3', 'Local']}>
          <p className="lc-body-sm">
            Clips are written to this device only. {format === 'MP3' ? 'New clips are saved as MP3.' : 'New clips are saved as WAV.'}
          </p>
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist" aria-label="Sections">
        {(['Recorder', 'Settings'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? 'lc-tab active vr-tab' : 'lc-tab vr-tab'}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <Card mono={busy ? 'Recording' : 'Idle'} title="Record a clip">
        <div className="lk-recorder">
          <span className="lk-clock lc-mono" role="timer">{clock(busy ? recorder.elapsed * 1000 : 0)}</span>
          <p className="lc-body-sm">{busy ? 'Recording. Press Stop when done.' : 'Press Record to start a clip.'}</p>
          <Actions>
            {busy ? (
              <Button kind="primary" onClick={stop}>Stop</Button>
            ) : (
              <Button kind="primary" onClick={() => void record()}>Record</Button>
            )}
            <Button kind="secondary" onClick={discard} disabled={!busy}>
              Discard
            </Button>
          </Actions>
          {recorder.error ? <p className="lc-accent" role="alert">{recorder.error}</p> : null}
          {notice ? <p className="lc-accent" role="alert">{notice}</p> : null}
        </div>
      </Card>
      <Card mono={`${savedClips.length} saved`} title="Clips">
        {savedClips.length === 0 ? (
          <EmptyState mono="Empty" title="No clips yet" detail="Record the first one above." />
        ) : (
          <List label="Clips">
            {savedClips.map((clip) => (
              <li key={clip.id} className="lk-row" aria-label={clip.name}>
                <span className="lk-row-text">
                  <span className="lk-row-title">{clip.name}</span>
                  <span className="lk-row-meta">{humanizeDuration(clip.durationMs)} · {clip.format}</span>
                </span>
                <span className="lk-row-value">{clock(clip.durationMs)}</span>
                <div className="lk-actions">
                  <Button kind="ghost" ariaLabel={`Download ${clip.name}`} onClick={() => downloadClip(clip)}>
                    Download
                  </Button>
                  <Button kind="ghost" ariaLabel={`Delete ${clip.name}`} onClick={() => removeClip(clip.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </List>
        )}
      </Card>
      {tab === 'Settings' && (
        <Card mono="Settings" title="Recording settings">
          <p className="lc-body-sm">How the next clip is stored. Changing these does not touch the clips you already have.</p>
          <Select
            label="Format"
            value={format}
            onChange={chooseFormat}
            options={[
              { value: 'WAV', label: 'WAV' },
              { value: 'MP3', label: 'MP3' },
            ]}
          />
          <p className="lc-body-sm lc-field-hint">Clips are numbered in order: Clip 1, Clip 2, …</p>
        </Card>
      )}
    </AppShell>
  )
}
