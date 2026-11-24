import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  SectionLabel,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { host } from './host'
import type { AsciiArtRecord } from './host'
import './app.css'

const CHARACTER_SETS = [
  { value: 'Default', chars: (c: string) => c },
  { value: 'Block', chars: () => '█' },
  { value: 'Braille', chars: () => '⣿' },
  { value: 'Shades', chars: () => '░' },
  { value: 'Dots', chars: () => '·' },
  { value: 'Slant', chars: () => '/' },
] as const

const MIN_WIDTH = 1
const MAX_WIDTH = 120

type TabKey = 'Text' | 'Image'

interface HistoryEntry {
  id: number
  source: 'text' | 'image'
  characterSet: string
  width: number
  lines: number
  at: string
  text: string
}

interface PersistedState {
  characterSet: string
  width: number
  history: HistoryEntry[]
}

const DEFAULT_STATE: PersistedState = {
  characterSet: 'Default',
  width: 80,
  history: [],
}

const MAX_HISTORY = 12

function generateTextAscii(input: string, charFn: (c: string) => string, width: number): string {
  const lines: string[] = []
  let current = ''
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!
    if (c === '\n') {
      lines.push(current)
      current = ''
    } else if (c === ' ') {
      current += ' '
    } else {
      current += charFn(c) + ' '
    }
    if (current.length > width) {
      lines.push(current.slice(0, width))
      current = current.slice(width)
    }
  }
  lines.push(current)
  return lines.join('\n')
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function generateImageAscii(image: HTMLImageElement, charFn: (c: string) => string, width: number): string {
  const scale = width / image.naturalWidth
  const height = Math.max(2, Math.round(image.naturalHeight * scale * 0.5))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx === null) return ''
  ctx.drawImage(image, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const lines: string[] = []
  for (let y = 0; y < height; y++) {
    let line = ''
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      const l = luminance(r, g, b)
      line += charFn(String(l))
    }
    lines.push(line)
  }
  return lines.join('\n')
}

const INITIAL: AsciiArtRecord | null = host.loadRecord()
const INITIAL_OUTPUT = INITIAL?.text ?? ''

