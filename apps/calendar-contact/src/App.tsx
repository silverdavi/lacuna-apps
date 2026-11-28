// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
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
  convertInterchange,
  SAMPLES,
  type DomainMode,
  type TargetKind,
} from './engine/interchange'

interface State {
  mode: DomainMode
  target: TargetKind
  input: string
}

const DEFAULT_STATE: State = {
  mode: 'vcard',
  target: 'csv',
  input: SAMPLES.vcard,
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<State>({
    key: 'calendar-contact.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const computed = useMemo(() => {
    try {
      return { ...convertInterchange(state.input, state.mode, state.target), error: null as string | null }
    } catch (e) {
      return { count: 0, output: '', ext: 'txt', mime: 'text/plain', error: e instanceof Error ? e.message : 'Parse error' }
    }
  }, [state])

  function switchMode(mode: DomainMode) {
    const defaultTarget: TargetKind = mode === 'geo' ? 'gpx' : 'csv'
    setState({ mode, target: defaultTarget, input: SAMPLES[mode] })
  }

  const side = (
    <Stack>
      <Rail title="Parsed" note={`Mode: ${state.mode.toUpperCase()}`}>
        <KpiRow>
          <Kpi value={String(computed.count)} label="Records" accent />
          <Kpi value={`.${computed.ext}`} label="Format" />
        </KpiRow>
      </Rail>
      <Rail title="Interchange">
        <Keys
          items={[
            ['Contacts', 'vCard (.vcf) ↔ CSV / JSON'],
            ['Calendar', 'iCalendar (.ics) ↔ Agenda'],
            ['Geo', 'GeoJSON ↔ GPX / CSV'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="vCard & ICS Converter"
      icon="calendar"
      hue="blue"
      category="Productivity"
      meta="VCF · ICS · GPX · GeoJSON"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".vcf,.ics,.gpx,.geojson,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void f.text().then((t) => setState((p) => ({ ...p, input: t })))
            e.target.value = ''
          }}
        />

        {computed.error ? <ErrorState title="Conversion error" detail={computed.error} /> : null}

        <Card mono="Settings" title="Source & target">
          <FormGrid>
            <Select
              label="Source type"
              value={state.mode}
              onChange={(v) => switchMode(v as DomainMode)}
              options={[
                { value: 'vcard', label: 'vCard Contacts (.vcf)' },
                { value: 'ics', label: 'iCalendar Events (.ics)' },
                { value: 'geo', label: 'GeoJSON / GPX Waypoints' },
              ]}
            />
            <Select
              label="Target format"
              value={state.target}
              onChange={(v) => setState((p) => ({ ...p, target: v as TargetKind }))}
              options={[
                { value: 'csv', label: 'CSV (.csv)' },
                { value: 'json', label: 'JSON (.json)' },
                { value: 'markdown', label: 'Markdown Summary (.md)' },
                { value: 'gpx', label: 'GPX Waypoints (.gpx)' },
                { value: 'vcard', label: 'vCard (.vcf)' },
                { value: 'ics', label: 'iCalendar (.ics)' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton
              disabled={!computed.output}
              onClick={() =>
                saveBlob(new Blob([computed.output], { type: computed.mime }), {
                  filename: `converted.${computed.ext}`,
                  mimeType: computed.mime,
                })
              }
            >
              Download .{computed.ext}
            </PrimaryButton>
            <Button kind="secondary" disabled={!computed.output} onClick={() => void copy(computed.output)}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open file
            </Button>
          </Actions>
        </Card>

        <Cols kind="2">
          <Card mono="Source" title="Input">
            <TextInput
              label="Source interchange"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              rows={13}
            />
          </Card>

          <Card mono="Output" title={`Converted (.${computed.ext})`}>
            <TextInput
              label="Converted interchange"
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
