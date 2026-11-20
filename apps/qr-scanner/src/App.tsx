import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, EmptyState, Stack } from '@lacuna/ui'
import { host } from './host'
import type { CodeFormat, CodeRecord, ScannerState } from './host'
import { encodeQr, decodeQr } from './lib/qr'
import { encodePng, decodePng } from './lib/png'
import { ean13Row, code128Row, ean13CheckDigit } from './lib/barcode'

const KINDS: CodeFormat[] = ['QR Code', 'EAN-13', 'Code 128']

function slug(text: string): string {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'code'
}

function fileName(kind: CodeFormat, text: string): string {
  if (kind === 'QR Code') return 'qr-' + slug(text) + '.png'
  if (kind === 'EAN-13') return 'ean-' + slug(text) + '.png'
  return 'c128-' + slug(text) + '.png'
}

function altText(kind: CodeFormat, text: string, code: string): string {
  const shown = kind === 'EAN-13' ? code : text
  return kind + ': ' + shown
}

function scaleRow(row: boolean[], height: number): boolean[] {
  const w = row.length
  const size = Math.max(w, height)
  const out = new Array<boolean>(size * size).fill(false)
  for (let y = 0; y < size; y++) {
    const ry = Math.floor((y * height) / size)
    for (let x = 0; x < size; x++) {
      const rx = Math.floor((x * w) / size)
      out[y * size + x] = row[rx]
    }
  }
  return out
}

function codeToPng(kind: CodeFormat, text: string): Uint8Array {
  if (kind === 'QR Code') {
    const m = encodeQr(text)
    return encodePng(m.size, m.dark)
  }
  if (kind === 'EAN-13') {
    const row = ean13Row(text).dark
    return encodePng(Math.max(row.length, 48), scaleRow(row, 48))
  }
  const row = code128Row(text).dark
  return encodePng(Math.max(row.length, 48), scaleRow(row, 48))
}

function encodeFor(kind: CodeFormat, text: string): string {
  if (kind === 'EAN-13') {
    if (!/^\d{12}$/.test(text)) throw new Error('EAN-13 needs 12 digits')
    return text + ean13CheckDigit(text)
  }
  if (kind === 'Code 128') {
    if (!text) throw new Error('Code 128 needs text')
    if ([...text].some((c) => c.charCodeAt(0) > 127)) throw new Error('Code 128 here encodes ASCII only')
    return text
  }
  return text
}

function pngUrl(png: Uint8Array): string {
  return URL.createObjectURL(new Blob([png as unknown as BlobPart], { type: 'image/png' }))
}

