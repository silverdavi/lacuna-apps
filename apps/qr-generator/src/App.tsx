// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { Actions, AppShell, Body, Button, Card, FormGrid, Stack } from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { encodeQr, qrFileName, toSvgMarkup } from './engine'
import { host } from './host'
import type { CorrectionLevel } from './host'

const LEVELS: CorrectionLevel[] = ['L', 'M', 'Q', 'H']

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
  const { copy, copied } = useClipboard({ timeoutMs: 2000 })

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
      host.saveState({ content, level })
    } catch {
      setGenerated(null)
      setError('Content is too long to encode')
    }
  }

  const onCopy = () => {
    if (!generated) return
    void copy(generated.svg).catch(() => undefined)
  }

  const onDownload = () => {
    if (!generated) return
    saveText(generated.svg, { filename: qrFileName(generated.content), mimeType: 'image/svg+xml' })
  }

  return (
    <AppShell name="QR Maker" icon="docs" hue="cobalt" category="Apps" status="Local · no network">
      <Card mono="QR">
        <Stack>
          <Body>Enter text or a URL to generate a QR code.</Body>
          <FormGrid>
            <label className="lc-field">
              <span className="lc-field-label">Content</span>
              <input
                className="lc-input"
                type="text"
                value={content}
                placeholder="Text or a URL"
                aria-invalid={error ? true : undefined}
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
          </FormGrid>
          <Actions>
            <Button
              kind="primary"
              onClick={onGenerate}
              disabled={content.length === 0 && !fieldTouched}
            >
              Generate
            </Button>
          </Actions>
          {error ? <Body sm style={{ color: 'var(--danger)' }}>{error}</Body> : null}
          {generated ? (
            <Stack>
              <div
                className="lc-qr"
                role="img"
                aria-label={`QR code for ${generated.content}`}
                dangerouslySetInnerHTML={{ __html: generated.svg }}
              />
              <Body sm>Error correction: {generated.level}</Body>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                <Button kind="secondary" onClick={onCopy}>
                  Copy
                </Button>
                {copied ? (
                  <span aria-live="polite" style={{ color: 'var(--accent)' }}>
                    Copied
                  </span>
                ) : null}
                <Button kind="secondary" onClick={onDownload}>
                  Download
                </Button>
              </div>
            </Stack>
          ) : null}
        </Stack>
      </Card>
    </AppShell>
  )
}
