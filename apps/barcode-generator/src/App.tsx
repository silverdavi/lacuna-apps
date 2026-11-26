import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  List,
  Rail,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { saveBlob } from '@lacuna/file-save-open'
import { encode, ean13CheckDigit, toPngBlob, type BarcodeImage, type BarcodeType } from './barcode'

const STORAGE_KEY = 'lacuna.barcode-generator.state'

interface HistoryEntry {
  id: string
  type: BarcodeType
  data: string
  label: string
}

interface PersistedState {
  type: BarcodeType
  data: string
  label: string
}

const EMPTY_PERSISTED: PersistedState = { type: 'code128', data: '', label: '' }

const TYPE_OPTIONS = [
  { value: 'code128', label: 'Code 128' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'qr', label: 'QR Code' },
]

const TYPE_NAMES: Record<BarcodeType, string> = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  qr: 'QR Code',
}

const SCALE_OPTIONS: string[] = ['1x', '2x', '3x', '4x']

function scaleNum(s: string): number {
  return Number(s[0]) || 2
}

function effectiveDataFor(type: BarcodeType, data: string): string {
  if (type === 'ean13' && data.length === 12) {
    return data + ean13CheckDigit(data)
  }
  return data
}

function previewLabelFor(type: BarcodeType, data: string): string {
  if (type === 'ean13') {
    return `EAN-13: ${effectiveDataFor(type, data)}`
  }
  return `${TYPE_NAMES[type]}: ${data}`
}

const TYPES: BarcodeType[] = ['code128', 'ean13', 'qr']

function isLegacyState(v: unknown): boolean {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const s = v as Record<string, unknown>
  return TYPES.includes(s.type as BarcodeType) && typeof s.data === 'string'
}

function migrateLegacy(data: unknown): PersistedState {
  if (isLegacyState(data)) {
    const s = data as Record<string, unknown>
    return {
      type: s.type as BarcodeType,
      data: s.data as string,
      label: typeof s.previewLabel === 'string' ? s.previewLabel : '',
    }
  }
  return EMPTY_PERSISTED
}

function buildPreview(type: BarcodeType, data: string, label: string) {
  try {
    const effData = effectiveDataFor(type, data)
    const img = encode(type, effData)
    return { type, data, label, img }
  } catch {
    return null
  }
}

