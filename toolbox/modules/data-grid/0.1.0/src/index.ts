// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/data-grid 0.1.0: snapshot of lacuna-components DataGrid at f515409 by sync-toolbox-components.py; a change gets a new version.
export { DataGrid } from './DataGrid'

export type DataGridCellType = 'text' | 'number'

export interface DataGridColumn {
  id: string
  header: string
  type: DataGridCellType
}

export interface DataGridRow {
  id: string
  label?: string
  cells: Record<string, string>
}

export interface DataGridProps {
  columns: DataGridColumn[]
  rows: DataGridRow[]
  /** Accessible name for the grid region. */
  label: string
  /** Called with the committed value when a single cell is edited. */
  onCellChange?: (rowId: string, columnId: string, value: string) => void
  /** Called with the selected row and column ids after a range selection. */
  onSelectionChange?: (rowIds: string[], columnIds: string[]) => void
  style?: import('react').CSSProperties
}
