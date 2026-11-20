import { useEffect, useState } from 'react'
import { Body, Button, Card, EmptyState, Stack, TextInput } from '@lacuna/ui'
import { host } from './host'
import type { BarcodeType } from './host'
import { encode, toPngBlob, ean13CheckDigit } from './barcode'

const TYPE_LABELS: Record<BarcodeType, string> = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  qr: 'QR Code',
}

export function App() {
  const [type, setType] = useState<BarcodeType>('code128')
  const [data, setData] = useState('')
  const [preview, setPreview] = useState<{ src: string; label: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = host.loadState()
    if (saved) {
      setType(saved.type)
      setData(saved.data)
      setPreview({ src: saved.preview, label: saved.previewLabel })
    }
  }, [])

  async function generate() {
    if (!data.trim()) {
      setPreview(null)
      setError('Enter data to generate a barcode')
      return
    }
    let label = `${TYPE_LABELS[type]}: ${data}`
    let payload = data
    if (type === 'ean13') {
      if (!/^\d{12}$/.test(data)) {
        setPreview(null)
        setError('EAN-13 requires exactly 12 digits')
        return
      }
      payload = data + ean13CheckDigit(data)
      label = `EAN-13: ${payload}`
    }
    try {
      const image = encode(type, payload)
      const blob = await toPngBlob(image, type === 'qr' ? 4 : 6, type === 'qr' ? 4 : 4)
      const src = URL.createObjectURL(blob)
      setPreview({ src, label })
      setError('')
      host.saveState({ type, data, preview: src, previewLabel: label })
    } catch {
      setPreview(null)
      setError('Could not generate a barcode')
    }
  }

  async function download() {
    if (!preview) return
    const image = encode(type, preview.label.split(': ')[1] ?? '')
    const blob = await toPngBlob(image, type === 'qr' ? 8 : 10, 8)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barcode-${type}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main>
      <Card mono="Shelf">
        <Stack lg>
          <h1 className="lc-title lc-title-lg">Barcode Generator</h1>
          <Body>Choose a barcode type, enter data, and generate a preview you can download.</Body>
          <label className="lc-field">
            <span className="lc-field-label">Barcode type</span>
            <select
              className="lc-input"
              value={type}
              onChange={(event) => setType(event.target.value as BarcodeType)}
            >
              <option value="code128">Code 128</option>
              <option value="ean13">EAN-13</option>
              <option value="qr">QR Code</option>
            </select>
          </label>
          <TextInput label="Data" value={data} onChange={setData} rows={3} />
          {error && <Body sm style={{ color: 'var(--danger)' }}>{error}</Body>}
          <Stack>
            <Button kind="primary" onClick={() => void generate()}>Generate</Button>
            {preview && (
              <Button kind="secondary" onClick={() => void download()}>Download PNG</Button>
            )}
          </Stack>
          {preview ? (
            <div style={{ textAlign: 'center' }}>
              <img src={preview.src} alt={preview.label} style={{ maxWidth: '100%', height: 'auto' }} />
              <div className="lc-body-sm" style={{ marginTop: 'calc(8px * var(--sf))' }}>
                {preview.label}
              </div>
            </div>
          ) : (
            <EmptyState title="No barcode yet" detail="Enter data and press Generate." />
          )}
        </Stack>
      </Card>
    </main>
  )
}
