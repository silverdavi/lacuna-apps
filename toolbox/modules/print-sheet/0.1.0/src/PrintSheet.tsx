// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/print-sheet 0.1.0: snapshot of lacuna-components PrintSheet at 6188248 by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties, ReactNode } from 'react'

export type PaperSize = 'A4' | 'Letter'
export type SheetOrientation = 'portrait' | 'landscape'

export interface PrintSheetProps {
  /** Paper size. Default 'A4'. */
  size?: PaperSize
  /** Orientation. Default 'portrait'. */
  orientation?: SheetOrientation
  /** Number of pages to render (each page is a separate sheet). Default 1. */
  pages?: number
  /** Optional label grid: rows x columns of equal cells. Omit for full-page content. */
  labelGrid?: { rows: number; columns: number }
  /** Content to render inside each sheet. */
  children: ReactNode
  /** Additional CSS class name. */
  className?: string
  /** Accessible name of the container. Default 'Print sheet'. */
  'aria-label'?: string
}

const token = (n: number) => `calc(${n}px * var(--sf))`
const typeToken = (n: number) => `calc(${n}px * var(--tf))`

const containerStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: `1 * var(--hair-w) solid var(--hair)`,
  borderRadius: 'calc(4px * var(--sf))',
  padding: token(16),
  display: 'flex',
  flexDirection: 'column',
  gap: token(16),
  boxSizing: 'border-box',
  maxWidth: '100%',
}

const sheetStyle: CSSProperties = {
  background: 'var(--paper)',
  border: `1 * var(--hair-w) solid var(--hair-strong)`,
  borderRadius: 'calc(2px * var(--sf))',
  padding: token(16),
  boxSizing: 'border-box',
  minHeight: token(240),
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: token(8),
}

const cellStyle: CSSProperties = {
  border: `1 * var(--hair-w) solid var(--hair)`,
  borderRadius: 'calc(2px * var(--sf))',
  padding: token(8),
  boxSizing: 'border-box',
  minHeight: token(40),
  fontSize: typeToken(14),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function sheetDimensions(size: PaperSize, orientation: SheetOrientation): CSSProperties {
  const portrait = orientation === 'portrait'
  const isA4 = size === 'A4'
  const w = isA4 ? 210 : 216
  const h = isA4 ? 297 : 279
  return {
    width: token(portrait ? w : h),
    maxWidth: '100%',
    aspectRatio: `${w} / ${h}`,
  }
}

function buildPrintStyleTag(): string {
  return [
    '@media print {',
    '.print-sheet { border: 0 !important; border-radius: 0 !important; padding: 0 !important; background: var(--paper) !important; }',
    '.print-sheet__page { page-break-after: always; break-after: page; border: 0 !important; border-radius: 0 !important; }',
    '.print-sheet__page:last-child { page-break-after: auto; break-after: auto; }',
    '}',
  ].join('\n')
}

export function PrintSheet(props: PrintSheetProps) {
  const { size = 'A4', orientation = 'portrait', pages = 1, labelGrid, children, className } = props
  const ariaLabel = props['aria-label'] ?? 'Print sheet'
  const safePages = Math.max(0, Math.floor(pages))
  const classList = ['print-sheet', className].filter(Boolean).join(' ')

  const renderSheet = (page: number): ReactNode => {
    const dims = sheetDimensions(size, orientation)
    if (labelGrid && labelGrid.rows > 0 && labelGrid.columns > 0) {
      const rows: ReactNode[] = []
      for (let r = 0; r < labelGrid.rows; r++) {
        const cells: ReactNode[] = []
        for (let c = 0; c < labelGrid.columns; c++) {
          const idx = r * labelGrid.columns + c
          cells.push(
            <div key={idx} role="gridcell" style={cellStyle}>
              {children}
            </div>,
          )
        }
        rows.push(
          <div key={r} role="row" style={{ display: 'contents' }}>
            {cells}
          </div>,
        )
      }
      return (
        <div
          data-page={String(page)}
          data-size={size}
          data-orientation={orientation}
          className="print-sheet__page"
          role="grid"
          style={{ ...sheetStyle, ...dims, ...gridStyle, gridTemplateColumns: `repeat(${labelGrid.columns}, 1fr)` }}
        >
          {rows}
        </div>
      )
    }
    return (
      <div
        data-page={String(page)}
        data-size={size}
        data-orientation={orientation}
        className="print-sheet__page"
        style={{ ...sheetStyle, ...dims }}
      >
        {children}
      </div>
    )
  }

  const sheets: ReactNode[] = []
  for (let i = 0; i < safePages; i++) {
    const page = i + 1
    sheets.push(renderSheet(page))
  }

  return (
    <div
      role="document"
      aria-label={ariaLabel}
      data-size={size}
      data-orientation={orientation}
      className={classList}
      style={containerStyle}
    >
      <style>{buildPrintStyleTag()}</style>
      {sheets}
    </div>
  )
}
