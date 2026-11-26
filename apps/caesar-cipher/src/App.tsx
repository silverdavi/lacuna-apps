import { useEffect, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Select,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { base64Decode, base64Encode, toHex, urlDecode, urlEncode } from '@lacuna/codecs'

type CipherKind = 'Caesar' | 'Base64' | 'Hex' | 'URL'
type Direction = 'forward' | 'reverse'

interface CipherSettings {
  cipher: string
  shift: number
  direction: Direction
}

interface HistoryItem {
  id: string
  text: string
  cipher: string
  shift: number
  direction: Direction
  output: string
  createdAt: number
}

interface CipherRecord {
  settings: CipherSettings
  history: HistoryItem[]
  text: string
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function caesarShift(text: string, shift: number, direction: Direction): string {
  const amount = direction === 'reverse' ? -shift : shift
  return text
    .split('')
    .map((ch) => {
      const upper = ch.toUpperCase()
      const idx = ALPHABET.indexOf(upper)
      if (idx === -1) return ch
      const shifted = (idx + amount + 26 * 1000) % 26
      const moved = ALPHABET[shifted]
      return ch === ch.toLowerCase() ? moved.toLowerCase() : moved
    })
    .join('')
}

function decodeSafe(fn: () => string, fallback: string): string {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function isBase64Like(s: string): boolean {
  if (s.length === 0 || s.length % 4 !== 0) return false
  return /^[A-Za-z0-9+/=]+$/.test(s)
}

function isHexLike(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s)
}

function isDecimalLike(s: string): boolean {
  return /^\d+$/.test(s)
}

function isUrlEncoded(s: string): boolean {
  return /%[0-9A-Fa-f]{2}/.test(s)
}

function transform(text: string, settings: CipherSettings): string {
  if (!text) return ''
  switch (settings.cipher as CipherKind) {
    case 'Base64':
      if (isBase64Like(text)) {
        const decoded = decodeSafe(() => base64Decode(text), '')
        if (decoded) return decoded
      }
      return base64Encode(text)
    case 'Hex':
      if (isDecimalLike(text)) {
        const n = parseInt(text, 10)
        if (Number.isFinite(n) && n >= 0) return n.toString(16).toLowerCase()
      }
      if (isHexLike(text)) {
        const decimal = parseInt(text, 16)
        if (Number.isFinite(decimal)) return String(decimal)
        return text
      }
      return toHex(text)
    case 'URL':
      if (isUrlEncoded(text)) {
        return decodeSafe(() => urlDecode(text), text)
      }
      return urlEncode(text)
    default:
      return caesarShift(text, settings.shift, 'forward')
  }
}

const CIPHER_OPTIONS = [
  { value: 'Caesar', label: 'Caesar' },
  { value: 'Base64', label: 'Base64' },
  { value: 'Hex', label: 'Hex' },
  { value: 'URL', label: 'URL' },
]

const DEFAULT_RECORD: CipherRecord = {
  settings: { cipher: 'Caesar', shift: 3, direction: 'forward' },
  history: [],
  text: '',
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<CipherRecord>({
    key: 'lacuna.caesar-cipher.v1',
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })

  const [text, setText] = useState(record.text)
  const [result, setResult] = useState('')

  const { settings } = record

  useEffect(() => {
    if (record.text !== text) {
      setRecord({ ...record, text })
    }
  }, [text])

  const handleTransform = () => {
    if (!text) return
    setResult(transform(text, settings))
  }

  const { copy, copied } = useClipboard({ timeoutMs: 2000 })

  const handleCopy = () => {
    if (!result) return
    void copy(result)
  }

  const handleSave = () => {
    if (!result || !text) return
    const item: HistoryItem = {
      id: `${Date.now()}`,
      text,
      cipher: settings.cipher,
      shift: settings.shift,
      direction: 'forward',
      output: result,
      createdAt: Date.now(),
    }
    setRecord({ ...record, history: [item, ...record.history].slice(0, 50) })
  }

  const handleRestore = (item: HistoryItem) => {
    setText(item.text)
    setRecord({
      ...record,
      settings: { ...settings, cipher: item.cipher, shift: item.shift },
    })
  }

  const handleRemove = (id: string) => {
    setRecord({ ...record, history: record.history.filter((i) => i.id !== id) })
  }

  const handleReset = () => {
    setRecord({ ...record, settings: { ...DEFAULT_RECORD.settings } })
  }

  const hasHistory = record.history.length > 0
  const copyLabel = copied ? 'Copied to clipboard' : 'Copy result'

  const historyRows = record.history.map((item) => ({
    hot: true,
    cells: {
      text: <Tag>{item.text.slice(0, 20)}</Tag>,
      cipher: item.cipher,
      shift: item.cipher === 'Caesar' ? String(item.shift) : 'auto',
      output: item.output.slice(0, 20),
      when: new Date(item.createdAt).toLocaleTimeString(),
      action: (
        <Button kind="ghost" ariaLabel={`Restore ${item.text.slice(0, 12)}`} onClick={() => handleRestore(item)}>
          Restore
        </Button>
      ),
    },
  }))

  return (
    <AppShell
      name="Cipher Tool"
      icon="security"
      hue="cobalt"
      category="Developer"
      meta={`${record.history.length} saved`}
      status={hasHistory ? `${record.history.length} result${record.history.length === 1 ? '' : 's'} saved` : 'No saved results'}
      actions={
        <Button onClick={handleReset}>
          Reset settings
        </Button>
      }
      side={
        <Stack lg>
          <Rail
            title="Settings"
            note={
              settings.cipher === 'Caesar'
                ? 'Shifts each letter by a fixed amount'
                : settings.cipher === 'Base64'
                  ? 'Encodes or decodes Base64'
                  : settings.cipher === 'Hex'
                    ? 'Converts decimal to hex and back'
                    : 'Encodes and decodes URL text'
            }
            chips={[
              `Cipher: ${settings.cipher}`,
              settings.cipher === 'Caesar' ? `Shift ${settings.shift}` : 'Auto-detect',
            ]}
          />
          <Rail title="Output" note={result ? 'Ready to copy' : 'Awaiting input'} />
        </Stack>
      }
    >
      <Stack lg>
        <Card title="Transform" mono="Cipher engine">
          <FormGrid>
            <TextInput
              label="Input text"
              value={text}
              onChange={setText}
              rows={3}
              placeholder="Type here"
            />
            <p className="lc-body-sm">Enter text to transform</p>
            <Select
              label="Cipher"
              value={settings.cipher}
              onChange={(value) =>
                setRecord({ ...record, settings: { ...settings, cipher: value } })
              }
              options={CIPHER_OPTIONS}
            />
            <TextInput
              label="Shift"
              value={String(settings.shift)}
              onChange={(value) => {
                const parsed = Math.max(0, Math.min(26, parseInt(value, 10) || 0))
                setRecord({ ...record, settings: { ...settings, shift: parsed } })
              }}
              type="number"
              inputMode="numeric"
              placeholder="0-26"
            />
          </FormGrid>
          <div style={{ marginTop: 14 }}>
            <Button kind="primary" disabled={!text} onClick={handleTransform}>
              Transform
            </Button>
          </div>
        </Card>

        <Card title="Result" mono={result ? 'Latest output' : 'No output yet'}>
          {result ? (
            <Stack>
              <div style={{ position: 'relative' }}>
                <input
                  className="lc-input"
                  id="result-input"
                  value={result}
                  readOnly
                  style={{ width: '100%' }}
                />
                <label htmlFor="result-input" className="lc-field-label">
                  Result
                </label>
              </div>
              <div>
                <Button kind="secondary" onClick={handleCopy}>
                  {copyLabel}
                </Button>
                <Button kind="ghost" onClick={handleSave}>
                  Save to history
                </Button>
              </div>
            </Stack>
          ) : (
            <EmptyState
              title="Nothing to show yet"
              detail="Enter text and run the transform."
              actionLabel="Transform"
            />
          )}
        </Card>

        <Card
          title="History"
          mono={hasHistory ? `${record.history.length} saved results` : 'Nothing saved yet'}
        >
          {hasHistory ? (
            <Table
              label="Saved transforms"
              columns={[
                { key: 'text', label: 'Text' },
                { key: 'cipher', label: 'Cipher' },
                { key: 'shift', label: 'Shift', num: true },
                { key: 'output', label: 'Output' },
                { key: 'when', label: 'When' },
                { key: 'action', label: '' },
              ]}
              rows={historyRows}
            />
          ) : (
            <EmptyState
              title="No saved results"
              detail="Run a transform and save it to build your history."
              actionLabel="Save to history"
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
