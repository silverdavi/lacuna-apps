// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/board-kit 0.1.0: snapshot of lacuna-components BoardKit at c16104e by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, ReactElement } from 'react'
import { useCollection } from '@lacuna/use-collection'
import { TagInput } from '@lacuna/tag-input'
import type { BoardCard, BoardColumn, BoardKitProps } from './index'

type Mode =
  | { kind: 'closed' }
  | { kind: 'new'; columnId: string }
  | { kind: 'edit'; cardId: string; title: string }

const S: Record<string, CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--sf))', fontFamily: 'var(--sans)', color: 'var(--ink)', width: '100%' },
  region: { display: 'flex', gap: 'calc(12px * var(--sf))', overflowX: 'auto', padding: 'calc(4px * var(--sf))', alignItems: 'flex-start' },
  column: { flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))', width: 'calc(240px * var(--sf))', boxSizing: 'border-box', background: 'var(--paper-deep)', border: 'calc(1px * var(--sf)) solid var(--hair)', borderRadius: 'calc(8px * var(--sf))', padding: 'calc(10px * var(--sf))' },
  colHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'calc(8px * var(--sf))' },
  colTitle: { fontFamily: 'var(--sans)', fontSize: 'calc(15px * var(--tf))', fontWeight: 600, color: 'var(--ink)', margin: 0 },
  wip: { fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink)' },
  cardList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))', minWidth: 0 },
  cardLi: { listStyle: 'none', margin: 0, padding: 0 },
  card: { display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))', boxSizing: 'border-box', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(6px * var(--sf))', padding: 'calc(8px * var(--sf))' },
  cardTitle: { fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)' },
  cardDesc: { fontFamily: 'var(--sans)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink)' },
  cardTags: { display: 'flex', flexWrap: 'wrap', gap: 'calc(4px * var(--sf))' },
  chip: { fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink)', background: 'var(--paper-deep)', border: 'calc(1px * var(--sf)) solid var(--hair)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))' },
  cardFoot: { display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(4px * var(--sf))' },
  btn: { fontFamily: 'var(--sans)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink)', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))', cursor: 'pointer' },
  addBtn: { fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(6px * var(--sf)) calc(10px * var(--sf))', cursor: 'pointer', alignSelf: 'flex-start' },
  form: { display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))', boxSizing: 'border-box', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(6px * var(--sf))', padding: 'calc(10px * var(--sf))' },
  field: { display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' },
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink)' },
  titleInput: { boxSizing: 'border-box', width: '100%', fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(6px * var(--sf))' },
  actions: { display: 'flex', gap: 'calc(8px * var(--sf))' },
}

const DROP_OUTLINE = 'calc(2px * var(--sf)) solid var(--accent)'

function titleField(id: string, value: string, autoFocus: boolean, onChange: (v: string) => void): ReactElement {
  return (
    <span style={S.field}>
      <label style={S.fieldLabel} htmlFor={id}>Card title</label>
      <input id={id} type="text" autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} style={S.titleInput} />
    </span>
  )
}

function formActions(submitLabel: string, onSubmit: () => void, onCancel: () => void): ReactElement {
  return (
    <span style={S.actions}>
      <button type="submit" style={S.btn}>{submitLabel}</button>
      <button type="button" style={S.btn} onClick={onCancel}>Cancel</button>
    </span>
  )
}