export function App() {
  const [type, setType] = useState<BarcodeType>('code128')
  const [data, setData] = useState('')
  const [scale, setScale] = useState('2x')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReturnType<typeof buildPreview>>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const clipboard = useClipboard({
    onError: () => setError('Clipboard copy failed'),
  })

  const { value: saved, set: setSaved } = useLocalRecord<PersistedState>({
    key: STORAGE_KEY,
    version: 1,
    defaultValue: EMPTY_PERSISTED,
    migrations: { 0: migrateLegacy },
  })

  useEffect(() => {
    if (saved.data) {
      const p = buildPreview(saved.type, saved.data, saved.label)
      if (p) {
        setType(p.type)
        setData(p.data)
        setPreview(p)
        return
      }
    }
    setSaved(EMPTY_PERSISTED)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    if (!preview?.img) {
      blobRef.current = null
      setImgSrc(null)
      return () => { cancelled = true }
    }
    void (async () => {
      const blob = await toPngBlob(preview.img, scaleNum(scale))
      if (cancelled) return
      blobRef.current = blob
      url = URL.createObjectURL(blob)
      setImgSrc(url)
    })()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      blobRef.current = null
    }
  }, [preview?.img, scale])

  const generate = useCallback(async () => {
    setError(null)
    const trimmed = data.trim()
    if (!trimmed) {
      setError('Enter data to generate a barcode')
      setPreview(null)
      return
    }

    try {
      if (type === 'ean13') {
        if (!/^\d+$/.test(trimmed)) {
          setError('EAN-13 requires digits only')
          setPreview(null)
          return
        }
        if (trimmed.length === 13) {
          setError('EAN-13 requires exactly 12 digits')
          setPreview(null)
          return
        }
        if (trimmed.length !== 12) {
          setError(`EAN-13 requires exactly 12 digits (got ${trimmed.length})`)
          setPreview(null)
          return
        }
      }

      const effData = effectiveDataFor(type, trimmed)
      const label = previewLabelFor(type, trimmed)
      const img = encode(type, effData)
      setPreview({ type, data: trimmed, label, img })
      setSaved({ type, data: trimmed, label })
      setHistory((h) => {
        const entry: HistoryEntry = {
          type,
          data: trimmed,
          label,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }
        const rest = h.filter((e) => !(e.type === type && e.data === trimmed))
        return [entry, ...rest].slice(0, 8)
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to encode'
      setError(msg)
      setPreview(null)
    }
  }, [type, data, setSaved])

  const downloadPng = useCallback(() => {
    const blob = blobRef.current
    if (!blob || !preview) return
    const filename = `barcode-${preview.type}-${preview.data.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`
    saveBlob(blob, { filename, mimeType: 'image/png' })
  }, [preview])

  const copyToClipboard = useCallback(async () => {
    const blob = blobRef.current
    if (!blob) return
    try {
      await clipboard.copy(blob)
    } catch {
      // error handled by onError callback
    }
  }, [clipboard])

  const removeFromHistory = useCallback((id: string) => {
    setHistory((h) => h.filter((e) => e.id !== id))
  }, [])

  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    setType(entry.type)
    setData(entry.data)
    setError(null)
    const p = buildPreview(entry.type, entry.data, entry.label)
    if (p) {
      setPreview(p)
      setSaved({ type: entry.type, data: entry.data, label: entry.label })
    } else {
      setError('Failed to restore')
    }
  }, [setSaved])

  const hasPreview = preview != null && preview.img != null

  return (
    <AppShell
      name="Barcode Generator"
      icon="files"
      hue="blue"
      category="Productivity"
      meta={hasPreview ? 'Code generated' : 'Ready'}
      status={hasPreview ? 'Saved on this device' : 'Local · no network'}
      side={
        <Rail
          title="Barcode Generator"
          note="Three formats · local"
          chips={['Code 128', 'EAN-13', 'QR Code']}
        >
          <Card mono="Output" title="Image settings">
            <FormGrid>
              <Select
                label="Scale"
                value={scale}
                onChange={(v) => setScale(v)}
                options={SCALE_OPTIONS}
              />
            </FormGrid>
          </Card>
        </Rail>
      }
    >
      <Card mono="Input" title="Barcode settings">
        <FormGrid>
          <Select
            label="Barcode type"
            value={type}
            onChange={(v) => setType(v as BarcodeType)}
            options={TYPE_OPTIONS}
          />
          <TextInput
            label="Data"
            value={data}
            onChange={setData}
            placeholder={
              type === 'ean13'
                ? '12-digit product number, e.g. 123456789012'
                : 'Text to encode'
            }
            hint={type === 'ean13' ? 'Check digit is computed automatically' : undefined}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={() => void generate()}>Generate</Button>
        </Actions>
      </Card>

      <Card
        mono={hasPreview ? 'Preview' : 'No output'}
        title="Result"
        actions={
          hasPreview ? (
            <Actions>
              <Button onClick={() => void copyToClipboard()}>{clipboard.copied ? 'Copied' : 'Copy'}</Button>
              <Button onClick={downloadPng}>Download PNG</Button>
            </Actions>
          ) : undefined
        }
      >
        {error ? (
          <ErrorState title={error} mono="Validation" />
        ) : hasPreview && imgSrc && preview ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
              background: 'var(--paper)',
              padding: 'calc(12px * var(--sf))',
              gap: 'calc(6px * var(--sf))',
            }}
          >
            <img
              src={imgSrc}
              alt={preview.label}
              style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
            />
            <span style={{ fontFamily: 'var(--mono)' }}>{preview.label}</span>
          </div>
        ) : (
          <EmptyState
            mono="Waiting"
            title="No barcode yet"
            detail="Choose a type, enter data, and press Generate."
          />
        )}
      </Card>

      <Card
        mono={`${history.length} recent`}
        title="History"
        actions={history.length > 0 ? <Button kind="ghost" onClick={() => setHistory([])}>Clear</Button> : undefined}
      >
        {history.length === 0 ? (
          <EmptyState mono="Empty" title="No recent barcodes" detail="Generated barcodes appear here for quick re-use." />
        ) : (
          <List label="History">
            {history.map((entry) => (
              <Row
                key={entry.id}
                title={entry.data}
                meta={TYPE_NAMES[entry.type]}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Remove ${entry.data}`}
                    onClick={() => removeFromHistory(entry.id)}
                  >
                    Remove
                  </Button>
                }
                onClick={() => restoreFromHistory(entry)}
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
