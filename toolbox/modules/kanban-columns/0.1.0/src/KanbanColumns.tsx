// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/kanban-columns 0.1.0: snapshot of lacuna-components KanbanColumns at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDragReorder } from '@lacuna/use-drag-reorder';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  cards: KanbanCard[];
  wipLimit?: number;
}

export interface KanbanColumnsProps {
  columns: KanbanColumnData[];
  onReorder: (columnId: string, cardId: string, fromIndex: number, toIndex: number) => void;
  onMove: (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void;
  className?: string;
}

const CARD_REFS: WeakMap<KanbanColumnData, Map<string, HTMLElement | null>> = new WeakMap();

function cardRef(column: KanbanColumnData, card: KanbanCard, el: HTMLElement | null) {
  let map = CARD_REFS.get(column);
  if (map === undefined) {
    map = new Map();
    CARD_REFS.set(column, map);
  }
  map.set(card.id, el);
}

const BOARD: CSSProperties = {
  display: 'flex',
  gap: 'calc(16px * var(--sf))',
  alignItems: 'flex-start',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  overflowX: 'auto',
  padding: 'calc(4px * var(--sf))',
};

const COLUMN: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
  width: 'calc(240px * var(--sf))',
  minHeight: 'calc(120px * var(--sf))',
  boxSizing: 'border-box',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(8px * var(--sf))',
  padding: 'calc(12px * var(--sf))',
};

const HEADER: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'calc(8px * var(--sf))',
};

const TITLE: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(15px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
  margin: 0,
};

const COUNT: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
  whiteSpace: 'nowrap',
};

const LIST: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
};

const CARD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(4px * var(--sf))',
  boxSizing: 'border-box',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(6px * var(--sf))',
  padding: 'calc(8px * var(--sf))',
  cursor: 'grab',
  userSelect: 'none',
  touchAction: 'none',
};

const CARD_TITLE: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
};

const CARD_DESC: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
};

export function KanbanColumns(props: KanbanColumnsProps) {
  const { columns, onReorder, onMove, className } = props;
  const [moveState, setMoveState] = useState<{ columnId: string; cardId: string } | null>(null);
  const moveRef = useRef(moveState);
  moveRef.current = moveState;

  const { itemProps, listProps, isDragging, draggingItem } = useDragReorder({
    listCount: columns.length,
    onReorder: (fromList, fromIndex, toList, toIndex) => {
      const fromColumn = columns[fromList];
      const toColumn = columns[toList];
      const card = fromColumn?.cards[fromIndex];
      if (fromColumn === undefined || toColumn === undefined || card === undefined) return;
      if (fromList === toList) {
        onReorder(fromColumn.id, card.id, fromIndex, toIndex);
      } else {
        onMove(card.id, fromColumn.id, toColumn.id, toIndex);
      }
    },
  });

  const focusCard = (listIndex: number, itemIndex: number) => {
    const column = columns[listIndex];
    const card = column?.cards[itemIndex];
    if (column === undefined || card === undefined) return;
    CARD_REFS.get(column)?.get(card.id)?.focus();
  };

  const onCardKeyDown = (
    e: ReactKeyboardEvent<HTMLElement>,
    listIndex: number,
    itemIndex: number,
    card: KanbanCard,
  ) => {
    const key = e.key;
    const count = columns[listIndex]?.cards.length ?? 0;
    const move = moveRef.current;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (move !== null) return;
      e.preventDefault();
      if (key === 'ArrowDown' && itemIndex < count - 1) focusCard(listIndex, itemIndex + 1);
      else if (key === 'ArrowUp' && itemIndex > 0) focusCard(listIndex, itemIndex - 1);
      return;
    }
    if (key === 'Enter') {
      if (move !== null) {
        e.preventDefault();
        setMoveState(null);
      } else {
        e.preventDefault();
        setMoveState({ columnId: columns[listIndex]?.id ?? '', cardId: card.id });
      }
      return;
    }
    if (key === 'Escape') {
      if (move === null) return;
      e.preventDefault();
      setMoveState(null);
      return;
    }
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      if (move === null) return;
      e.preventDefault();
      setMoveState(null);
      const toList = key === 'ArrowRight' ? listIndex + 1 : listIndex - 1;
      if (toList < 0 || toList >= columns.length) return;
      const fromColumn = columns[listIndex];
      const toColumn = columns[toList];
      if (fromColumn === undefined || toColumn === undefined) return;
      onMove(card.id, fromColumn.id, toColumn.id, Math.min(itemIndex, toColumn.cards.length));
    }
  };

  return (
    <div className={className} style={BOARD}>
      {columns.map((column, listIndex) => {
        const move = moveState !== null && moveState.columnId === column.id ? moveState : null;
        return (
          <section key={column.id} role="group" aria-label={column.title} style={COLUMN}>
            <header style={HEADER}>
              <h3 style={TITLE}>{column.title}</h3>
              <span style={COUNT} aria-hidden="true">
                {column.wipLimit !== undefined
                  ? `${column.cards.length}/${column.wipLimit}`
                  : String(column.cards.length)}
              </span>
            </header>
            <ul style={LIST} {...listProps(listIndex)}>
              {column.cards.map((card, itemIndex) => {
                const isDraggingThis =
                  isDragging &&
                  draggingItem !== null &&
                  draggingItem.listIndex === listIndex &&
                  draggingItem.itemIndex === itemIndex;
                return (
                  <li
                    key={card.id}
                    aria-label={card.title}
                    ref={(el) => {
                      cardRef(column, card, el);
                    }}
                    style={{
                      ...CARD,
                      ...(move?.cardId === card.id
                        ? { outline: 'calc(2px * var(--sf)) solid var(--accent)' }
                        : null),
                      ...(isDraggingThis
                        ? { opacity: 0.4, outline: 'calc(2px * var(--sf)) solid var(--accent)' }
                        : null),
                    }}
                    {...itemProps(listIndex, itemIndex)}
                    onKeyDown={(e) => onCardKeyDown(e, listIndex, itemIndex, card)}
                  >
                    <span style={CARD_TITLE}>{card.title}</span>
                    {card.description !== undefined && (
                      <span style={CARD_DESC}>{card.description}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
