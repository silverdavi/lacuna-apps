<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components GameKit at 9c7f3ab. -->

> `@lacuna/game-kit` `0.1.0`. To use it in an app: add `"@lacuna/game-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/game-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/game-kit'`.

# GameKit

A kit that hosts a `BoardGrid` game board together with a score display (current and
best score), a "Restart game" control, and best-score persistence via `useLocalRecord`.
Global shortcuts are wired through `useHotkeys`. All game rules are supplied by the
caller through the `tick` and `onKey` callbacks, so the same kit powers board and
puzzle games such as Card Memory Match, Classic Tetris, Chess, 2048, Snake, and
Tic Tac Toe. The game loop is driven by user input: an arrow-key press on the focused
board advances the state via `onKey`. Every cell is reachable with Tab (the focus
wraps around the last cell back to the first), and each cell's accessible name is
derived from its row and column.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `number` | — | Rows of the board. |
| `cols` | `number` | — | Columns of the board. |
| `renderCell` | `(row, col, state) => ReactNode` | — | Render one cell. Keep visible content equal to the cell's row/column label to avoid an axe label/content mismatch. |
| `initialState` | `unknown` | — | Initial opaque game state. |
| `tick` | `(state) => GameKitState` | — | Advance the game by one tick. |
| `onKey` | `(key, state) => GameKitState` | — | Handle a key press on the board. |
| `hotkeys` | `HotkeyMap` | — | Global shortcut map for `useHotkeys`. |
| `storageKey` | `string` | — | `localStorage` key for the best score. |
| `title` | `string` | — | Optional kit heading. |
| `boardGridProps` | `Omit<BoardGridProps, 'rows' \| 'cols' \| 'cells' \| 'cellTabIndex'>` | — | Forwarded to the internal `BoardGrid`. |

`GameKitState` is `{ data: unknown; score: { current, best }; isRunning; isGameOver }`.
While the game runs the "Best" display holds the persisted value; when `isGameOver`
becomes true the best score is persisted under `storageKey` via `useLocalRecord`, and
on the next mount the "Best" display reads that persisted value.

## Usage

```tsx
import { GameKit } from '@lacuna/game-kit'
import type { GameKitState } from '@lacuna/game-kit'

function tick(state: GameKitState): GameKitState {
  return {
    ...state,
    score: { ...state.score, current: state.score.current + 1 },
  }
}

export function Example() {
  return (
    <GameKit
      rows={4}
      cols={4}
      title="Example"
      renderCell={(_row, _col, _state) => null}
      initialState={null}
      tick={tick}
      storageKey="example-best"
    />
  )
}
```
