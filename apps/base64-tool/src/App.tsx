import { useLocalRecord } from '@lacuna/use-local-record'
import { useClipboard } from '@lacuna/use-clipboard'
import { Button, Card, Stack, TextInput, Title } from '@lacuna/ui'
import { useEffect, useMemo, useState } from 'react'
import { convertText } from './encode'
import { STORAGE_KEY } from './host'
import type { ConversionRecord, Encoding } from './host'

const ENCODINGS: { value: Encoding; label: string }[] = [
  { value: 'base64', label: 'Base64' },
  { value: 'url-base64', label: 'URL-safe Base64' },
  { value: 'hex', label: 'Hex' },
]

const DEFAULT_RECORD: ConversionRecord = { input: '', encoding: 'base64' }

export function App() {
  const { value: record, set: setRecord, hydrated } = useLocalRecord<ConversionRecord>({
    key: STORAGE_KEY,
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })

  const [input, setInput] = useState(record.input)
  const [encoding, setEncoding] = useState<Encoding>(record.encoding)

  useEffect(() => {
    if (hydrated) {
      setInput(record.input)
      setEncoding(record.encoding)
    }
  }, [hydrated, record])

  const output = useMemo(() => convertText(input, encoding), [input, encoding])

  const { copied, copy } = useClipboard()

  const persist = (nextInput: string, nextEncoding: Encoding) => {
    setRecord({ input: nextInput, encoding: nextEncoding })
  }

  const onInputChange = (nextValue: string) => {
    setInput(nextValue)
    persist(nextValue, encoding)
  }

  const onEncodingChange = (nextValue: Encoding) => {
    setEncoding(nextValue)
    persist(input, nextValue)
  }

  const onSwap = () => {
    setInput(output)
    persist(output, encoding)
  }

  const onCopy = () => {
    void copy(output)
    persist(input, encoding)
  }

  return (
    <main>
      <Card mono="Encode" title="Base64 Tool">
        <Stack>
          <Title size="md">Encode and decode text</Title>
          <TextInput
            label="Text"
            value={input}
            onChange={onInputChange}
            rows={6}
          />
          <Stack>
            <div className="b64-row">
              <label htmlFor="b64-encoding">Encoding</label>
              <select
                id="b64-encoding"
                className="b64-select"
                value={encoding}
                onChange={(event) => onEncodingChange(event.target.value as Encoding)}
              >
                {ENCODINGS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="b64-actions">
              <Button kind="secondary" onClick={onSwap}>
                Swap
              </Button>
              <Button kind="secondary" onClick={onCopy}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Stack>
          <TextInput
            label="Output"
            value={output}
            onChange={() => undefined}
            rows={6}
          />
        </Stack>
      </Card>
    </main>
  )
}
