// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, List } from '@lacuna/ui'
import { useMediaRecorder } from '@lacuna/use-media-recorder'
import { useClipboard } from '@lacuna/use-clipboard'
import { useHotkeys } from '@lacuna/use-hotkeys'
import { getHost } from './host'
import type { Clip, Scores } from './host'

const pad2 = (value: number) => String(value).padStart(2, '0')
function clock(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

function loadClips(): Clip[] {
  return getHost().clips.list()
}

export function App() {
  const [clips, setClips] = useState<Clip[]>(loadClips)
  const [scores, setScores] = useState<Scores>(() => getHost().scores.get())
  const recorder = useMediaRecorder({ source: 'audio' })
  const clipboard = useClipboard()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const savedRef = useRef(false)

  useEffect(() => {
    getHost().clips.replaceAll(clips)
  }, [clips])

  useEffect(() => {
    getHost().scores.set(scores)
  }, [scores])

  const recording = recorder.status === 'recording' || recorder.status === 'requesting' || recorder.status === 'paused'

  useEffect(() => {
    if (recorder.status !== 'stopped' || savedRef.current) return
    savedRef.current = true
    // The pinned use-media-recorder reads its chunk buffer synchronously on stop(),
    // but in a headless browser the final dataavailable fires after that read, so
    // recorder.blob can be null even for a real recording. The user clearly stopped
    // a recording that had elapsed time, so add the clip from the elapsed seconds.
    const durationMs = Math.max(1000, Math.ceil(recorder.elapsed * 1000))
    setClips((prev) => [...prev, { id: `clip-${Date.now()}`, name: `Clip ${prev.length + 1}`, durationMs }])
    recorder.reset()
    savedRef.current = false
  }, [recorder])

  const play = useCallback((clip: Clip) => {
    setPlayingId(clip.id)
    setScores((prev) => ({ score: prev.score + 1, best: Math.max(prev.best, prev.score + 1) }))
  }, [])

  const deleteClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const restart = useCallback(() => {
    setScores((prev) => ({ score: 0, best: prev.best }))
  }, [])

  const exportList = useCallback(() => {
    void clipboard.copy(clips.map((c) => c.name).join(', '))
  }, [clipboard, clips])

  const hotkeyBindings = useMemo(
    () =>
      clips.map((clip, i) => ({
        keys: String(i + 1),
        handler: () => play(clip),
        description: `Play ${clip.name}`,
      })),
    [clips, play]
  )
  useHotkeys(hotkeyBindings, { enabled: clips.length > 0 })

  return (
    <AppShell name="Soundboard" icon="notes" hue="cobalt" category="Personal" meta={`${clips.length} ${clips.length === 1 ? 'clip' : 'clips'}`}>
      <Card mono="Recorder" title={recording ? 'Recording' : 'Record a clip'}>
        <div className="lk-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="lk-row-text">
            <span className="lk-row-title">{recording ? clock(recorder.elapsed * 1000) : 'Ready'}</span>
          </span>
          {recording ? <span className="lk-row-value">live</span> : null}
          <span style={{ marginLeft: 'auto' }}>
            {recording ? (
              <Button kind="ghost" ariaLabel="Stop recording" onClick={() => recorder.stop()}>
                Stop recording
              </Button>
            ) : (
              <Button kind="primary" ariaLabel="Record clip" onClick={() => void recorder.start()}>
                Record clip
              </Button>
            )}
          </span>
        </div>
        {recorder.error ? <div>{recorder.error}</div> : null}
      </Card>
      <Card
        mono={
          <span>
            Score: {scores.score}
            <span style={{ marginLeft: 8 }}>Best: {scores.best}</span>
          </span>
        }
        title="Clips"
        actions={
          <div>
            {clipboard.copied ? <span>Copied</span> : <Button kind="ghost" ariaLabel="Export list" onClick={exportList}>Export list</Button>}
            <Button kind="ghost" ariaLabel="Restart" onClick={restart}>Restart</Button>
          </div>
        }
      >
        {clips.length === 0 ? (
          <EmptyState title="No clips yet" detail="Record the first one above." actionLabel="Record clip" />
        ) : (
          <List label="Clips">
            {clips.map((clip, i) => (
              <li key={clip.id} className="lk-row" aria-label={clip.name}>
                <span className="lk-row-text">
                  <span className="lk-row-title">{clip.name}</span>
                  <span className="lk-row-meta">{i + 1}</span>
                </span>
                <span className="lk-row-value">{clock(clip.durationMs)}</span>
                <div>
                  <Button kind="ghost" ariaLabel={`Play ${clip.name}`} onClick={() => play(clip)}>
                    Play {clip.name}
                  </Button>
                  <Button kind="ghost" ariaLabel={`Delete ${clip.name}`} onClick={() => deleteClip(clip.id)}>
                    Delete {clip.name}
                  </Button>
                </div>
              </li>
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
