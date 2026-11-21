import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Body, Button, Card, Stack } from '@lacuna/ui'
import { host } from './host'
import type { CorrectionLevel } from './host'
import { encodeQr, qrFileName, toSvgMarkup } from './engine'

const LEVELS: CorrectionLevel[] = ['L', 'M', 'Q', 'H']
const TOOLTIP_MS = 2000
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(8px * var(--sf))',
}

interface Generated {
  content: string
  level: CorrectionLevel
  svg: string
}

export function App() {
  const [content, setContent] = useState('')
  const [level, setLevel] = useState<CorrectionLevel>('L')
  const [generated, setGenerated] = useState<Generated | null>(null)
  const [error, setError] = useState('')
  const [fieldTouched, setFieldTouched] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)

  useEffect(() => {
    const saved = host.loadState()
    if (!saved) return
    setContent(saved.content)
    setLevel(saved.level)
    try {
      setGenerated({ content: saved.content, level: saved.level, svg: toSvgMarkup(encodeQr(saved.content, saved.level)) })
    } catch {
      // unpersistable payload; the user can regenerate
    }
  }, [])

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  const onGenerate = () => {
    if (content.trim() === '') {
      setGenerated(null)
      setError('Content cannot be empty')
      return
    }
    try {
      const svg = toSvgMarkup(encodeQr(content, level))
      setGenerated({ content, level, svg })
      setError('')
      setCopied(false)
      host.saveState({ content, level })
    } catch {
      setGenerated(null)
      setError('Content is too long to encode')
    }
  }

  const onCopy = () => {
    if (!generated) return
    const done = () => {
      setCopied(true)
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), TOOLTIP_MS)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(generated.svg).then(done, done)
    } else {
      done()
    }
  }

  const onDownload = () => {
    if (!generated) return
    const blob = new Blob([generated.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = qrFileName(generated.content)
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main>
      <Card mono="QR">
        <Stack>
          <h1 className="lc-title lc-title-lg">QR Maker</h1>
          <Body>Enter text or a URL to generate a QR code.</Body>
          <label className="lc-field">
            <span className="lc-field-label">Content</span>
            <input
              className="lc-input"
              type="text"
              value={content}
              placeholder="Text or a URL"
              onFocus={() => setFieldTouched(true)}
              onChange={(event) => {
                setFieldTouched(true)
                setContent(event.target.value)
              }}
            />
          </label>
          <label className="lc-field">
            <span className="lc-field-label">Error correction</span>
            <select
              className="lc-input"
              value={level}
              onChange={(event) => setLevel(event.target.value as CorrectionLevel)}
            >
              {LEVELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="lc-btn primary"
            disabled={content.length === 0 && !fieldTouched}
            onClick={onGenerate}
          >
            Generate
          </button>
          {error && (
            <Body sm style={{ color: 'var(--danger)' }}>
              {error}
            </Body>
          )}
          {generated && (
            <Stack>
              <div
                className="lc-qr"
                role="img"
                aria-label={`QR code for ${generated.content}`}
                dangerouslySetInnerHTML={{ __html: generated.svg }}
              />
              <Body sm>Error correction: {generated.level}</Body>
              <div style={rowStyle}>
                <Button kind="secondary" onClick={onCopy}>
                  Copy
                </Button>
                {copied && (
                  <span aria-live="polite" style={{ color: 'var(--accent)' }}>
                    Copied
                  </span>
                )}
                <Button kind="secondary" onClick={onDownload}>
                  Download
                </Button>
              </div>
            </Stack>
          )}
        </Stack>
      </Card>
    </main>
  )
}
