import { useMemo, type CSSProperties } from 'react'
import type { RecipeData } from '../host'

type Row = RecipeData & { id: string }
type SortKey = 'name' | 'servings'
type SortDir = 'asc' | 'desc'

const gap = 'calc(4px * var(--sf))'
const pad = 'calc(8px * var(--sf))'

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
}

const cellStyle: CSSProperties = {
  padding: pad,
  textAlign: 'left',
  borderBottom: `calc(1px * var(--sf)) solid var(--hair)`,
  verticalAlign: 'top',
}

const headerCellStyle: CSSProperties = {
  padding: pad,
  textAlign: 'left',
  borderBottom: `calc(1px * var(--sf)) solid var(--hair-strong)`,
  fontWeight: 600,
  color: 'var(--ink-80)',
}

const sortableHeaderStyle: CSSProperties = {
  ...headerCellStyle,
  cursor: 'pointer',
  userSelect: 'none',
}

const actionStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
  background: 'transparent',
  border: `calc(1px * var(--sf)) solid var(--hair-strong)`,
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))',
  cursor: 'pointer',
}

const actionDangerStyle: CSSProperties = {
  ...actionStyle,
  color: 'var(--danger)',
}

const tagStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink-60)',
}

function compareRows(a: Row, b: Row, key: SortKey, dir: SortDir): number {
  let result: number
  if (key === 'servings') {
    const na = Number(a.servings)
    const nb = Number(b.servings)
    const va = Number.isNaN(na) ? 0 : na
    const vb = Number.isNaN(nb) ? 0 : nb
    result = va - vb
  } else {
    result = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  }
  return dir === 'asc' ? result : -result
}

export interface RecipeTableProps {
  rows: Row[]
  sortKeys: string[]
  onSort: (keys: string[]) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function RecipeTable({
  rows,
  sortKeys,
  onSort,
  onEdit,
  onDelete,
}: RecipeTableProps): React.ReactElement {
  const activeKey = sortKeys[0] as SortKey | undefined
  const activeDir: SortDir =
    activeKey === 'name' || activeKey === 'servings'
      ? (sortKeys[1] as SortDir | undefined) === 'desc'
        ? 'desc'
        : 'asc'
      : 'asc'

  const displayed = useMemo(() => {
    if (activeKey !== 'name' && activeKey !== 'servings') return rows
    return [...rows].sort((a, b) => compareRows(a, b, activeKey, activeDir))
  }, [rows, activeKey, activeDir])

  const arrow = activeDir === 'asc' ? ' \u2191' : ' \u2193'

  function toggleSort(key: SortKey) {
    if (activeKey === key) {
      onSort([key, activeDir === 'asc' ? 'desc' : 'asc'])
    } else {
      onSort([key, 'asc'])
    }
  }

  const columns: Array<{
    key: string
    header: string
    sortable: boolean
  }> = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'servings', header: 'Servings', sortable: true },
    { key: 'tags', header: 'Tags', sortable: false },
    { key: 'notes', header: 'Notes', sortable: false },
    { key: 'actions', header: '', sortable: false },
  ]

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              style={c.sortable ? sortableHeaderStyle : headerCellStyle}
              aria-sort={
                c.sortable && activeKey === c.key
                  ? activeDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              }
              onClick={
                c.sortable
                  ? () => toggleSort(c.key as SortKey)
                  : undefined
              }
            >
              <span>{c.header}</span>
              {c.sortable && activeKey === c.key ? arrow : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayed.map((r) => (
          <tr key={r.id}>
            <td style={cellStyle}>{r.name}</td>
            <td style={cellStyle}>{r.servings}</td>
            <td style={cellStyle}>
              {r.tags.length > 0 ? (
                <span style={tagStyle}>{r.tags.join(', ')}</span>
              ) : (
                <span style={tagStyle}>&mdash;</span>
              )}
            </td>
            <td style={cellStyle}>
              {r.notes ? r.notes : <span style={tagStyle}>&mdash;</span>}
            </td>
            <td style={{ ...cellStyle, whiteSpace: 'nowrap', textAlign: 'right' }}>
              <div style={{ display: 'flex', gap, justifyContent: 'flex-end' }}>
                <button type="button" style={actionStyle} onClick={() => onEdit(r.id)}>
                  Edit {r.name}
                </button>
                <button type="button" style={actionDangerStyle} onClick={() => onDelete(r.id)}>
                  Delete {r.name}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
