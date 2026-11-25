import { useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  PrimaryButton,
  TextInput,
} from '@lacuna/ui'
import { createMockRecordStore } from '@lacuna/host-mock'

import { saveBlob } from '@lacuna/file-save-open'
import { buildPacketPdf } from './pdf'

type Receipt = {
  id: string
  label: string
  date: string
  amount: string
  mime: string
  base64: string
  rotation: number
}

const receiptStore = createMockRecordStore<Receipt>({
  key: 'receipt-packet.receipts.v1',
  validate: (v: unknown): v is Receipt =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Receipt).id === 'string' &&
    typeof (v as Receipt).label === 'string' &&
    typeof (v as Receipt).date === 'string' &&
    typeof (v as Receipt).amount === 'string' &&
    typeof (v as Receipt).mime === 'string' &&
    typeof (v as Receipt).base64 === 'string' &&
    typeof (v as Receipt).rotation === 'number',
})

function base64FromDataUrl(url: string): string {
  return url.split(',')[1] ?? ''
}

function dataUrl(r: Receipt): string {
  return `data:${r.mime};base64,${r.base64}`
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not decode image'))
    img.src = url
  })
}

export function App() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [receipts, setReceipts] = useState<Receipt[]>(() => receiptStore.list())
  const [status, setStatus] = useState('')
  const [crop, setCrop] = useState<{ id: string; width: string; height: string } | null>(null)

  function openPicker() {
    fileRef.current?.click()
  }

  const receiptsRef = useRef(receipts)

  function persist(next: Receipt[]) {
    receiptsRef.current = next
    receiptStore.replaceAll(next)
    setReceipts(next)
  }

  function addReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const label = `Receipt ${receiptsRef.current.length + 1}`
    const receipt: Receipt = {
      id: crypto.randomUUID(),
      label,
      date: '',
      amount: '',
      mime: file.type || 'image/png',
      base64: '',
      rotation: 0,
    }
    persist([...receiptsRef.current, receipt])
    setStatus(`${label} added.`)
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      patchReceipt(receipt.id, { base64: base64FromDataUrl(url) })
    }
    reader.readAsDataURL(file)
  }

  function patchReceipt(id: string, patch: Partial<Receipt>) {
    persist(receiptsRef.current.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function rotate(id: string) {
    persist(
      receiptsRef.current.map((r) =>
        r.id === id ? { ...r, rotation: (r.rotation + 90) % 360 } : r,
      ),
    )
  }

  async function applyCrop() {
    if (!crop) return
    const receipt = receipts.find((r) => r.id === crop.id)
    if (!receipt) return
    const w = Number(crop.width)
    const h = Number(crop.height)
    if (!w || !h || Number.isNaN(w) || Number.isNaN(h)) return
    try {
      const img = await loadImg(dataUrl(receipt))
      const sw = img.naturalWidth
      const sh = img.naturalHeight
      const cropW = Math.min(w, sw)
      const cropH = Math.min(h, sh)
      const sx = Math.max(0, Math.floor((sw - cropW) / 2))
      const sy = Math.max(0, Math.floor((sh - cropH) / 2))
      const canvas = document.createElement('canvas')
      canvas.width = cropW
      canvas.height = cropH
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH)
      const mime = receipt.mime === 'image/jpeg' ? 'image/jpeg' : 'image/png'
      const croppedUrl = canvas.toDataURL(mime)
      patchReceipt(receipt.id, {
        base64: base64FromDataUrl(croppedUrl),
        mime,
      })
      setStatus(`Cropped to ${cropW} × ${cropH}`)
      setCrop(null)
    } catch {
      setStatus('Crop failed: could not decode the receipt image.')
    }
  }

  function pdfName(): string {
    const firstDate = receipts.find((r) => r.date.trim())?.date.trim()
    return firstDate ? `Receipt Packet_${firstDate}.pdf` : 'Receipt Packet.pdf'
  }

  function buildPdf(): Uint8Array {
    return buildPacketPdf({
      title: 'Receipt Packet',
      rows: receipts.map((r) => ({ label: r.label, date: r.date, amount: r.amount })),
      images: receipts.map((r) => ({ dataUrl: dataUrl(r), mimeType: r.mime })),
    })
  }

  function download(name: string) {
    const bytes = buildPdf()
    saveBlob(
      new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: 'application/pdf' }),
      {
        filename: name,
        mimeType: 'application/pdf',
      },
    )
  }

  function generate() {
    if (receipts.length === 0) {
      setStatus('Add at least one receipt first.')
      return
    }
    const name = pdfName()
    download(name)
    setStatus(`Downloaded ${name}`)
  }

  async function sendToExpenses() {
    if (receipts.length === 0) return
    const name = pdfName()
    download(name)
    setStatus(`Sent to Expenses App: ${name}`)
    try {
      const bytes = buildPdf()
      const file = new File([new Uint8Array(bytes).buffer as ArrayBuffer], name, {
        type: 'application/pdf',
      })
      const share = navigator.share
      if (typeof share === 'function' && (await share({ files: [file], title: name }))) {
        return
      }
    } catch {
      // No chooser offered, user cancelled, or share unavailable: the PDF was
      // already saved, and the status line was already shown.
    }
  }

  const selected = crop ? receipts.find((r) => r.id === crop.id) : undefined

  return (
    <AppShell name="Receipt Packet" icon="invoice" hue="green" category="Finance" status={status}>
      <Card mono="Upload" title="Add receipts">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={addReceipt}
          aria-hidden="true"
          tabIndex={-1}
        />
        <FormGrid>
          <MonoLabel sm>Receipt photo (JPG or PNG)</MonoLabel>
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={openPicker}>Add Receipt</PrimaryButton>
        </Actions>
      </Card>

      <Card mono="List" title="Receipts">
        {receipts.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No receipts yet"
            detail="Upload a receipt photo to start your packet."
            actionLabel="Upload a receipt"
            onAction={openPicker}
          />
        ) : (
          <List label="Receipts">
            {receipts.map((r, i) => (
              <li
                key={r.id}
                className={`lk-row${crop?.id === r.id ? ' hot' : ''}`}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
                  <img
                    src={dataUrl(r)}
                    alt={`${r.label} thumbnail`}
                    data-rotation={r.rotation}
                    data-receipt-index={i + 1}
                     style={{
                       width: 'calc(72 * var(--sf))',
                       height: 'calc(72 * var(--sf))',
                       objectFit: 'contain',
                       borderRadius: 2,
                       background: 'var(--paper-deep)',
                     }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <MonoLabel sm accent>
                      {r.label}
                    </MonoLabel>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                      <TextInput
                        label="Date"
                        value={r.date}
                        onChange={(v) => patchReceipt(r.id, { date: v })}
                        type="date"
                      />
                      <TextInput
                        label="Amount"
                        value={r.amount}
                        onChange={(v) => patchReceipt(r.id, { amount: v })}
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button kind="ghost" ariaLabel={`Rotate ${r.label}`} onClick={() => rotate(r.id)}>
                      Rotate
                    </Button>
                    <Button
                      kind="ghost"
                      ariaLabel={`Crop ${r.label}`}
                      onClick={() => setCrop({ id: r.id, width: '100', height: '80' })}
                    >
                      Crop
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </List>
        )}
      </Card>

      {selected && crop && (
        <Card mono="Crop" title={`Crop ${selected.label}`} accent>
          <FormGrid>
            <TextInput
              label="Crop width"
              value={crop.width}
              onChange={(v) => setCrop({ ...crop, width: v })}
              inputMode="numeric"
              hint="Pixels"
            />
            <TextInput
              label="Crop height"
              value={crop.height}
              onChange={(v) => setCrop({ ...crop, height: v })}
              inputMode="numeric"
              hint="Pixels"
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={applyCrop}>Apply crop</PrimaryButton>
            <Button kind="ghost" onClick={() => setCrop(null)}>
              Cancel
            </Button>
          </Actions>
        </Card>
      )}

      <Card mono="Packet" title="Generate the PDF">
        <KpiRow>
          <Kpi value={String(receipts.length)} label="Receipts" accent />
          <Kpi value={pdfName()} label="File name" />
        </KpiRow>
        <Actions>
          <PrimaryButton onClick={generate} disabled={receipts.length === 0}>
            Generate PDF
          </PrimaryButton>
          <Button
            kind="ghost"
            ariaLabel="Send to Expenses App"
            onClick={sendToExpenses}
            disabled={receipts.length === 0}
          >
            Send to Expenses App
          </Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
