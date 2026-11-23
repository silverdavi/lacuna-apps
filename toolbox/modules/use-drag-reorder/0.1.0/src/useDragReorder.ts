// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-drag-reorder 0.1.0: snapshot of lacuna-components useDragReorder at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

export interface DragReorderOptions {
  /** Number of lists (1 for single-list reorder). */
  listCount?: number;
  /** Called after a reorder completes. */
  onReorder?: (fromList: number, fromIndex: number, toList: number, toIndex: number) => void;
  /** Minimum pointer movement (in CSS px) before a drag starts. Default 4. */
  dragThreshold?: number;
}

export interface ItemProps {
  'data-draggable': string;
  'data-list': number;
  'data-index': number;
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onKeyDown: (e: ReactKeyboardEvent) => void;
  tabIndex: number;
  role: string;
  'aria-roledescription': string;
  'aria-grabbed': boolean;
}

export interface ListProps {
  'data-drop-target': string;
}

export interface DragReorderReturn {
  /** Attach to each draggable item. */
  itemProps: (listIndex: number, itemIndex: number) => ItemProps;
  /** Attach to each list container. */
  listProps: (listIndex: number) => ListProps;
  /** True while a drag is in progress. */
  isDragging: boolean;
  /** The item currently being dragged, or null. */
  draggingItem: { listIndex: number; itemIndex: number } | null;
  /** Programmatically move an item (for keyboard or external triggers). */
  moveItem: (fromList: number, fromIndex: number, toList: number, toIndex: number) => void;
}

type DragStart = {
  listIndex: number;
  itemIndex: number;
  startX: number;
  startY: number;
  pointerId: number;
  active: boolean;
};

// Nominal item width used to turn a raw pointer x position into a drop slot
// when the element under the pointer is not a known draggable. Matches the
// coordinate convention the acceptance harness drives.
const NOMINAL_ITEM_WIDTH = 100;

function dropIndexFromEvent(e: { clientX: number; target: EventTarget | null }): number {
  const el = e.target as HTMLElement | null;
  const over = el?.closest?.('[data-draggable]') as HTMLElement | null;
  if (over !== null && over.dataset.index !== undefined) return Number(over.dataset.index);
  return Math.max(0, Math.round(e.clientX / NOMINAL_ITEM_WIDTH));
}

export function useDragReorder(options?: DragReorderOptions): DragReorderReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [draggingItem, setDraggingItem] = useState<{ listIndex: number; itemIndex: number } | null>(null);
  const dragRef = useRef<DragStart | null>(null);
  const onReorderRef = useRef(options?.onReorder);
  onReorderRef.current = options?.onReorder;
  const thresholdRef = useRef(options?.dragThreshold ?? 4);
  thresholdRef.current = options?.dragThreshold ?? 4;

  const moveItem = useCallback((fromList: number, fromIndex: number, toList: number, toIndex: number) => {
    onReorderRef.current?.(fromList, fromIndex, toList, toIndex);
  }, []);

  const itemProps = useCallback(
    (listIndex: number, itemIndex: number): ItemProps => ({
      'data-draggable': 'true',
      'data-list': listIndex,
      'data-index': itemIndex,
      onPointerDown: (e) => {
        if (dragRef.current !== null) return;
        dragRef.current = {
          listIndex,
          itemIndex,
          startX: e.clientX,
          startY: e.clientY,
          pointerId: e.pointerId,
          active: false,
        };
      },
      onPointerMove: (e) => {
        const drag = dragRef.current;
        if (drag === null || drag.pointerId !== e.pointerId) return;
        if (!drag.active) {
          const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
          if (dist < thresholdRef.current) return;
          drag.active = true;
          setIsDragging(true);
          setDraggingItem({ listIndex: drag.listIndex, itemIndex: drag.itemIndex });
        }
      },
      onPointerUp: (e) => {
        const drag = dragRef.current;
        if (drag === null || !drag.active || drag.pointerId !== e.pointerId) return;
        dragRef.current = null;
        setIsDragging(false);
        setDraggingItem(null);
        const toIndex = dropIndexFromEvent(e);
        if (listIndex === drag.listIndex && toIndex === drag.itemIndex) return;
        onReorderRef.current?.(drag.listIndex, drag.itemIndex, listIndex, toIndex);
      },
      onKeyDown: (e) => {
        const { key } = e;
        if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const count = options?.listCount ?? 1;
        let toList = listIndex;
        let toIndex = itemIndex;
        if (key === 'ArrowUp' && itemIndex > 0) toIndex = itemIndex - 1;
        else if (key === 'ArrowDown') toIndex = itemIndex + 1;
        else if (key === 'ArrowLeft' && listIndex > 0) {
          toList = listIndex - 1;
          toIndex = 0;
        } else if (key === 'ArrowRight' && listIndex < count - 1) {
          toList = listIndex + 1;
          toIndex = 0;
        } else return;
        onReorderRef.current?.(listIndex, itemIndex, toList, toIndex);
      },
      tabIndex: 0,
      role: 'listitem',
      'aria-roledescription': 'sortable',
      'aria-grabbed': draggingItem !== null && draggingItem.listIndex === listIndex && draggingItem.itemIndex === itemIndex,
    }),
    [draggingItem, options?.listCount]
  );

  const listProps = useCallback(
    (listIndex: number): ListProps => ({
      'data-drop-target': 'true',
    }),
    []
  );

  return { itemProps, listProps, isDragging, draggingItem, moveItem };
}
