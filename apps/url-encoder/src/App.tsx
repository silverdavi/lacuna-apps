// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { AppShell, Button, Card, Cols, Select, Stack, Table, TextInput } from '@lacuna/ui'
import { base64Encode, toHex, urlDecode, urlEncode } from '@lacuna/codecs'
import { useClipboard } from '@lacuna/use-clipboard'
import { store } from './host'

type Codec = 'url-encode' | 'url-decode' | 'base64' | 'hex'

const CODEC_OPTIONS = [
  { value: 'url-encode', label: 'URL encode' },
  { value: 'url-decode', label: 'URL decode' },
  { value: 'base64', label: 'Base64' },
  { value: 'hex', label: 'Hex' },
]

function convert(codec: Codec, input: string): { ok: boolean; value: string; note: string } {
  if (input === '') return { ok: true, value: '', note: 'Waiting for input' }
  try {
    let value: string
    if (codec === 'url-encode') value = urlEncode(input)
    else if (codec === 'url-decode') value = urlDecode(input)
    else if (codec === 'base64') value = base64Encode(input)
    else value = toHex(input)
    return { ok: true, value, note: 'Live' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'could not be read'
    return { ok: false, value: '', note: message }
  }
}

export function App() {
  const [input, setInput] = useState('')
  const [codec, setCodec] = useState<Codec>('url-encode')
  const [history, setHistory] = useState(() => store.list())
  const { copy, copied } = useClipboard()

  const result = useMemo(() => convert(codec, input), [codec, input])
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
        <Card title="Convert">
          <Cols kind="3">
            <Select label="Codec" value={codec} onChange={(value) => setCodec(value as Codec)} options={CODEC_OPTIONS} />
            <TextInput label="Input" value={input} onChange={setInput} placeholder="Type a value to convert" />
            <TextInput label="Output" value={result.value} onChange={() => undefined} />
          </Cols>
          <div className="lk-actions">
            <Button
              onClick={() => {
                if (result.ok && result.value !== '') void copy(result.value).catch(() => undefined)
              }}
              disabled={!result.ok || result.value === ''}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Card>
      </Stack>
    </AppShell>
  )
}
