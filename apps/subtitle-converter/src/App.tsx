// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  Cols,
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
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  parseSubtitles,
  SAMPLE_SRT,
  serializeSubtitles,
  transformCues,
  type SubtitleFormat,
} from './engine/subtitles'

interface SubState {
  input: string
  target: SubtitleFormat
  offsetMs: string
  rate: string
  stripTags: boolean
}

const DEFAULT_STATE: SubState = {
  input: SAMPLE_SRT,
  target: 'vtt',
  offsetMs: '0',
  rate: '1',
  stripTags: true,
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<SubState>({
    key: 'subtitle-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const computed = useMemo(() => {
    try {
      const cues = parseSubtitles(state.input)
      const shifted = transformCues(cues, {
        offsetMs: Number(state.offsetMs) || 0,
        rateMultiplier: Number(state.rate) || 1,
        stripTags: state.stripTags,
      })
      const output = serializeSubtitles(shifted, state.target)
      const totalSec = shifted.length > 0 ? (shifted[shifted.length - 1]!.endMs / 1000).toFixed(1) : '0.0'
      return { cueCount: shifted.length, totalSec, output, error: null as string | null }
    } catch (e) {
      return { cueCount: 0, totalSec: '0.0', output: '', error: e instanceof Error ? e.message : 'Parse error' }
    }
  }, [state])

  function download() {
    if (!computed.output) return
    const mime = state.target === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8'
    saveBlob(new Blob([computed.output], { type: mime }), {
      filename: `subtitles.${state.target}`,
      mimeType: mime,
    })
  }

  const side = (
    <Stack>
      <Rail title="Track" note={`Shift: ${Number(state.offsetMs) || 0} ms`}>
        <KpiRow>
          <Kpi value={String(computed.cueCount)} label="Cues" accent />
          <Kpi value={`${computed.totalSec}s`} label="Length" />
        </KpiRow>
      </Rail>
      <Rail title="Supported">
        <Keys
          items={[
            ['Timed', 'SRT, WebVTT, ASS, SBV'],
            ['Export', 'Plain Transcript, JSON'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Subtitle Converter"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta="SRT · VTT · ASS · SBV"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".srt,.vtt,.ass,.ssa,.sbv,.json,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void f.text().then((t) => setState((p) => ({ ...p, input: t })))
            e.target.value = ''
          }}
        />

        {computed.error ? <ErrorState title="Subtitle error" detail={computed.error} /> : null}

        <Card mono="Settings" title="Convert & sync">
          <FormGrid>
            <Select
              label="Target format"
              value={state.target}
              onChange={(v) => setState((p) => ({ ...p, target: v as SubtitleFormat }))}
              options={[
                { value: 'vtt', label: 'WebVTT (.vtt)' },
                { value: 'srt', label: 'SubRip (.srt)' },
                { value: 'ass', label: 'Advanced SubStation (.ass)' },
                { value: 'sbv', label: 'YouTube (.sbv)' },
                { value: 'txt', label: 'Plain Transcript (.txt)' },
                { value: 'json', label: 'JSON Cues (.json)' },
              ]}
            />
            <TextInput
              label="Time shift (ms)"
              value={state.offsetMs}
              onChange={(v) => setState((p) => ({ ...p, offsetMs: v }))}
              inputMode="numeric"
              placeholder="0 (e.g. 1500 or -500)"
            />
            <Select
              label="Frame-rate stretch"
              value={state.rate}
              onChange={(v) => setState((p) => ({ ...p, rate: v }))}
              options={[
                { value: '1', label: '1.0x (Unchanged)' },
                { value: '0.95904', label: '23.976 → 25 fps (PAL)' },
                { value: '1.04271', label: '25 → 23.976 fps (NTSC)' },
                { value: '0.96', label: '24 → 25 fps' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Strip HTML and styling tags"
              checked={state.stripTags}
              onChange={(c) => setState((p) => ({ ...p, stripTags: c }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={download} disabled={!computed.output}>
              Download .{state.target}
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void copy(computed.output)} disabled={!computed.output}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open subtitle file
            </Button>
          </Actions>
        </Card>

        <Cols kind="2">
          <Card mono="Source" title="Input subtitles">
            <TextInput
              label="Source subtitles"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              rows={13}
            />
          </Card>

          <Card mono="Output" title={`Converted (${state.target.toUpperCase()})`}>
            <TextInput
              label="Converted subtitles"
              value={computed.output}
              onChange={() => {}}
              rows={13}
            />
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
