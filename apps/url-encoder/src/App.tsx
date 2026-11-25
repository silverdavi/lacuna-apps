// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  Checkbox,
  Cols,
  Divider,
  Select,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { base64Encode, toHex, urlDecode, urlEncode } from '@lacuna/codecs'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveText } from '@lacuna/file-save-open'
import { store } from './host'

type Codec = 'url-encode' | 'url-decode' | 'base64' | 'hex'

type SpaceMode = 'percent' | 'plus'

const CODEC_OPTIONS = [
  { value: 'url-encode', label: 'URL encode' },
  { value: 'url-decode', label: 'URL decode' },
  { value: 'base64', label: 'Base64' },
  { value: 'hex', label: 'Hex' },
]

function convert(
  codec: Codec,
  input: string,
  spaceMode: SpaceMode,
): { ok: boolean; value: string; note: string; error?: string } {
  if (input === '') return { ok: true, value: '', note: 'Waiting for input' }
  try {
    let value: string
    if (codec === 'url-encode') {
      value = urlEncode(input)
      if (spaceMode === 'plus') value = value.replace(/%20/g, '+')
    } else if (codec === 'url-decode') {
      value = urlDecode(input)
    } else if (codec === 'base64') {
      value = base64Encode(input)
    } else {
      value = toHex(input)
    }
    return { ok: true, value, note: 'Live' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'This value could not be read.'
    const friendly =
      codec === 'url-decode'
        ? 'The input does not look like a URL-encoded string. Check for missing or malformed % sequences.'
        : 'This value cannot be converted with the selected codec.'
    return { ok: false, value: '', note: friendly, error: message }
  }
}

function resultFilename(codec: Codec): string {
  switch (codec) {
    case 'url-encode':
      return 'encoded-url.txt'
    case 'url-decode':
      return 'decoded-url.txt'
    case 'base64':
      return 'base64.txt'
    case 'hex':
      return 'hex.txt'
  }
}

export function App() {
  const [input, setInput] = useState('')
  const [codec, setCodec] = useState<Codec>('url-encode')
  const [spaceMode, setSpaceMode] = useState<SpaceMode>('percent')
  const [history, setHistory] = useState(() => store.list())
  const { copy, copied } = useClipboard()

  const result = useMemo(() => convert(codec, input, spaceMode), [codec, input, spaceMode])
  const codecLabel = CODEC_OPTIONS.find((o) => o.value === codec)!.label

  const addToHistory = () => {
    if (input === '' || !result.ok) return
    store.add({ codec: codecLabel, input, result: result.value })
    setHistory(store.list())
  }

  const removeEntry = (id: string) => {
    store.remove(id)
    setHistory(store.list())
  }

  const handleExport = () => {
    if (!result.ok || result.value === '') return
    saveText(result.value, { filename: resultFilename(codec), mimeType: 'text/plain' })
  }

  return (
    <AppShell
      name="URL Encoder"
      icon="search"
      hue="cobalt"
      category="Tools"
      status={copied ? 'Copied to clipboard' : result.note}
      side={
        <Card title="History" actions={<Button onClick={addToHistory} disabled={!result.ok || input === ''}>Add to history</Button>}>
          {history.length === 0 ? (
            <div className="lc-mono lc-mono-sm lc-faint">No conversions yet</div>
          ) : (
            <Table
              label="History"
              columns={[
                { key: 'input', label: 'Input' },
                { key: 'result', label: 'Result' },
                { key: 'remove', label: 'Remove' },
              ]}
              rows={history.map((entry) => ({
                cells: {
                  input: <span title={entry.codec}>{entry.input}</span>,
                  result: entry.result,
                  remove: <Button kind="danger" ariaLabel="Remove" onClick={() => removeEntry(entry.id)}>Remove</Button>,
                },
              }))}
            />
          )}
        </Card>
      }
    >
      <Stack>
        <Card title="Convert" mono="Type below and the output updates as you go">
          <Cols kind="3">
            <Select label="Codec" value={codec} onChange={(value) => setCodec(value as Codec)} options={CODEC_OPTIONS} />
            <TextInput
              label="Input"
              value={input}
              onChange={setInput}
              placeholder="Type a value to convert"
              error={result.error}
              hint={result.ok && input !== '' ? `${input.length} characters` : undefined}
            />
            <TextInput label="Output" value={result.value} onChange={() => undefined} />
          </Cols>
          {codec === 'url-encode' && (
            <>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
                <Checkbox
                  label="Encode spaces as + (form style)"
                  checked={spaceMode === 'plus'}
                  onChange={(checked) => setSpaceMode(checked ? 'plus' : 'percent')}
                />
                <Tag>{spaceMode === 'plus' ? 'Spaces become +' : 'Spaces become %20'}</Tag>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'calc(16px * var(--sf))', flexWrap: 'wrap' }}>
            <div className="lk-actions">
              <Button
                kind="primary"
                onClick={() => {
                  if (result.ok && result.value !== '') void copy(result.value).catch(() => undefined)
                }}
                disabled={!result.ok || result.value === ''}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                onClick={handleExport}
                disabled={!result.ok || result.value === ''}
                title="Download the output as a .txt file"
              >
                Export
              </Button>
              <Button onClick={() => setInput('')} disabled={input === ''}>
                Clear
              </Button>
            </div>
            {result.ok && result.value !== '' && (
              <Body sm style={{ maxWidth: 'calc(320px * var(--sf))', color: 'var(--ink-60)' }}>
                {codec === 'url-encode' &&
                  'Encodes every character that is not safe in a URL, so the result can be placed in a query string or path.'}
                {codec === 'url-decode' &&
                  'Reverses percent-encoding. Invalid sequences, such as a lone %, are reported below the input.'}
                {codec === 'base64' && 'Produces a Base64 representation of the UTF-8 input, suitable for embedding in URLs or JSON.'}
                {codec === 'hex' && 'Each UTF-16 code unit becomes two lowercase hex digits.'}
              </Body>
            )}
          </div>
        </Card>
      </Stack>
    </AppShell>
  )
}
