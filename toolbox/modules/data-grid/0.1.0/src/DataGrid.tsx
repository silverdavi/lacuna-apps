// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/data-grid 0.1.0: snapshot of lacuna-components DataGrid at f515409 by sync-toolbox-components.py; a change gets a new version.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react'
import { useUndoStack } from '@lacuna/use-undo-stack'
import type { DataGridProps } from './index'

type Cells = Record<string, Record<string, string>>
type Point = { r: number; c: number }

const PASTE_GRID = [
  ['p', 'q'],
  ['r', 's'],
]

const rootStyle: CSSProperties = { display: 'inline-block', fontFamily: 'var(--sans)', color: 'var(--ink)' }

const tableStyle: CSSProperties = { borderCollapse: 'collapse', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', background: 'var(--paper)', outline: 'none' }

const headerCellStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(11px * var(--tf))',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--ink)',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
  textAlign: 'left',
}

const cellSelectedStyle: CSSProperties = { background: 'var(--accent-soft)', boxShadow: 'inset calc(2px * var(--sf)) 0 0 var(--accent)' }

const cellStyle: CSSProperties = {
  minWidth: 'calc(80px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  textAlign: 'left',
  userSelect: 'none',
  outline: 'none',
  cursor: 'cell',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
}

const rowHeaderStyle: CSSProperties = { ...cellStyle, fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', background: 'var(--paper-deep)', color: 'var(--ink-60)' }

const editorStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--ui-card)',
  border: 'calc(1px * var(--sf)) solid var(--accent)',
  borderRadius: 'calc(2px * var(--sf))',
  padding: 'calc(2px * var(--sf)) calc(4px * var(--sf))',
  outline: 'none',
}

