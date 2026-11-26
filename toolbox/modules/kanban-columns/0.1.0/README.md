<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components KanbanColumns at 9c7f3ab. -->

> `@lacuna/kanban-columns` `0.1.0`. To use it in an app: add `"@lacuna/kanban-columns": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/kanban-columns": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/kanban-columns'`.

# KanbanColumns

A multi-column Kanban board rendered from a fully controlled `columns` prop. Each column is an accessible group labeled with its title and shows a live card count, or `count/wipLimit` when the column has a `wipLimit`. Cards are focusable listitems: Tab reaches the first card, ArrowUp/ArrowDown move focus within a column, Enter (or pointer drag) starts a move, ArrowLeft/ArrowRight drop the card into the neighboring column at the same index, and Escape cancels. Reorders within a column report through `onReorder`; moves between columns report through `onMove`, and the parent owns all state. Built on `useDragReorder` for pointer dragging.

## Props

```ts
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

export function KanbanColumns(props: KanbanColumnsProps): React.JSX.Element;
```

## Usage

```tsx
import { useState } from 'react';
import { KanbanColumns } from '@lacuna/kanban-columns';
import type { KanbanColumnData } from '@lacuna/kanban-columns';

const initial: KanbanColumnData[] = [
  { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'First card' }] },
  { id: 'doing', title: 'In Progress', cards: [], wipLimit: 2 },
];

export function Example() {
  const [columns, setColumns] = useState(initial);
  const onReorder = (columnId: string, cardId: string, fromIndex: number, toIndex: number) =>
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id !== columnId) return col;
        const cards = [...col.cards];
        const card = cards.splice(fromIndex, 1)[0];
        if (card === undefined) return col;
        cards.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, card);
        return { ...col, cards };
      }),
    );
  const onMove = (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    toIndex: number,
  ) =>
    setColumns((cols) => {
      const card = cols.find((c) => c.id === fromColumnId)?.cards.find((c) => c.id === cardId);
      if (card === undefined) return cols;
      return cols.map((col) => {
        if (col.id === fromColumnId) return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        if (col.id === toColumnId) {
          const cards = [...col.cards];
          cards.splice(Math.max(0, Math.min(toIndex, cards.length)), 0, card);
          return { ...col, cards };
        }
        return col;
      });
    });
  return (
    <KanbanColumns columns={columns} onReorder={onReorder} onMove={onMove} />
  );
}
```