export function BoardKit(props: BoardKitProps): ReactElement {
  const { boardKey, columns, initialCards, tagSuggestions, tagPlaceholder, style } = props

  const [mode, setMode] = useState<Mode>({ kind: 'closed' })
  const [title, setTitle] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)

  const editButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const seed =
    initialCards?.map((card) => ({
      data: { ...card, tags: card.tags ?? [] },
      archived: false,
    })) ?? []

  const { state, actions } = useCollection<BoardCard>({
    storageKey: boardKey,
    initialItems: seed,
  })
  const cards = state.activeItems

  const editingCard =
    mode.kind === 'edit'
      ? cards.find((item) => item.id === mode.cardId)
      : undefined

  const editingTags = editingCard?.data.tags ?? []

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || mode.kind === 'closed') return
      event.preventDefault()
      const cardId = mode.kind === 'edit' ? mode.cardId : null
      setMode({ kind: 'closed' })
      setTitle('')
      if (cardId !== null) {
        editButtonRefs.current[cardId]?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mode])

  function openNew(columnId: string): void {
    setTitle('')
    setMode({ kind: 'new', columnId })
  }

  function openEdit(cardId: string): void {
    const item = cards.find((entry) => entry.id === cardId)
    if (item === undefined) return
    setTitle(item.data.title)
    setMode({ kind: 'edit', cardId, title: item.data.title })
  }

  function closeForm(focusCardId?: string): void {
    setMode({ kind: 'closed' })
    setTitle('')
    if (focusCardId !== undefined) {
      editButtonRefs.current[focusCardId]?.focus()
    }
  }

  function handleCreate(columnId: string): void {
    const trimmed = title.trim()
    if (trimmed === '') return
    actions.add({ title: trimmed, columnId, tags: [] })
    closeForm()
  }

  function handleEdit(cardId: string): void {
    const trimmed = title.trim()
    if (trimmed === '') return
    actions.update(cardId, { title: trimmed })
    closeForm(cardId)
  }

  function handleTagsChange(cardId: string, tags: string[]): void {
    actions.update(cardId, { tags })
  }

  function handleDragOver(event: DragEvent<HTMLElement>, columnId: string): void {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOver !== columnId) setDragOver(columnId)
  }

  function handleDrop(event: DragEvent<HTMLElement>, columnId: string): void {
    event.preventDefault()
    setDragOver(null)
    const cardId = event.dataTransfer.getData('text/plain')
    if (cardId === '') return
    const item = cards.find((entry) => entry.id === cardId)
    if (item !== undefined && item.data.columnId !== columnId) {
      actions.update(cardId, { columnId })
    }
  }

  return (
    <div style={{ ...S.wrap, ...style }}>
      <section role="region" aria-label="Kanban Board" style={S.region}>
        {columns.map((col: BoardColumn) => {
          const columnCards = cards.filter((item) => item.data.columnId === col.id)
          const atLimit = col.wipLimit !== undefined && columnCards.length >= col.wipLimit
          const isOver = dragOver === col.id
          return (
            <section
              key={col.id}
              role="group"
              aria-label={col.title}
              onDragOver={(event) => handleDragOver(event, col.id)}
              onDragLeave={() => { if (dragOver === col.id) setDragOver(null) }}
              onDrop={(event) => handleDrop(event, col.id)}
              style={{ ...S.column, ...(isOver ? { outline: DROP_OUTLINE } : null) }}
            >
              <header style={S.colHead}>
                <h3 style={S.colTitle}>{col.title}</h3>
                {col.wipLimit !== undefined && (
                  <span style={S.wip} aria-hidden="true">
                    {`${columnCards.length}/${col.wipLimit}`}
                  </span>
                )}
              </header>

              <ul style={S.cardList}>
                {columnCards.map((item) => {
                  const cid = item.id
                  const isEditing = mode.kind === 'edit' && mode.cardId === cid
                  return (
                    <li
                      key={cid}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', cid)
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      style={S.cardLi}
                    >
                      <div role="article" aria-label={item.data.title} style={S.card}>
                      <span style={S.cardTitle}>{item.data.title}</span>
                      {item.data.description !== undefined &&
                        item.data.description !== '' && (
                          <span style={S.cardDesc}>{item.data.description}</span>
                        )}
                      {(item.data.tags ?? []).length > 0 && (
                        <span style={S.cardTags}>
                          {item.data.tags?.map((tag) => (
                            <span key={tag} style={S.chip}>{tag}</span>
                          ))}
                        </span>
                      )}
                      <span style={S.cardFoot}>
                        <button
                          type="button"
                          ref={(el) => { editButtonRefs.current[cid] = el }}
                          onClick={() => openEdit(cid)}
                          style={S.btn}
                        >
                          Edit {item.data.title}
                        </button>
                        {isEditing ? (
                          <form
                            role="form"
                            aria-label={`Edit ${item.data.title}`}
                            style={S.form}
                            onSubmit={(event) => { event.preventDefault(); handleEdit(cid) }}
                          >
                            {titleField(`edit-title-${cid}`, title, false, setTitle)}
                            <TagInput
                              tags={editingTags}
                              onChange={(tags) => handleTagsChange(cid, tags)}
                              suggestions={tagSuggestions}
                              placeholder={tagPlaceholder}
                              aria-label="Tags"
                            />
                            {formActions('Save', () => {}, () => closeForm(cid))}
                          </form>
                        ) : (
                          <button type="button" onClick={() => actions.remove(cid)} style={S.btn}>
                            Delete
                          </button>
                        )}
                      </span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <button
                type="button"
                aria-disabled={atLimit}
                onClick={() => { if (!atLimit) openNew(col.id) }}
                style={S.addBtn}
              >
                Add card to {col.title}
              </button>

              {mode.kind === 'new' && mode.columnId === col.id && (
                <form
                  role="form"
                  aria-label="New card"
                  style={S.form}
                            onSubmit={(event) => { event.preventDefault(); handleCreate(col.id) }}
                >
                  {titleField(`new-title-${col.id}`, title, true, setTitle)}
                  {formActions('Add', () => {}, () => closeForm())}
                </form>
              )}
            </section>
          )
        })}
      </section>
    </div>
  )
}
