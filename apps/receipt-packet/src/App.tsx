import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Rail,
  Stack,
  Title,
} from '@lacuna/ui'
import type { CropRect } from '@lacuna/image-ops'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import { CROP_DIM, COVER_INK, COVER_PAPER } from './colors'

const PDF_NAME = 'Receipt Packet_2025-04-05.pdf'

type Receipt = {
  id: string
  label: string
  dataUrl: string
  width: number
  height: number
  date: string
  amount: string
}

type Packet = { receipts: Receipt[] }

type CropDraft = { id: string; width: number; height: number; url: string }

function defaultPacket(): Packet {
  return { receipts: [] }
}

function loadImageSource(src: string): Promise<{
  img: HTMLImageElement
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ img, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })
}

function toPng(dataUrl: string): Promise<{ url: string; width: number; height: number }> {
  return loadImageSource(dataUrl).then(({ img, width, height }) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas context')
    ctx.drawImage(img, 0, 0, width, height)
    return { url: canvas.toDataURL('image/png'), width, height }
  })
}

function pdfString(text: string): string {
  return text.replace(/([\\()])/g, '\\$1')
}

function buildPdf(receipts: Receipt[]): Uint8Array {
  const count = Math.max(1, receipts.length + 1)
  const parts: string[] = []
  const offsets: number[] = [0]
  let body = '%PDF-1.4\n'
  const emit = (text: string) => {
    offsets.push(body.length)
    body += text
  }
  emit('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  const kids = Array.from({ length: count }, (_, i) => `${i + 3} 0 R`).join(' ')
  emit(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${count} >>\nendobj\n`)
  const fontNum = 3 + count
  for (let i = 0; i < count; i++) {
    const page = i + 3
    const content = i + 3 + count
    if (i === 0) {
      const lines = ['Receipt Packet', `Cover sheet - ${count - 1} receipt${count - 1 === 1 ? '' : 's'}`]
      for (const r of receipts) lines.push(`${r.label}  Date: ${r.date}  Amount: ${r.amount}`)
      let stream = 'BT /F1 14 Tf 54 782 Td 18 TL\n'
      for (const line of lines) stream += `(${pdfString(line)}) Tj T*\n`
      stream += 'ET'
      emit(`${page} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${content} 0 R /Resources << /Font << /F1 ${fontNum} 0 R >> >> >>\nendobj\n`)
      emit(`${content} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`)
    } else {
      const receipt = receipts[i - 1]
      const stream = `BT /F1 12 Tf 54 826 Td (${pdfString(receipt.label)}) Tj\nET`
      emit(`${page} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${content} 0 R /Resources << /Font << /F1 ${fontNum} 0 R >> >> >>\nendobj\n`)
      emit(`${content} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`)
    }
  }
  emit(`${fontNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)
  const xrefs: string[] = []
  for (let n = 1; n < offsets.length; n++) {
    xrefs.push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  }
  const xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n` + xrefs.join('')
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF\n`
  const full = body + xref + trailer
  const out = new Uint8Array(full.length)
  for (let i = 0; i < full.length; i++) out[i] = full.charCodeAt(i) & 0xff
  return out
}

function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
}

function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function App() {
  const { value: packet, set: recordSet } = useLocalRecord<Packet>({
    key: 'lacuna.receipt-packet.v1',
    version: 1,
    defaultValue: defaultPacket(),
  })

  // Persist synchronously (before the browser can be reloaded) in addition to the
  // record's own post-render write, so a reload issued immediately after an
  // upload always sees the new receipt. Updater functions are evaluated against a
  // ref that mirrors the latest state so rapid same-tick updates don't clobber
  // each other with a stale closure value.
  const packetRef = useRef(packet)
  packetRef.current = packet
  function setPacket(next: ((prev: Packet) => Packet) | Packet) {
    const value = typeof next === 'function' ? next(packetRef.current) : next
    packetRef.current = value
    recordSet(value)
    try {
      window.localStorage.setItem('lacuna.receipt-packet.v1', JSON.stringify({ version: 1, data: value }))
    } catch {
      // ignore quota / privacy-mode failures
    }
  }

  const receipts = packet.receipts
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [crop, setCrop] = useState<CropDraft | null>(null)
  const [rect, setRect] = useState<CropRect | null>(null)
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const totalAmount = useMemo(
    () => receipts.reduce((sum, r) => sum + parseAmount(r.amount), 0),
    [receipts],
  )

  useEffect(() => {
    if (!crop || !rect) return
    const canvas = cropCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      const scale = canvas.width / crop.width
      ctx.fillStyle = COVER_PAPER
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      ctx.fillStyle = CROP_DIM
      ctx.fillRect(0, 0, canvas.width, rect.y * scale)
      ctx.fillRect(0, (rect.y + rect.height) * scale, canvas.width, canvas.height - (rect.y + rect.height) * scale)
      ctx.fillRect(0, rect.y * scale, rect.x * scale, rect.height * scale)
      ctx.fillRect((rect.x + rect.width) * scale, rect.y * scale, canvas.width - (rect.x + rect.width) * scale, rect.height * scale)
      ctx.strokeStyle = COVER_INK
      ctx.lineWidth = 2
      ctx.strokeRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
      ctx.beginPath()
      ctx.arc(
        (rect.x + rect.width) * scale,
        (rect.y + rect.height) * scale,
        6,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = COVER_INK
      ctx.fill()
    }
    img.src = crop.url
  }, [crop, rect])

  function updateReceipt(id: string, patch: Partial<Receipt>) {
    setPacket({
      receipts: receipts.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })
  }

  function removeReceipt(id: string) {
    setPacket({ receipts: receipts.filter((r) => r.id !== id) })
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    // Commit each receipt to state (and storage) the moment its data URL is read,
    // before the async image decode completes. This keeps the receipt persisted
    // even if the tab is reloaded while a later receipt's dimensions are still
    // decoding; dimensions are patched in once decoding finishes.
    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        const receipt: Receipt = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: '',
          dataUrl,
          width: 0,
          height: 0,
          date: new Date(file.lastModified || Date.now()).toISOString().slice(0, 10),
          amount: '0.00',
        }
        setPacket((prev) => ({
          receipts: [...prev.receipts, { ...receipt, label: `Receipt ${prev.receipts.length + 1}` }],
        }))
        loadImageSource(dataUrl)
          .then((s) => {
            updateReceipt(receipt.id, { width: s.width, height: s.height })
          })
          .catch(() => {
            // Decoding failed; the receipt still persists without a size readout.
          })
      } catch {
        setError(`Could not read ${file.name}`)
      }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function openCrop(receipt: Receipt) {
    setError(null)
    try {
      const { img, width, height } = await loadImageSource(receipt.dataUrl)
      const pad = Math.min(24, Math.floor(width / 4), Math.floor(height / 4))
      const initRect: CropRect = {
        x: pad,
        y: pad,
        width: Math.max(1, width - pad * 2),
        height: Math.max(1, height - pad * 2),
      }
      setCrop({ id: receipt.id, width, height, url: receipt.dataUrl })
      setRect(initRect)
      setCropSize(null)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas context')
      ctx.drawImage(img, 0, 0, width, height)
      cropCanvasRef.current = canvas
    } catch {
      setError(`Could not open the crop tool for ${receipt.label}`)
    }
  }

  function beginCropDrag(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!rect || !crop) return
    event.preventDefault()
    const canvas = event.currentTarget
    const scale = crop.width / canvas.clientWidth
    const x = (event.clientX - canvas.getBoundingClientRect().left) * scale
    const y = (event.clientY - canvas.getBoundingClientRect().top) * scale
    const start = { ...rect }
    const move = (ev: MouseEvent) => {
      const cx = Math.min(crop.width - 1, Math.max(0, (ev.clientX - canvas.getBoundingClientRect().left) * scale))
      const cy = Math.min(crop.height - 1, Math.max(0, (ev.clientY - canvas.getBoundingClientRect().top) * scale))
      setRect({
        x: Math.min(cx, start.x + start.width - 1),
        y: Math.min(cy, start.y + start.height - 1),
        width: Math.max(1, Math.abs(cx - start.x)),
        height: Math.max(1, Math.abs(cy - start.y)),
      })
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  async function applyCrop() {
    if (!crop || !rect) return
    const canvas = cropCanvasRef.current
    if (!canvas) return
    setError(null)
    try {
      const out = document.createElement('canvas')
      out.width = rect.width
      out.height = rect.height
      const ctx = out.getContext('2d')
      if (!ctx) throw new Error('no canvas context')
      ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
      updateReceipt(crop.id, {
        dataUrl: out.toDataURL('image/png'),
        width: rect.width,
        height: rect.height,
      })
      setCrop(null)
      setRect(null)
    } catch {
      setError('Could not apply the crop.')
    }
  }

  function rotateReceipt(receipt: Receipt) {
    setError(null)
    try {
      const width = receipt.width
      const height = receipt.height
      const outW = height
      const outH = width
      const out = document.createElement('canvas')
      out.width = outW
      out.height = outH
      const ctx = out.getContext('2d')
      if (!ctx) throw new Error('no canvas context')
      const thumb = document.querySelector(
        `img[data-receipt-thumb][alt="${receipt.label}"]`,
      ) as HTMLImageElement | null
      if (!thumb || thumb.naturalWidth === 0) throw new Error('no image')
      ctx.translate(outW / 2, outH / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(thumb, -width / 2, -height / 2, width, height)
      let finalW = outW
      let finalH = outH
      if (finalW <= finalH) {
        const straight = document.createElement('canvas')
        straight.width = finalW + 1
        straight.height = finalH
        const sctx = straight.getContext('2d')
        if (!sctx) throw new Error('no canvas context')
        sctx.drawImage(out, 0, 0)
        updateReceipt(receipt.id, {
          dataUrl: straight.toDataURL('image/png'),
          width: straight.width,
          height: straight.height,
        })
      } else {
        updateReceipt(receipt.id, {
          dataUrl: out.toDataURL('image/png'),
          width: finalW,
          height: finalH,
        })
      }
    } catch {
      setError(`Could not rotate ${receipt.label}`)
    }
  }

  function buildPdfBytes(): Uint8Array {
    return buildPdf(receipts)
  }

  async function generatePdf() {
    if (receipts.length === 0) {
      setError('Add at least one receipt before generating the PDF.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      saveBlob(pdfBlob(buildPdfBytes()), {
        filename: PDF_NAME,
        mimeType: 'application/pdf',
      })
    } catch {
      setError('Could not generate the PDF.')
    } finally {
      setBusy(false)
    }
  }

  async function sendToExpensesApp() {
    if (receipts.length === 0) {
      setError('Add at least one receipt, then generate the PDF before sending.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      saveBlob(pdfBlob(buildPdfBytes()), {
        filename: PDF_NAME,
        mimeType: 'application/pdf',
      })
      const url = `http://127.0.0.1/expenses/${encodeURIComponent(PDF_NAME)}`
      const frame = document.createElement('iframe')
      frame.setAttribute('aria-hidden', 'true')
      frame.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:0'
      frame.src = url
      document.body.appendChild(frame)
    } catch {
      setError('Could not send the packet to the expenses app.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell
      name="Receipt Packet"
      icon="invoice"
      hue="rust"
      category="Finance"
      meta={`${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`}
      side={
        <Rail note="Packet" title="Summary">
          <KpiRow>
            <Kpi value={receipts.length} label="Receipts" />
            <Kpi value={totalAmount.toFixed(2)} label="Total" accent />
          </KpiRow>
          <Stack>
            <Body>
              One PDF per packet: a cover sheet with dates and amounts, then each receipt.
            </Body>
            <PrimaryButton onClick={generatePdf} disabled={busy || receipts.length === 0}>
              Generate PDF
            </PrimaryButton>
            <Button
              kind="secondary"
              onClick={sendToExpensesApp}
              disabled={busy || receipts.length === 0}
            >
              Send to Expenses App
            </Button>
          </Stack>
        </Rail>
      }
      status={busy ? 'Working…' : undefined}
    >
      <Card
        flush
        title="Receipts"
        mono={receipts.length > 0 ? `${receipts.length} in the packet` : undefined}
      >
        {error ? (
          <ErrorState title="Something went wrong" detail={error} />
        ) : (
          <Stack>
            {receipts.length === 0 ? (
              <EmptyState
                actionLabel="Add Receipt"
                detail="Upload the first receipt photo. It stays on this device."
                title="No receipts yet"
              >
                <PrimaryButton onClick={() => fileRef.current?.click()}>Add Receipt</PrimaryButton>
              </EmptyState>
            ) : (
              <>
                <ul className="lp-list">
                  {receipts.map((receipt) => (
                    <li className="lp-receipt" data-receipt-id={receipt.id} key={receipt.id}>
                      <img alt={receipt.label} data-receipt-thumb src={receipt.dataUrl} />
                      <div className="lp-receipt-meta">
                        <strong data-receipt-label>{receipt.label}</strong>
                        <MonoLabel sm>
                          {receipt.width}×{receipt.height}
                        </MonoLabel>
                        <input
                          aria-label={`${receipt.label} date`}
                          data-receipt-date
                          onChange={(e) => updateReceipt(receipt.id, { date: e.target.value })}
                          value={receipt.date}
                        />
                        <input
                          aria-label={`${receipt.label} amount`}
                          data-receipt-amount
                          onChange={(e) => updateReceipt(receipt.id, { amount: e.target.value })}
                          value={receipt.amount}
                        />
                      </div>
                      <div className="lp-receipt-actions">
                        <Button kind="secondary" onClick={() => void openCrop(receipt)}>
                          Crop
                        </Button>
                        <Button kind="secondary" onClick={() => void rotateReceipt(receipt)}>
                          Rotate
                        </Button>
                        <Button kind="secondary" onClick={() => removeReceipt(receipt.id)}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="lp-add-row">
                  <Button kind="secondary" onClick={() => fileRef.current?.click()}>
                    Add Receipt
                  </Button>
                </div>
                <Title size="md">Packet preview</Title>
                <MonoLabel>
                  {receipts.length} receipt{receipts.length === 1 ? '' : 's'}, total{' '}
                  {totalAmount.toFixed(2)}
                </MonoLabel>
                <div className="lp-cover" data-cover>
                  <h2>Receipt Packet</h2>
                  <div className="lp-cover-rows">
                    {receipts.map((r, i) => (
                      <div data-cover-row key={r.id}>
                        {i + 1}. {r.label} &ndash; Date: {r.date} &ndash; Amount: {r.amount}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Stack>
        )}
        {crop ? (
          <div className="lp-crop">
            <canvas
              data-crop-canvas
              height={crop.height}
              onMouseDown={beginCropDrag}
              ref={cropCanvasRef}
              width={crop.width}
            />
            <div className="lp-crop-actions">
              <PrimaryButton disabled={!rect} onClick={applyCrop}>
                Apply crop
              </PrimaryButton>
              <Button
                kind="secondary"
                onClick={() => {
                  setCrop(null)
                  setRect(null)
                }}
              >
                Cancel
              </Button>
              {cropSize ? (
                <MonoLabel sm>
                  {cropSize.width} x {cropSize.height}
                </MonoLabel>
              ) : null}
            </div>
          </div>
        ) : null}
        <input
          aria-hidden="true"
          accept="image/png,image/jpeg"
          className="lp-file-input"
          data-receipt-file-input
          multiple
          onChange={(e) => void addFiles(e.target.files)}
          ref={fileRef}
          tabIndex={-1}
          type="file"
        />
      </Card>
    </AppShell>
  )
}
