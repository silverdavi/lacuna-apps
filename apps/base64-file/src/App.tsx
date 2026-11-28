// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
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
  base64ToBytes,
  extForMime,
  formatEncoded,
  SAMPLE_DATA_URI,
  type EncodeView,
} from './engine/codec'

interface Base64State {
  dataUri: string
  filename: string
  view: EncodeView
}

const DEFAULT_STATE: Base64State = {
  dataUri: SAMPLE_DATA_URI,
  filename: 'hello.txt',
  view: 'datauri',
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<Base64State>({
    key: 'base64-file.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const decoded = useMemo(() => {
    try {
      const { bytes, mime } = base64ToBytes(state.dataUri)
      const rendered = formatEncoded(bytes, mime, state.view)
      return { bytes, mime, rendered, parseError: null as string | null }
    } catch (e) {
      return {
        bytes: new Uint8Array(0),
        mime: 'application/octet-stream',
        rendered: '',
        parseError: e instanceof Error ? e.message : 'Invalid Base64 or Data URI',
      }
    }
  }, [state.dataUri, state.view])

  async function onUpload(file: File) {
    setError(null)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const mime = file.type || 'application/octet-stream'
    const uri = formatEncoded(bytes, mime, 'datauri')
    setState((p) => ({ ...p, dataUri: uri, filename: file.name }))
  }

  function downloadDecoded() {
    if (decoded.parseError) return
    const ext = extForMime(decoded.mime)
    const name = state.filename.trim() || `decoded.${ext}`
    saveBlob(new Blob([decoded.bytes as BlobPart], { type: decoded.mime }), {
      filename: name,
      mimeType: decoded.mime,
    })
  }

  const overheadPct =
    decoded.bytes.length > 0
      ? `+${Math.round(((decoded.rendered.length - decoded.bytes.length) / decoded.bytes.length) * 100)}%`
      : '—'

  const side = (
    <Stack>
      <Rail title="Payload" note={decoded.mime}>
        <KpiRow>
          <Kpi value={`${decoded.bytes.length} B`} label="Raw bytes" accent />
          <Kpi value={`${decoded.rendered.length}`} label="Out chars" />
          <Kpi value={overheadPct} label="Overhead" />
        </KpiRow>
      </Rail>
      <Rail title="Formats">
        <Keys
          items={[
            ['Encode', 'Data URI, Base64, CSS, Hex'],
            ['Decode', 'Data URI / Base64 → File'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Data URI Converter"
      icon="files"
      hue="blue"
      category="Productivity"
      meta="File ↔ Base64 / Hex"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onUpload(f)
            e.target.value = ''
          }}
        />

        {error || decoded.parseError ? (
          <ErrorState title="Decode error" detail={error ?? decoded.parseError ?? ''} />
        ) : null}

        <Card mono="Input" title="File or Data URI">
          <FormGrid>
            <TextInput
              label="Output filename"
              value={state.filename}
              onChange={(v) => setState((p) => ({ ...p, filename: v }))}
            />
            <Select
              label="Output representation"
              value={state.view}
              onChange={(v) => setState((p) => ({ ...p, view: v as EncodeView }))}
              options={[
                { value: 'datauri', label: 'Data URI (RFC 2397)' },
                { value: 'base64', label: 'Raw Base64' },
                { value: 'css', label: 'CSS background-image' },
                { value: 'hex', label: 'Hex Bytes' },
                { value: 'uint8', label: 'TypeScript Uint8Array' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <TextInput
              label="Data URI or Base64 input"
              value={state.dataUri}
              onChange={(v) => setState((p) => ({ ...p, dataUri: v }))}
              rows={5}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={() => fileRef.current?.click()}>
              Encode local file
            </PrimaryButton>
            <Button kind="secondary" onClick={downloadDecoded} disabled={Boolean(decoded.parseError)}>
              Decode & download file
            </Button>
            <Button kind="secondary" onClick={() => void copy(decoded.rendered)} disabled={!decoded.rendered}>
              {copied ? 'Copied' : 'Copy formatted'}
            </Button>
          </Actions>
        </Card>

        <Card mono="Output" title="Formatted output">
          <TextInput
            label="Formatted snippet"
            value={decoded.rendered}
            onChange={() => {}}
            rows={7}
          />
        </Card>
      </Stack>
    </AppShell>
  )
}
