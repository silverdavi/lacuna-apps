// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import { useEffect, useRef, useState } from 'react'
import type { ViewerImpl } from '@lacuna/preview'
import { openPdf, type PdfHandle, type PdfPageSize } from './engine'

const PAGE_CSS_WIDTH = 720

function Page({ pdf, n, fallback }: { pdf: PdfHandle; n: number; fallback: PdfPageSize }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<PdfPageSize>(fallback)
  const [state, setState] = useState<'waiting' | 'rendered' | 'failed'>('waiting')

  useEffect(() => {
    let alive = true
    pdf.pageSize(n).then((s) => { if (alive) setSize(s) }, () => {})
    return () => { alive = false }
  }, [pdf, n])

  useEffect(() => {
    const el = box.current
    const c = canvas.current
    if (!el || !c) return
    let job: { cancel(): void } | null = null
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || job) return
      io.disconnect()
      const width = Math.min(PAGE_CSS_WIDTH, el.clientWidth || PAGE_CSS_WIDTH)
      const r = pdf.renderPage(n, c, width)
      job = r
      r.promise.then(() => setState('rendered'), (e: unknown) => {
        if (e instanceof Error && /cancel/i.test(e.message + e.name)) return
        setState('failed')
      })
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => { io.disconnect(); job?.cancel() }
  }, [pdf, n])

  return (
    <div
      ref={box}
      className="lc-fp-page"
      data-testid="pdf-page"
      data-page={n}
      data-rendered={state}
      style={{ width: PAGE_CSS_WIDTH, aspectRatio: `${size.width} / ${size.height}` }}
    >
      <canvas ref={canvas} aria-label={`Page ${n}`} />
      <span className="lc-fp-page-no">{state === 'failed' ? `PAGE ${n} · COULD NOT DRAW` : `PAGE ${n}`}</span>
    </div>
  )
}

function PdfPages({ data }: { data: PdfHandle }) {
  const [first, setFirst] = useState<PdfPageSize>({ width: 612, height: 792 })
  useEffect(() => { data.pageSize(1).then(setFirst, () => {}) }, [data])
  return (
    <div className="lc-fp-pdf" data-testid="preview-pdf" data-pages={data.pageCount}>
      {Array.from({ length: data.pageCount }, (_, i) => <Page key={i + 1} pdf={data} n={i + 1} fallback={first} />)}
    </div>
  )
}

export const pdfView: ViewerImpl<PdfHandle> = {
  prepare: (file, signal) => openPdf(file.bytes, { signal }),
  View: PdfPages,
  dispose: (pdf) => pdf.destroy(),
}