export function App() {
  const [state, setState] = useState<ScannerState>(() => host.loadState() ?? { records: [], lastEncode: null })
  const [tab, setTab] = useState<'Scan' | 'Encode'>('Scan')
  const [text, setText] = useState('')
  const [format, setFormat] = useState<CodeFormat>('QR Code')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [lastPng, setLastPng] = useState<Uint8Array | null>(null)
  const [lastUrl, setLastUrl] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    host.saveState(state)
  }, [state])

  useEffect(() => {
    if (lastPng || !state.lastEncode) return
    try {
      setLastPng(codeToPng(state.lastEncode.kind, state.lastEncode.text))
    } catch {
      setLastPng(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLastPng(null)
  }, [tab])

  useEffect(() => {
    return () => {
      if (lastUrl) URL.revokeObjectURL(lastUrl)
    }
  }, [lastUrl])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  const generate = () => {
    setError('')
    const value = text
    if (!value.trim()) {
      setError('Enter text to encode')
      setLastPng(null)
      setLastUrl('')
      return
    }
    let code: string
    let png: Uint8Array
    try {
      code = encodeFor(format, value)
      png = codeToPng(format, value)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not encode')
      setLastPng(null)
      setLastUrl('')
      return
    }
    const rec: CodeRecord = {
      id: String(Date.now()),
      kind: format,
      text: value,
      code,
      at: Date.now(),
    }
    setLastPng(png)
    setLastUrl(pngUrl(png))
    setState((s) => ({
      records: [rec, ...s.records.filter((r) => !(r.kind === format && r.text === value))].slice(0, 50),
      lastEncode: rec,
    }))
  }

  const download = () => {
    if (!state.lastEncode || !lastPng) return
    const url = pngUrl(lastPng)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName(state.lastEncode.kind, state.lastEncode.text)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  const copy = (rec: CodeRecord) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rec.text).then(
        () => showToast('Copied to clipboard'),
        () => showToast('Copy failed'),
      )
    } else {
      showToast('Copy unavailable')
    }
  }

  const onFile = async (file: File) => {
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const { width, height, gray } = decodePng(buf)
      console.log('[onFile] decoded png w=' + width + ' h=' + height)
      const decoded = decodeQr(gray, width, height)
      console.log('[onFile] decoded=' + JSON.stringify(decoded))
      if (!decoded) {
        showToast('No QR code found')
        return
      }
      const rec: CodeRecord = {
        id: String(Date.now()),
        kind: 'QR Code',
        text: decoded,
        code: decoded,
        at: Date.now(),
      }
      setState((s) => ({ records: [rec, ...s.records].slice(0, 50), lastEncode: s.lastEncode }))
    } catch {
      showToast('Could not read that image')
    }
  }

  const lastAlt = state.lastEncode ? altText(state.lastEncode.kind, state.lastEncode.text, state.lastEncode.code) : ''

  return (
    <main style={{ padding: 'calc(24px * var(--sf))' }}>
      <Card mono="Lacuna" style={{ maxWidth: 720 }}>
        <Stack lg>
          <h1
            style={{
              margin: 0,
              fontSize: 'calc(20px * var(--tf))',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            QR Code Scanner
          </h1>
          <div
            role="tablist"
            aria-label="Scanner modes"
            style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}
          >
            {(['Scan', 'Encode'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={'tab-' + t}
                aria-selected={tab === t}
                aria-controls={'panel-' + t}
                className={'lc-tab' + (tab === t ? ' active' : '')}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Scan' && (
            <div role="tabpanel" id="panel-Scan" aria-labelledby="tab-Scan">
              <Stack>
                <Body sm>Upload a picture of a QR code to read it. Everything stays in this space.</Body>
                <Button kind="primary" onClick={() => fileRef.current?.click()}>
                  Upload image
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0]
                    if (f) onFile(f)
                    e.target.value = ''
                  }}
                />
              </Stack>
            </div>
          )}

          {tab === 'Encode' && (
            <div role="tabpanel" id="panel-Encode" aria-labelledby="tab-Encode">
              <Stack>
                <label className="lc-field">
                  <span className="lc-field-label">Text</span>
                  <input
                    className="lc-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <label className="lc-field">
                  <span className="lc-field-label">Format</span>
                  <select
                    className="lc-input"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as CodeFormat)}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <Button kind="primary" onClick={generate}>
                  Generate
                </Button>
                {error && <Body sm style={{ color: 'var(--accent)' }}>{error}</Body>}
                {state.lastEncode && lastPng && lastUrl && (
                  <Stack>
                    <img
                      src={lastUrl}
                      alt={lastAlt}
                      style={{ width: 'auto', height: 'auto', maxWidth: 288, imageRendering: 'pixelated' }}
                    />
                    <Button kind="secondary" onClick={download}>
                      Download
                    </Button>
                  </Stack>
                )}
              </Stack>
            </div>
          )}

          <h2
            style={{
              margin: 0,
              fontSize: 'calc(16px * var(--tf))',
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            Results
          </h2>
          {state.records.length === 0 ? (
            <EmptyState title="No results yet" detail="Scans and encodes you save will appear here." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {state.records.map((rec) => (
                <li
                  key={rec.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'calc(12px * var(--sf))',
                    padding: 'calc(8px * var(--sf)) 0',
                    borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
                    <Body style={{ fontWeight: 600 }}>{rec.text}</Body>
                    <Body sm>{rec.kind}</Body>
                  </div>
                  <Button kind="ghost" onClick={() => copy(rec)}>
                    Copy
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Card>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(24px * var(--sf))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
            borderRadius: 'calc(8px * var(--sf))',
            fontSize: 'calc(14px * var(--tf))',
          }}
        >
          {toast}
        </div>
      )}
    </main>
  )
}
