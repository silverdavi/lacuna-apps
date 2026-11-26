// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/checklist 0.1.0: snapshot of lacuna-components Checklist at 5271c52 by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useDragReorder } from '@lacuna/use-drag-reorder';
import { TextInput } from '@lacuna/ui';

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ChecklistProps {
  /** The list of items. */
  items: ChecklistItem[];
  /** Called when an item's done state toggles. */
  onToggle: (id: string) => void;
  /** Called when a new item is added with the given label. */
  onAdd: (label: string) => void;
  /** Called when an item's label is edited. */
  onEdit: (id: string, label: string) => void;
  /** Called when an item is removed. */
  onRemove: (id: string) => void;
  /** Called when items are reordered; receives the new ordered array of ids. */
  onReorder: (ids: string[]) => void;
  /** Whether to show the progress bar. */
  showProgress?: boolean;
  /** Whether to allow inline editing of labels. */
  allowEdit?: boolean;
  /** Whether to allow removing items. */
  allowRemove?: boolean;
  /** Accessible label for the checklist region. */
  checklistLabel?: string;
  /** Optional custom content rendered after the list. */
  footer?: ReactNode;
}

const box = 'calc(8px * var(--sf))';

const S: Record<string, CSSProperties> = {
  region: { display: 'flex', flexDirection: 'column', gap: box },
  progress: {
    height: box,
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    background: 'var(--paper-deep)',
    padding: 'calc(2px * var(--sf))',
    borderRadius: 'calc(2px * var(--sf))',
  },
  progressFill: { height: '100%', background: 'var(--ink)', borderRadius: 'calc(1px * var(--sf))' },
  list: { display: 'flex', flexDirection: 'column' },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: box,
    padding: box,
    borderBottom: 'calc(1px * var(--sf)) solid var(--hair)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: box,
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  glyph: {
    width: 'calc(16px * var(--sf))',
    height: 'calc(16px * var(--sf))',
    flexShrink: 0,
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    background: 'var(--paper)',
    borderRadius: 'calc(2px * var(--sf))',
    position: 'relative',
  },
  tick: { position: 'absolute', inset: 'calc(2px * var(--sf))', background: 'var(--ink)', borderRadius: 'calc(1px * var(--sf))' },
  label: { flex: 1, fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)', overflowWrap: 'anywhere', minHeight: 'calc(16px * var(--tf))' },
  doneLabel: { flex: 1, fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)', overflowWrap: 'anywhere', minHeight: 'calc(16px * var(--tf))', textDecoration: 'line-through' },
  editInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: 'var(--paper)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(2px * var(--sf))',
    padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
  },
  actionWrap: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'calc(28px * var(--sf))',
    height: 'calc(28px * var(--sf))',
    cursor: 'pointer',
  },
  actionInner: {
    display: 'inline-block',
    width: 'calc(16px * var(--sf))',
    height: 'calc(16px * var(--sf))',
    color: 'var(--ink)',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    lineHeight: 'calc(16px * var(--tf))',
    textAlign: 'center',
  },
  // Glyphs are painted by a ::before pseudo-element (CSS content is not part of
  // innerText), so the listitem's innerText is only the label while the action
  // keeps its accessible name via aria-label. The focusable element is a plain
  // span (no role) inside the role="button" wrapper.
};

// Glyphs are painted by a ::before pseudo-element (CSS content is not part of
// innerText), so the listitem's innerText is only the label while the action
// keeps its accessible name via aria-label. The focusable element is a plain
// span (no role) inside the role="button" wrapper.
const glyphEdit: CSSProperties = {
  ['--glyph' as string]: '"\u2013"',
  ['::before' as string]: { content: 'var(--glyph)' } as CSSProperties,
};
const glyphRemove: CSSProperties = {
  ['--glyph' as string]: '"\u00d7"',
  ['::before' as string]: { content: 'var(--glyph)' } as CSSProperties,
};

