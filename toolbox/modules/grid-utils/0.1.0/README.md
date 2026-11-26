<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components gridUtils at 9c7f3ab. -->

> `@lacuna/grid-utils` `0.1.0`. To use it in an app: add `"@lacuna/grid-utils": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/grid-utils": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/grid-utils'`.

# gridUtils

Pure functions for a 2D grid model: neighbor lookup, flood fill, rotation, and line detection. Built for board games (Tic Tac Toe, 2048, Tetris), pixel-art editors, and any app that operates on a rectangular lattice. Every function is total and pure: inputs are never mutated and a missing or empty grid degrades to an empty result instead of throwing.

## Signature

```ts
export type Cell = number;
export type Grid = Cell[][];
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Diagonal = 'up-left' | 'up-right' | 'down-left' | 'down-right';

export interface Neighbor {
  row: number;
  col: number;
  value: Cell;
}

export interface CellPos {
  row: number;
  col: number;
}

export function createGrid(rows: number, cols: number, fill?: Cell): Grid;
export function getNeighbors(
  grid: Grid,
  row: number,
  col: number,
  includeDiagonals?: boolean,
): Array<{ row: number; col: number; value: Cell }>;
export function floodFill(
  grid: Grid,
  startRow: number,
  startCol: number,
  target: Cell,
  replacement: Cell,
): Grid;
export function rotateGrid(grid: Grid, times: 1 | 2 | 3): Grid;
export function findLines(
  grid: Grid,
  length: number,
  target: Cell,
): Array<Array<{ row: number; col: number }>>;
```

## Usage

```tsx
import { createGrid, floodFill, rotateGrid, findLines, getNeighbors } from '@lacuna/grid-utils';

const board = [
  [1, 1, 1],
  [1, 0, 0],
  [0, 0, 0]
];

const neighbors = getNeighbors(board, 0, 0, true);
const filled = floodFill(board, 0, 0, 1, 2);
const spun = rotateGrid(board, 1);
const lines = findLines(board, 3, 1);
const blank = createGrid(4, 4, 0);
```
