// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { Result } from '@lacuna/formats'
import type { Viewer } from '@lacuna/preview'
import type { PdfHandle } from './engine'

export type { PdfHandle, PdfPageSize } from './engine'

/** Open a PDF for page rendering. Loads pdf.js on first call. */
export async function openPdf(bytes: Uint8Array, opts?: { signal?: AbortSignal }): Promise<Result<PdfHandle>> {
  const engine = await import('./engine')
  return engine.openPdf(bytes, opts)
}

/** FilePreview viewer: every page drawn to a canvas as it scrolls into view. Links and scripts in the PDF are inert. */
export const pdfViewer: Viewer<PdfHandle> = {
  id: 'lacuna.pdf.preview',
  label: 'PDF viewer',
  formats: ['pdf'],
  maxBytes: 100 * 1024 * 1024,
  load: () => import('./view').then((m) => m.pdfView),
}