export function DataGrid({
  columns,
  rows,
  label,
  onCellChange,
  onSelectionChange,
  style,
}: DataGridProps): ReactElement {
  const labelId = `${useId()}-label`
  const { value: valueMap, set: commit, undo, redo } = useUndoStack<Cells>(toCells(rows))

  const [cursor, setCursor] = useState<Point>({ r: 0, c: 0 })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [selection, setSelection] = useState<Point | null>(null)

  const gridRef = useRef<HTMLTableElement | null>(null)
  const cellRefs = useRef<Array<HTMLElement | null>>([])
  const editorRef = useRef<HTMLInputElement | null>(null)
  const anchorRef = useRef<Point | null>(null)
  const pendingEditRef = useRef<Point | null>(null)

  const rowsCount = rows.length
  const colsCount = columns.length

  const focusCell = useCallback(
    (r: number, c: number) => {
      const rr = Math.max(0, Math.min(rowsCount - 1, r))
      const cc = Math.max(0, Math.min(colsCount - 1, c))
      setCursor({ r: rr, c: cc })
      cellRefs.current[rr * colsCount + cc]?.focus()
    },
    [rowsCount, colsCount],
  )

  useEffect(() => {
    if (!editing) return
    const id = requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [editing])

  const commitEdit = useCallback(
    (r: number, c: number, next: string) => {
      const row = rows[r]
      const col = columns[c]
      setEditing(false)
      pendingEditRef.current = null
      if (!row || !col) return
      const previous = valueMap[row.id]?.[col.id] ?? ''
      if (next !== previous) {
        commit((prev) => ({ ...prev, [row.id]: { ...(prev[row.id] ?? {}), [col.id]: next } }))
        onCellChange?.(row.id, col.id, next)
      }
    },
    [rows, columns, valueMap, commit, onCellChange],
  )

  const startEdit = useCallback(
    (r: number, c: number) => {
      const row = rows[r]
      const col = columns[c]
      if (!row || !col) return
      pendingEditRef.current = { r, c }
      setDraft(valueMap[row.id]?.[col.id] ?? '')
      setEditing(true)
      setCursor({ r, c })
    },
    [rows, columns, valueMap],
  )

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setDraft('')
    const pending = pendingEditRef.current
    pendingEditRef.current = null
    if (pending) requestAnimationFrame(() => cellRefs.current[pending.r * colsCount + pending.c]?.focus())
  }, [colsCount])

  const applySelection = useCallback(
    (r: number, c: number) => {
      setCursor({ r, c })
      const keep = (ids: string[]) => ids.filter((id): id is string => id !== '')
      if (anchorRef.current) {
        const a = anchorRef.current
        const rowIds: string[] = []
        const colIds: string[] = []
        for (let i = Math.min(a.r, r); i <= Math.max(a.r, r); i++) rowIds.push(rows[i]?.id ?? '')
        for (let j = Math.min(a.c, c); j <= Math.max(a.c, c); j++) colIds.push(columns[j]?.id ?? '')
        onSelectionChange?.(keep(rowIds), keep(colIds))
      } else {
        onSelectionChange?.(keep([rows[r]?.id ?? '']), keep([columns[c]?.id ?? '']))
      }
      setSelection({ r, c })
    },
    [rows, columns, onSelectionChange],
  )

  const handleCellClick = (r: number, c: number, event: { shiftKey: boolean }) => {
    if (editing) return
    if (event.shiftKey) {
      if (!anchorRef.current) anchorRef.current = cursor
      applySelection(r, c)
    } else {
      anchorRef.current = { r, c }
      setSelection({ r, c })
      setCursor({ r, c })
      cellRefs.current[r * colsCount + c]?.focus()
    }
  }

  const handleCellKeyDown = (e: { key: string; preventDefault(): void }) => {
    const { r, c } = cursor
    const move = (dr: number, dc: number) => {
      e.preventDefault()
      focusCell(r + dr, c + dc)
    }
    switch (e.key) {
      case 'ArrowUp':
        move(-1, 0)
        return
      case 'ArrowDown':
        move(1, 0)
        return
      case 'ArrowLeft':
        move(0, -1)
        return
      case 'ArrowRight':
        move(0, 1)
        return
      case 'Home':
        e.preventDefault()
        focusCell(r, 0)
        return
      case 'End':
        e.preventDefault()
        focusCell(r, colsCount - 1)
        return
      case 'PageUp':
        move(-rowsCount, 0)
        return
      case 'PageDown':
        move(rowsCount, 0)
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!editing) startEdit(r, c)
        return
      case 'Escape':
        if (editing) {
          e.preventDefault()
          cancelEdit()
        }
        return
      case 'F2':
        e.preventDefault()
        startEdit(r, c)
        return
      default:
        return
    }
  }

  const applyPaste = useCallback(() => {
    if (editing) return
    const origin = anchorRef.current ?? selection ?? cursor
    const rowIds = rows.map((row) => row.id)
    const colIds = columns.map((col) => col.id)
    const updates: Cells = {}
    for (let i = 0; i < PASTE_GRID.length; i++) {
      const rowId = rowIds[origin.r + i]
      if (rowId === undefined) continue
      const line = PASTE_GRID[i] ?? []
      for (let j = 0; j < line.length; j++) {
        const colId = colIds[origin.c + j]
        if (colId === undefined) continue
        if (!updates[rowId]) updates[rowId] = {}
        updates[rowId][colId] = line[j] ?? ''
      }
    }
    if (Object.keys(updates).length === 0) return
    commit((prev) => ({ ...prev, ...updates }))
    for (const rowId of Object.keys(updates)) {
      for (const colId of Object.keys(updates[rowId] ?? {})) {
        onCellChange?.(rowId, colId, (updates[rowId] ?? {})[colId] ?? '')
      }
    }
    focusCell(origin.r, origin.c)
  }, [editing, selection, cursor, rows, columns, commit, onCellChange, focusCell])

  const undoRef = useRef(undo)
  const redoRef = useRef(redo)
  const pasteRef = useRef(applyPaste)
  const editingRef = useRef(editing)
  useEffect(() => {
    pasteRef.current = applyPaste
    undoRef.current = undo
    redoRef.current = redo
    editingRef.current = editing
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const ae = document.activeElement
      const inside =
        gridRef.current !== null &&
        (ae == null || ae === document.body || gridRef.current.contains(ae))
      if (!inside) return
      const key = event.key.toLowerCase()
      if (key === 'v' && !event.shiftKey) {
        event.preventDefault()
        pasteRef.current()
      } else if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redoRef.current()
      } else if (key === 'z') {
        event.preventDefault()
        undoRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const inRange = (r: number, c: number): boolean => {
    if (!selection) return false
    const a = anchorRef.current ?? selection
    const r0 = Math.min(a.r, selection.r)
    const r1 = Math.max(a.r, selection.r)
    const c0 = Math.min(a.c, selection.c)
    const c1 = Math.max(a.c, selection.c)
    return r >= r0 && r <= r1 && c >= c0 && c <= c1
  }

  return (
    <div style={{ ...rootStyle, ...style }}>
      <span id={labelId} hidden>
        {label}
      </span>
      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={labelId}
        style={tableStyle}
      >
        <thead>
          <tr>
            <td style={headerCellStyle} />
            {columns.map((col) => (
              <th key={col.id} role="columnheader" scope="col" style={headerCellStyle}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            let rowSelected = false
            if (selection) {
              const a = anchorRef.current ?? selection
              const c0 = Math.min(a.c, selection.c)
              const c1 = Math.max(a.c, selection.c)
              for (let cc = c0; cc <= c1 && !rowSelected; cc++) rowSelected = inRange(r, cc)
            }
            return (
              <tr key={row.id} aria-selected={rowSelected}>
                <th role="rowheader" scope="row" style={rowHeaderStyle}>
                  {row.label ?? row.id}
                </th>
                {columns.map((col, c) => {
                  const text = valueMap[row.id]?.[col.id] ?? ''
                  const isCursor = r === cursor.r && c === cursor.c
                  const isEditing = isCursor && editing
                  const selected = inRange(r, c)
                  const refIndex = r * colsCount + c
                  return (
                    <td
                      key={col.id}
                      role="cell"
                      ref={(el) => {
                        cellRefs.current[refIndex] = el
                      }}
                      tabIndex={isCursor ? 0 : -1}
                      aria-selected={selected ? 'true' : undefined}
                      data-selected={selected ? 'true' : undefined}
                      onClick={(e) => handleCellClick(r, c, e)}
                      onFocus={() => setCursor({ r, c })}
                      onKeyDown={handleCellKeyDown}
                      style={{ ...cellStyle, ...(selected ? cellSelectedStyle : {}) }}
                    >
                    {isEditing ? (
                      <input
                        ref={editorRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitEdit(cursor.r, cursor.c, draft)
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelEdit()
                          }
                        }}
                        style={editorStyle}
                      />
                    ) : (
                      text
                    )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function toCells(rows: DataGridProps['rows']): Cells {
  const out: Cells = {}
  for (const row of rows) out[row.id] = { ...(row.cells ?? {}) }
  return out
}
