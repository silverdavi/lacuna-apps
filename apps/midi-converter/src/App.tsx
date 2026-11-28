// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
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
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  buildStandardMidi,
  notesToAbc,
  parseMelody,
  SAMPLE_MELODY,
  synthNotesToWav,
} from './engine/midi'

interface MidiState {
  melody: string
  bpm: string
  view: 'abc' | 'json'
}

const DEFAULT_STATE: MidiState = {
  melody: SAMPLE_MELODY,
  bpm: '120',
  view: 'abc',
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<MidiState>({
    key: 'midi-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [wavUrl, setWavUrl] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const notes = useMemo(() => parseMelody(state.melody), [state.melody])
  const bpmNum = Math.max(40, Math.min(240, Number(state.bpm) || 120))
  const totalBeats = notes.reduce((s, n) => s + n.beats, 0)
  const durationSec = (totalBeats * 60) / bpmNum

  const textOutput = useMemo(() => {
    if (state.view === 'json') return JSON.stringify({ bpm: bpmNum, notes }, null, 2)
    return notesToAbc(notes, bpmNum)
  }, [notes, bpmNum, state.view])

  function downloadMidi() {
    if (notes.length === 0) return
    const bytes = buildStandardMidi(notes, bpmNum)
    saveBlob(new Blob([bytes as BlobPart], { type: 'audio/midi' }), {
      filename: 'melody.mid',
      mimeType: 'audio/midi',
    })
  }

  function renderWav() {
    if (notes.length === 0) return
    const blob = synthNotesToWav(notes, bpmNum)
    if (wavUrl) URL.revokeObjectURL(wavUrl)
    setWavUrl(URL.createObjectURL(blob))
    saveBlob(blob, { filename: 'melody.wav', mimeType: 'audio/wav' })
  }

  const side = (
    <Stack>
      <Rail title="Sequence" note={`${bpmNum} BPM · SMF Format 0`}>
        <KpiRow>
          <Kpi value={String(notes.length)} label="Notes" accent />
          <Kpi value={`${durationSec.toFixed(1)}s`} label="Length" />
        </KpiRow>
      </Rail>
      <Rail title="Notation">
        <Keys
          items={[
            ['Syntax', 'NoteOctave:Beats (C4:1)'],
            ['Export', '.mid, .wav, ABC, JSON'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="MIDI Converter"
      icon="meeting"
      hue="blue"
      category="Productivity"
      meta="MIDI · ABC · JSON · WAV"
      side={side}
    >
      <Stack lg>
        <Card mono="Compose" title="Note sequence">
          <FormGrid>
            <TextInput
              label="Tempo (BPM)"
              value={state.bpm}
              onChange={(v) => setState((p) => ({ ...p, bpm: v }))}
              inputMode="numeric"
            />
            <Select
              label="Text representation"
              value={state.view}
              onChange={(v) => setState((p) => ({ ...p, view: v as 'abc' | 'json' }))}
              options={[
                { value: 'abc', label: 'ABC Music Notation (.abc)' },
                { value: 'json', label: 'JSON Note Events (.json)' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <TextInput
              label="Melody notes (e.g. C4:1 E4:1 G4:2)"
              value={state.melody}
              onChange={(v) => setState((p) => ({ ...p, melody: v }))}
              rows={4}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={downloadMidi} disabled={notes.length === 0}>
              Download melody.mid
            </PrimaryButton>
            <Button kind="secondary" onClick={renderWav} disabled={notes.length === 0}>
              Synthesize WAV
            </Button>
            <Button kind="secondary" onClick={() => void copy(textOutput)} disabled={!textOutput}>
              {copied ? 'Copied' : `Copy ${state.view.toUpperCase()}`}
            </Button>
          </Actions>
          {wavUrl ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <audio controls src={wavUrl} style={{ width: '100%' }} />
            </div>
          ) : null}
        </Card>

        <Card mono="Output" title={`Converted (${state.view.toUpperCase()})`}>
          <TextInput label="Converted notation" value={textOutput} onChange={() => {}} rows={10} />
        </Card>
      </Stack>
    </AppShell>
  )
}
