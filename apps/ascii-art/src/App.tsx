import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host'
import type { AsciiArtRecord } from './host'

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
  const [characterSet, setCharacterSet] = useState(INITIAL?.characterSet ?? 'Default')
  const [widthText, setWidthText] = useState(String(INITIAL?.width ?? 80))
  const [output, setOutput] = useState(INITIAL_OUTPUT)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [decodedImage, setDecodedImage] = useState<HTMLImageElement | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

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
    if (tab === 'Text') {
      if (inputText.length === 0) {
        setOutput('')
        setError('Enter some text to convert')
        return
      }
      const result = generateTextAscii(inputText, charFn, w)
      setOutput(result)
      host.saveRecord({ text: result, source: 'text', characterSet, width: w })
    } else {
      if (decodedImage === null) {
        setOutput('')
        setError('Upload an image first')
        return
      }
      const result = generateImageAscii(decodedImage, charFn, w)
      setOutput(result)
      host.saveRecord({ text: result, source: 'image', characterSet, width: w })
    }
  }

  const handleCopy = () => {
    if (output) void copy(output)
  }

  const handleDownload = () => {
    if (output) saveText(output, { filename: 'ascii-art.txt', mimeType: 'text/plain' })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <AppShell
      name="ASCII Art Generator"
      icon="paint"
      hue="teal"
      category="Productivity"
      side={
        <Rail title="How it works" note="Text or image to ASCII">
          <Body sm>
            Type text or upload an image, pick a character set and width, then press Generate.
          </Body>
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist">
        {(['Text', 'Image'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`lc-tab${tab === t ? ' active' : ''}`}
            style={tab !== t ? { color: 'var(--ink-60)' } : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <Card mono={tab === 'Text' ? 'Text' : 'Image'} title={tab === 'Text' ? 'Text to ASCII' : 'Image to ASCII'}>
        {tab === 'Text' ? (
          <Stack>
            <FormGrid>
              <TextInput
                label="Input text"
                value={inputText}
                onChange={setInputText}
                placeholder="Type something…"
              />
              <Select
                label="Character set"
                value={characterSet}
                onChange={setCharacterSet}
                options={CHARACTER_SETS.map((s) => s.value)}
              />
              <TextInput
                label="Width"
                type="number"
                value={widthText}
                onChange={setWidthText}
              />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={handleGenerate}>Generate</Button>
            </Actions>
          </Stack>
        ) : (
          <Stack>
            <FormGrid>
              <label className="lc-field">
                <span className="lc-field-label">Upload image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} />
              </label>
              <Select
                label="Character set"
                value={characterSet}
                onChange={setCharacterSet}
                options={CHARACTER_SETS.map((s) => s.value)}
              />
              <TextInput
                label="Width"
                type="number"
                value={widthText}
                onChange={setWidthText}
              />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={handleGenerate}>Generate</Button>
            </Actions>
          </Stack>
        )}
        {error !== '' && <ErrorState title={error} />}
      </Card>

      <Card mono="Output" title="ASCII art">
        <Stack>
          <div className="lc-field">
            <span className="lc-field-label" id="ascii-output-label">ASCII output</span>
            <pre aria-labelledby="ascii-output-label" style={{ whiteSpace: 'pre', overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: 'calc(14px * var(--tf))', lineHeight: 'calc(20px * var(--tf))', color: 'var(--ink)', background: 'var(--paper-deep)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(8px * var(--sf))', minHeight: 'calc(80px * var(--sf))', minWidth: 'calc(800px * var(--sf))', margin: 0 }}>{output || '\u00A0'}</pre>
          </div>
          {output !== '' ? (
            <Actions>
              <Button kind="secondary" onClick={handleCopy}>{copied ? 'Copied to clipboard' : 'Copy'}</Button>
              <Button kind="ghost" onClick={handleDownload}>Download</Button>
            </Actions>
          ) : (
            <EmptyState mono="Empty" title="Nothing generated yet" detail="Fill in the fields above and press Generate." actionLabel="Start" onAction={() => setTab('Text')} />
          )}
        </Stack>
      </Card>
    </AppShell>
  )
}