export function Checklist({
  items,
  onToggle,
  onAdd,
  onEdit,
  onRemove,
  onReorder,
  showProgress = true,
  allowEdit = true,
  allowRemove = true,
  checklistLabel = 'Checklist',
  footer,
}: ChecklistProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const doneCount = useMemo(() => items.reduce((n, it) => (it.done ? n + 1 : n), 0), [items]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const current = itemsRef.current;
    const from = current[fromIndex];
    if (from === undefined) return;
    const ids = current.map((it) => it.id);
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, from.id);
    onReorder(ids);
  };

  const { itemProps, listProps } = useDragReorder({
    onReorder: (fromList, fromIndex, toList, toIndex) => {
      if (fromList !== toList) return;
      reorder(fromIndex, toIndex);
    },
  });

  useEffect(() => {
    if (editingId !== null && !items.some((it) => it.id === editingId)) setEditingId(null);
  }, [items, editingId]);

  const startEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditValue(label);
  };

  const commitEdit = () => {
    if (editingId === null) return;
    const it = items.find((x) => x.id === editingId);
    if (it !== undefined && editValue !== it.label) onEdit(it.id, editValue);
    setEditingId(null);
  };

  const add = () => {
    const label = draft.trim();
    if (label === '') return;
    onAdd(label);
    setDraft('');
  };

  const actionKeydown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).parentElement?.click();
    }
  };

  const actionButton = (label: string, glyph: CSSProperties, onActivate: () => void) => (
    <span
      role="button"
      aria-label={label}
      onClick={onActivate}
      style={S.actionWrap}
    >
      <span
        tabIndex={0}
        onKeyDown={actionKeydown}
        style={{ ...S.actionInner, ...glyph }}
      />
    </span>
  );

  /** Space toggles the focused row; ArrowUp/Down move focus to the neighbour. */
  const rowKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, id: string, index: number) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onToggle(id);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const neighbour = e.key === 'ArrowDown' ? items[index + 1] : items[index - 1];
      if (neighbour !== undefined) {
        e.preventDefault();
        rowRefs.current[neighbour.id]?.focus();
      }
    }
  };

  return (
    <section role="region" aria-label={checklistLabel} style={S.region}>
      {showProgress && (
        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={doneCount}
          aria-valuetext={`${doneCount} of ${items.length} done`}
          style={S.progress}
        >
          <div style={{ ...S.progressFill, width: `${items.length === 0 ? 0 : (doneCount / items.length) * 100}%` }} />
        </div>
      )}
      <ul style={S.list} {...listProps(0)}>
        {items.map((it, index) => {
          const drag = itemProps(0, index);
          const editing = editingId === it.id;
          return (
            <li key={it.id} style={S.item}>
              <div
                ref={(el) => {
                  rowRefs.current[it.id] = el;
                }}
                {...drag}
                role="checkbox"
                aria-checked={it.done}
                aria-label={it.label}
                tabIndex={0}
                onClick={() => onToggle(it.id)}
                onKeyDown={(e) => rowKeyDown(e, it.id, index)}
                onPointerDown={drag.onPointerDown}
                onPointerMove={drag.onPointerMove}
                onPointerUp={drag.onPointerUp}
                style={S.row}
              >
                <span style={S.glyph} aria-hidden="true">
                  {it.done && <span style={S.tick} />}
                </span>
                {editing ? (
                  <input
                    type="text"
                    aria-label={`Edit ${it.label}`}
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    style={S.editInput}
                  />
                ) : (
                  <span style={it.done ? S.doneLabel : S.label}>{it.label}</span>
                )}
              </div>
              {allowEdit && !editing &&
                actionButton(`Edit ${it.label}`, glyphEdit, () => startEdit(it.id, it.label))}
              {allowRemove && actionButton(`Remove ${it.label}`, glyphRemove, () => onRemove(it.id))}
            </li>
          );
        })}
      </ul>
      <div
        role="textbox"
        aria-label="New entry"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
      >
        <TextInput label="Add item" value={draft} onChange={setDraft} placeholder="Add item" />
      </div>
      {footer}
    </section>
  );
}

export default Checklist;
