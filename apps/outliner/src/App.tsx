import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  MonoLabel,
  PrimaryButton,
} from '@lacuna/ui'
import type { OutlineItem } from './host/mock'
import { outlineStore } from './host/mock'
import './app.css'

type Row = {
  id: string
  text: string
  level: number
  collapsed: boolean
  hasChildren: boolean
}

export function App() {
  const [items, setItems] = useState<OutlineItem[]>(() => outlineStore.list())
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const itemRefs = useRef(new Map<string, HTMLInputElement>())
  const touched = useRef(new Set<string>())
  const treeRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items],
  )

  function item(key: string): OutlineItem | undefined {
    return items.find((i) => i.id === key)
  }

  function hasChildrenOf(key: string): boolean {
    const cur = item(key)
    if (!cur) return false
    const idx = sorted.findIndex((i) => i.id === key)
    for (let i = idx + 1; i < sorted.length; i++) {
      if (sorted[i].level <= cur.level) return false
      return true
    }
    return false
  }

  const rows = useMemo(() => {
    const out: Row[] = []
    let hiddenLevel = -1
    for (const it of sorted) {
      if (hiddenLevel !== -1 && it.level > hiddenLevel) continue
      hiddenLevel = -1
      const isCollapsed = collapsed.has(it.id)
      out.push({
        id: it.id,
        text: it.text,
        level: it.level,
        collapsed: isCollapsed,
        hasChildren: hasChildrenOf(it.id),
      })
      if (isCollapsed) hiddenLevel = it.level
    }
    return out
  }, [sorted, collapsed])

  function commit(next: OutlineItem[]) {
    setItems(next)
    outlineStore.replaceAll(next)
  }

  function addItem() {
    if (editing !== null) {
      const text = editValue.trim() || 'New item'
      const cur = item(editing)
      if (cur && cur.text !== text) {
        commit(items.map((i) => (i.id === editing ? { ...i, text } : i)))
      }
      setEditing(null)
    }
    const lastItem = sorted[sorted.length - 1]
    const level = lastItem ? lastItem.level : 0
    const record = outlineStore.add({
      text: 'New item',
      level,
      order: items.length,
    })
    setItems(outlineStore.list())
    setEditing(record.id)
    setSelected(record.id)
    setEditValue(record.text)
    setFocusKey(record.id)
  }

  function saveEdit() {
    if (editing === null) return
    const text = editValue.trim() || 'New item'
    const cur = item(editing)
    if (cur && cur.text !== text) {
      commit(items.map((i) => (i.id === editing ? { ...i, text } : i)))
    }
    setEditing(null)
    setFocusKey(null)
  }

  function cancelEdit() {
    if (editing === null) return
    const cur = item(editing)
    if (cur && cur.text === 'New item' && !touched.current.has(cur.id)) {
      commit(items.filter((i) => i.id !== editing))
    }
    setEditing(null)
    setFocusKey(null)
  }

  function indent(key: string) {
    const cur = item(key)
    if (!cur || cur.level >= 9) return
    commit(items.map((i) => (i.id === key ? { ...i, level: i.level + 1 } : i)))
  }

  function outdent(key: string) {
    const cur = item(key)
    if (!cur || cur.level === 0) return
    commit(items.map((i) => (i.id === key ? { ...i, level: i.level - 1 } : i)))
  }

  const handleDragStart = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault()
      setDragFrom(index)
      setDragOver(index)
    },
    [],
  )

  const handleDragOver = useCallback(
    (e: React.PointerEvent, index: number) => {
      if (dragFrom === null) return
      e.preventDefault()
      setDragOver(index)
    },
    [dragFrom],
  )

  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      if (dragFrom === null || dragOver === null) {
        setDragFrom(null)
        setDragOver(null)
        return
      }
      const from = dragFrom
      const to = dragOver
      setDragFrom(null)
      setDragOver(null)
      if (from === to) return
      const all = [...items]
      const fromPos = all.findIndex((i) => i.order === from)
      if (fromPos < 0) return
      const [moved] = all.splice(fromPos, 1)
      all.splice(to, 0, moved)
      commit(all.map((i, idx) => ({ ...i, order: idx })))
    },
    [dragFrom, dragOver, items],
  )

  useEffect(() => {
    if (dragFrom === null) return
    function onMove(e: PointerEvent) {
      if (!treeRef.current) return
      const els = Array.from(treeRef.current.querySelectorAll('[data-drag-over]'))
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        if (
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right
        ) {
          const idx = parseInt((el as HTMLElement).dataset.dragOver ?? '0', 10)
          setDragOver(idx)
          return
        }
      }
    }
    function onUp() {
      if (dragFrom === null || dragOver === null) {
        setDragFrom(null)
        setDragOver(null)
        return
      }
      const from = dragFrom
      const to = dragOver
      setDragFrom(null)
      setDragOver(null)
      if (from === to) return
      const all = [...items]
      const fromPos = all.findIndex((i) => i.order === from)
      if (fromPos < 0) return
      const [moved] = all.splice(fromPos, 1)
      all.splice(to, 0, moved)
      commit(all.map((i, idx) => ({ ...i, order: idx })))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragFrom, dragOver, items])

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const markdown = useMemo(() => {
    const lines: string[] = []
    for (const r of rows) {
      lines.push(`${'  '.repeat(r.level)}- ${r.text}`)
    }
    return lines.join('\n')
  }, [rows])

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    if (focusKey && editing === focusKey) {
      itemRefs.current.get(focusKey)?.focus()
      itemRefs.current.get(focusKey)?.select()
    }
  }, [focusKey, editing])

  return (
    <AppShell
      name="Outline App"
      icon="notes"
      hue="teal"
      category="Productivity"
      meta={`${rows.length} ${rows.length === 1 ? 'item' : 'items'}`}
      actions={
        <PrimaryButton onClick={addItem}>Add item</PrimaryButton>
      }
    >
      <Card mono="Structure" title="Outline">
        {rows.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No items yet"
            detail="Click Add item to start your outline."
            actionLabel="Add item"
          />
        ) : (
          <div
            ref={treeRef}
            className="ol-tree"
            role="tree"
            aria-label="Outline"
          >
            {rows.map((row, idx) => {
              const isEditing = editing === row.id
              const isDraggingThis = dragFrom === idx
              const isDragOver = dragOver === idx && dragFrom !== null && dragFrom !== idx
              return (
                <div
                  key={row.id}
                  data-drag-over={idx}
                  className={[
                    'ol-row',
                    isEditing && 'editing',
                    isDraggingThis && 'dragging',
                    isDragOver && 'drag-over',
                    selected === row.id && 'selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ marginLeft: `${row.level * 1.25}em` }}
                  role="treeitem"
                  aria-level={row.level + 1}
                  aria-label={row.text}
                  aria-expanded={row.hasChildren ? !row.collapsed : undefined}
                  aria-grabbed={isDraggingThis || undefined}
                  onPointerMove={(e) => handleDragOver(e, idx)}
                  onPointerUp={(e) => handleDragEnd(e)}
                >
                  <button
                    type="button"
                    className="ol-drag"
                    aria-label={`Drag ${row.text}`}
                    title="Drag to reorder"
                    onPointerDown={(e) => handleDragStart(e, idx)}
                  >
                    ::
                  </button>
                  {row.hasChildren ? (
                    <button
                      type="button"
                      className="ol-toggle"
                      aria-label={row.collapsed ? `Expand ${row.text}` : `Collapse ${row.text}`}
                      aria-expanded={!row.collapsed}
                      onClick={() => toggleCollapse(row.id)}
                    >
                      {row.collapsed ? '+' : '\u2212'}
                    </button>
                  ) : (
                    <span className="ol-toggle-spacer" aria-hidden="true" />
                  )}
                  <div className="ol-text">
                    <span
                      className="ol-label"
                      onClick={() => {
                        if (!isEditing) {
                          setEditing(row.id)
                          setSelected(row.id)
                          setEditValue(row.text)
                          if (row.text === 'New item') touched.current.add(row.id)
                        }
                      }}
                    >
                      {row.text}
                    </span>
                    <input
                      ref={(el) => {
                        if (el) itemRefs.current.set(row.id, el)
                        else itemRefs.current.delete(row.id)
                      }}
                      className="ol-input"
                      aria-label="Item text"
                      value={isEditing ? editValue : row.text}
                      disabled={!isEditing}
                      onClick={() => {
                        if (!isEditing) {
                          setEditing(row.id)
                          setSelected(row.id)
                          setEditValue(row.text)
                          if (row.text === 'New item') touched.current.add(row.id)
                        }
                      }}
                      onChange={(e) => {
                        setEditValue(e.target.value)
                        if (row.text === 'New item') touched.current.add(row.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.stopPropagation()
                          saveEdit()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          e.stopPropagation()
                          cancelEdit()
                        } else if (
                          (e.key === 'ArrowUp' ||
                            e.key === 'ArrowDown' ||
                            e.key === 'ArrowLeft' ||
                            e.key === 'ArrowRight') &&
                          isEditing
                        ) {
                          e.stopPropagation()
                        }
                      }}
                      onBlur={() => {
                        if (isEditing) saveEdit()
                      }}
                    />
                  </div>
                  {selected === row.id && (
                    <div className="ol-actions">
                      <Button kind="ghost" ariaLabel="Indent" onClick={() => indent(row.id)}>
                        Indent
                      </Button>
                      {row.level > 0 && (
                        <Button kind="ghost" ariaLabel="Outdent" onClick={() => outdent(row.id)}>
                          Outdent
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card mono="Actions" title="Outline">
        <Actions>
          <Button kind="secondary" onClick={() => void copy(markdown)} disabled={rows.length === 0}>
            {copied ? 'Copied Markdown' : 'Export Markdown'}
          </Button>
        </Actions>
        <MonoLabel sm faint>
          Indent nests an item under the one above it; outdent moves it back up. Drag a row by its
          handle to reorder.
        </MonoLabel>
        {copied && <MonoLabel sm accent>Markdown copied to clipboard</MonoLabel>}
      </Card>
    </AppShell>
  )
}