export function App() {
  const [tab, setTab] = useState<TabKey>('Text')
  const [inputText, setInputText] = useState('')
  const [widthText, setWidthText] = useState(String(INITIAL?.width ?? 80))
  const [output, setOutput] = useState(INITIAL_OUTPUT)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [decodedImage, setDecodedImage] = useState<HTMLImageElement | null>(null)
  const [historyId, setHistoryId] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const { value: settings, set: setSettings } = useLocalRecord<PersistedState>({
    key: 'lacuna.ascii-art.settings',
    version: 1,
    defaultValue: { ...DEFAULT_STATE, characterSet: INITIAL?.characterSet ?? 'Default' },
  })

  const characterSet = settings.characterSet
  const history = settings.history

  const charFn = CHARACTER_SETS.find((s) => s.value === characterSet)?.chars ?? ((c: string) => c)

  const parsedWidth = () => {
    const w = Number(widthText)
    return Number.isInteger(w) && w >= MIN_WIDTH && w <= MAX_WIDTH ? w : null
  }

  const handleGenerate = () => {
    const w = parsedWidth()
    if (w === null) {
      setOutput('')
      setError(`Width must be between ${MIN_WIDTH} and ${MAX_WIDTH}`)
      return
    }
    setError('')
    let result = ''
    if (tab === 'Text') {
      if (inputText.length === 0) {
        setOutput('')
        setError('Enter some text to convert')
        return
      }
      result = generateTextAscii(inputText, charFn, w)
    } else {
      if (decodedImage === null) {
        setOutput('')
        setError('Upload an image first')
        return
      }
      result = generateImageAscii(decodedImage, charFn, w)
    }
    const lines = result.split('\n').length
    const at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const source = tab === 'Text' ? 'text' : 'image'
    const entry: HistoryEntry = {
      id: historyId + 1,
      source,
      characterSet,
      width: w,
      lines,
      at,
      text: result,
    }
    setHistoryId((n) => n + 1)
    setSettings((prev) => ({ ...prev, characterSet, width: w, history: [entry, ...prev.history].slice(0, MAX_HISTORY) }))
    setOutput(result)
    host.saveRecord({ text: result, source, characterSet, width: w })
  }

  const handleCopy = () => {
    if (output) void copy(output)
  }

  const handleDownload = () => {
    if (output) saveText(output, { filename: 'ascii-art.txt', mimeType: 'text/plain' })
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file === undefined) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    const img = new Image()
    img.src = url
    img.decode().then(() => {
      setDecodedImage(img)
      setError('')
    }).catch(() => {
      setDecodedImage(null)
      setError('Could not load the uploaded image')
    })
  }

  const lineCount = output === '' ? 0 : output.split('\n').length
  const charCount = output.length

  const clearHistory = () => {
    setSettings((prev) => ({ ...prev, history: [] }))
  }

  return (
    <AppShell
      name="ASCII Art Generator"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={`${CHARACTER_SETS.length} sets · max ${MAX_WIDTH}w`}
      status={output !== '' ? `${lineCount} lines · ${charCount} chars` : 'Ready'}
      side={
        <Rail
          title="ASCII Art"
          note="Text or image to characters"
          chips={output !== '' ? [`${lineCount} lines`, `${charCount} chars`] : []}
        >
          <SectionLabel>Recent</SectionLabel>
          {history.length === 0 ? (
            <p className="aa-rail-hint">Generations you make show up here.</p>
          ) : (
            <div className="aa-rail-history">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="aa-rail-history-row"
                  onClick={() => setOutput(h.text)}
                >
                  <span className="aa-rail-history-meta">{h.at} · {h.source}</span>
                  <span className="aa-rail-history-set">{h.characterSet} · {h.width}w</span>
                </button>
              ))}
              <button type="button" className="aa-rail-clear" onClick={clearHistory}>
                Clear history
              </button>
            </div>
          )}
        </Rail>
      }
    >
      <div className="aa-tabs" role="tablist" aria-label="Source">
        {(['Text', 'Image'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`aa-tab${tab === t ? ' on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <Card mono="Input" title={tab === 'Text' ? 'Text to ASCII' : 'Image to ASCII'}>
        {tab === 'Text' ? (
          <Stack>
            <FormGrid>
              <TextInput
                label="Input text"
                value={inputText}
                onChange={setInputText}
                placeholder="Type something…"
              />
            </FormGrid>
          </Stack>
        ) : (
          <Stack>
            <FormGrid>
              <label className="lc-field">
                <span className="lc-field-label">Upload image</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </FormGrid>
            {imageUrl !== '' && (
              <p className="aa-file-note">Image loaded, ready to convert.</p>
            )}
          </Stack>
        )}
        <FormGrid>
          <Select
            label="Character set"
            value={characterSet}
            onChange={(v) => setSettings((prev) => ({ ...prev, characterSet: v }))}
            options={CHARACTER_SETS.map((s) => s.value)}
          />
          <TextInput
            label="Width"
            type="number"
            value={widthText}
            onChange={setWidthText}
          />
        </FormGrid>
        {error !== '' && <ErrorState title={error} />}
      </Card>

      <Card mono="Output" title="ASCII art" actions={
        output !== '' ? (
          <div className="aa-card-actions">
            <Button kind="secondary" onClick={handleCopy} ariaLabel="Copy">{copied ? 'Copied to clipboard' : 'Copy'}</Button>
            <Button kind="ghost" onClick={handleDownload}>Download</Button>
          </div>
        ) : undefined
      }>
        {output !== '' ? (
          <Stack>
            <KpiRow>
              <Kpi value={String(lineCount)} label="Lines" />
              <Kpi value={String(charCount)} label="Chars" />
              <Kpi value={`${characterSet}`} label="Set" accent />
            </KpiRow>
            <pre role="textbox" aria-label="ASCII output" className="aa-output">{output}</pre>
          </Stack>
        ) : (
          <EmptyState
            mono="Empty"
            title="Nothing generated yet"
            detail="Pick a source, set the width, and press Generate."
            actionLabel="Generate"
          />
        )}
      </Card>

      <Card mono="Run" title="Generate">
        <div className="aa-run-row">
          <Button kind="primary" onClick={handleGenerate}>Generate</Button>
          <span className="aa-run-hint">Result stays editable and saves to history.</span>
        </div>
      </Card>
    </AppShell>
  )
}
