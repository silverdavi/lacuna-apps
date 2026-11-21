import { useEffect, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Rail, Select, Stack, TextInput } from '@lacuna/ui'
import { host } from './host'
import type { BarcodeType } from './host'
import { encode, toPngBlob, ean13CheckDigit } from './barcode'

const TYPE_LABELS: Record<BarcodeType, string> = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  qr: 'QR Code',
}

const TYPE_OPTIONS = [
  { value: 'code128', label: 'Code 128' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'qr', label: 'QR Code' },
]

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
    <AppShell
      name="Barcode Generator"
      icon="files"
      hue="blue"
      category="Productivity"
      meta="Code 128 · EAN-13 · QR"
      status="Saved on this device"
      side={<Rail title="Barcode Generator" note="Text to barcode · local" chips={['Code 128', 'EAN-13', 'QR Code', 'Works offline']} />}
    >
      <Card mono="Input" title="Create a barcode">
        <FormGrid>
          <Select
            label="Barcode type"
            value={type}
            onChange={(value) => setType(value as BarcodeType)}
            options={TYPE_OPTIONS}
          />
          <TextInput label="Data" value={data} onChange={setData} />
        </FormGrid>
        {error && (
          <div
            role="alert"
            style={{
              marginTop: 'calc(12px * var(--sf))',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(12px * var(--tf))',
              color: 'var(--danger)',
            }}
          >
            {error}
          </div>
        )}
        <Actions>
          <Button kind="primary" onClick={() => void generate()}>Generate</Button>
          {preview && (
            <Button kind="secondary" onClick={() => void download()}>Download PNG</Button>
          )}
        </Actions>
      </Card>
      <Card mono="Result" title="Preview">
        {preview ? (
          <Stack style={{ justifyContent: 'center', alignItems: 'center' }}>
            <img src={preview.src} alt={preview.label} style={{ maxWidth: '100%', height: 'auto' }} />
            <div>{preview.label}</div>
          </Stack>
        ) : (
          <EmptyState mono="Empty" title="No barcode yet" detail="Enter data and press Generate." />
        )}
      </Card>
    </AppShell>
  )
}
