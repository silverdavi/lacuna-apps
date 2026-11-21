<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components BoardKit at c16104e. -->

> `@lacuna/board-kit` `0.1.0`. To use it in an app: add `"@lacuna/board-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/board-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/board-kit'`.

# BoardKit

A ready-made kanban board for task apps. It renders the board's columns as a "Kanban
Board" region, each with its cards, a WIP count when a limit is set, and an
"Add card to" button. Cards are draggable between columns. Clicking a card's Edit
button opens an inline form (title, tags, save/cancel) that closes on Escape. Cards
persist to localStorage through the board's storage key, so they survive a reload.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `boardKey` | `string` | Key for localStorage persistence of the board's cards. |
| `columns` | `BoardColumn[]` | The board's columns, in display order. |
| `initialCards` | `BoardCard[]` (optional) | Initial cards. Persisted to localStorage after. |
| `tagSuggestions` | `string[]` (optional) | Suggested tags offered in the card editor's tag input. |
| `tagPlaceholder` | `string` (optional) | Placeholder for the card editor's tag input. |
| `style` | `CSSProperties` (optional) | Extra styles merged onto the kit root. |

`BoardColumn` is `{ id: string; title: string; wipLimit?: number }`.
`BoardCard` is `{ id?: string; title: string; description?: string; tags?: string[]; columnId: string }`.

## Usage

```tsx
import { BoardKit } from '@lacuna/board-kit'

export function Example() {
  return (
    <BoardKit
      boardKey="product-board"
      columns={[
        { id: 'todo', title: 'To Do' },
        { id: 'doing', title: 'In Progress', wipLimit: 2 },
        { id: 'done', title: 'Done' },
      ]}
      initialCards={[
        { id: 'a', title: 'Plan sprint', columnId: 'todo' },
        { id: 'b', title: 'Design board', columnId: 'doing', tags: ['ui'] },
      ]}
      tagSuggestions={['urgent', 'bug', 'feature']}
    />
  )
}
```
