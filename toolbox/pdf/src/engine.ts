// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// pdf.js behind a small handle. This file is only reached through dynamic
// import, so pdf.js (and its worker, a separate asset) load when a PDF opens.
import { FormatError, type ConversionWarning, type Result } from '@lacuna/formats'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export interface PdfPageSize {
  /** PDF points at scale 1 (1/72 inch). */
  width: number
  height: number
}

export interface PdfHandle {
  pageCount: number
  pageSize(pageNumber: number): Promise<PdfPageSize>
  /** Draw a page into `canvas` at `cssWidth` CSS pixels wide (sharp on high-DPI screens). Resolves when drawn; rejects if cancelled. */
  renderPage(pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): { promise: Promise<void>; cancel(): void }
  destroy(): void
}

// Decoded images above this many pixels are skipped rather than exhausting memory.
const MAX_IMAGE_PIXELS = 40_000_000

export async function openPdf(bytes: Uint8Array, opts?: { signal?: AbortSignal }): Promise<Result<PdfHandle>> {
  // pdf.js transfers the buffer to its worker; hand it a copy so the caller's bytes stay usable.
  const task = getDocument({ data: bytes.slice(), maxImageSize: MAX_IMAGE_PIXELS, enableXfa: false, stopAtErrors: false })
  opts?.signal?.addEventListener('abort', () => { void task.destroy() }, { once: true })
  let doc: PDFDocumentProxy
  try {
    doc = await task.promise
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'PasswordException') throw new FormatError('encrypted', 'This PDF needs a password. Opening protected PDFs is not supported yet.', { cause: e })
    throw new FormatError('corrupt', 'This PDF could not be read. It may be damaged or incomplete.', { cause: e })
  }

  const warnings: ConversionWarning[] = []
  const [scripts, fields] = await Promise.all([
    doc.getJSActions().catch(() => null),
    doc.getFieldObjects().catch(() => null),
  ])
  const count = (x: unknown) => (x instanceof Map ? x.size : x && typeof x === 'object' ? Object.keys(x).length : 0)
  if (count(scripts)) warnings.push({ code: 'scripts-ignored', message: 'This PDF contains scripts. They are not run.' })
  if (count(fields)) warnings.push({ code: 'form-fields', message: `This PDF has ${count(fields)} form fields. They are shown as printed; filling them is not supported yet.` })

  const sizes = new Map<number, PdfPageSize>()
  const handle: PdfHandle = {
    pageCount: doc.numPages,
    async pageSize(n) {
      const hit = sizes.get(n)
      if (hit) return hit
      const page = await doc.getPage(n)
      const vp = page.getViewport({ scale: 1 })
      const size = { width: vp.width, height: vp.height }
      sizes.set(n, size)
      return size
    },
    renderPage(n, canvas, cssWidth) {
      let job: RenderTask | null = null
      let cancelled = false
      const promise = (async () => {
        const page = await doc.getPage(n)
        if (cancelled) throw new Error('cancelled')
        const base = page.getViewport({ scale: 1 })
        const dpr = Math.min(2, globalThis.devicePixelRatio || 1)
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        job = page.render({ canvas, viewport })
        await job.promise
      })()
      return { promise, cancel: () => { cancelled = true; job?.cancel() } }
    },
    destroy() { void task.destroy() },
  }
  return { output: handle, warnings }
}
