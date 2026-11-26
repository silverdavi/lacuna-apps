<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components BoardGrid at 9c7f3ab. -->

> `@lacuna/board-grid` `0.1.0`. To use it in an app: add `"@lacuna/board-grid": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/board-grid": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/board-grid'`.

# BoardGrid

A 2D cell board with roving keyboard focus for grid-based games and puzzles. It renders a
rectangular `rows` by `cols` grid of cells, supports cell rendering, selection, click
activation, and directional arrow-key navigation, and is used by catalog apps such as
Tic Tac Toe, 2048 Game, Chess Board Game, and Card Memory Match. The board container takes
focus on `Tab`; arrow keys move focus to neighboring cells without wrapping at the edges;
clicking a cell or pressing `Enter` or `Space` on a focused cell calls `onCellClick`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `number` | — | Number of rows. |
| `cols` | `number` | — | Number of columns. |
| `cells` | `Array<Array<ReactNode>>` | — | Cell contents, `cells[row][col]`. |
| `onCellClick` | `(row, col) => void` | — | Called when a cell is clicked, or `Enter`/`Space` is pressed on a focused cell. |
| `onCellFocus` | `(row, col) => void` | — | Called when a cell gains keyboard or pointer focus. |
| `selectedCell` | `{ row, col } \| null` | `null` | The selected cell; it gets `aria-selected="true"`, all others `"false"`. |
| `ariaLabel` | `string` | — | Accessible label for the grid container. |
| `cellAriaLabel` | `(row, col) => string` | — | Custom accessible name per cell; falls back to the cell's text content. |

## Usage

```tsx
import { useState } from 'react'
import { BoardGrid } from '@lacuna/board-grid'

const cells = Array.from({ length: 3 }, (_, row) =>
  Array.from({ length: 3 }, (_, col) => `${row},${col}`)
)

export function Example() {
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  return (
    <BoardGrid
      rows={3}
      cols={3}
      cells={cells}
      ariaLabel="Example board"
      selectedCell={selected}
      onCellClick={(row, col) => setSelected({ row, col })}
    />
  )
}
```
