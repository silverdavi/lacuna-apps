// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/grid-utils 0.1.0: snapshot of lacuna-components gridUtils at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
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

export function createGrid(rows: number, cols: number, fill: Cell = 0): Grid {
  if (rows <= 0 || cols <= 0) return [];
  const out: Grid = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) row.push(fill);
    out.push(row);
  }
  return out;
}

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

const DIAG: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

export function getNeighbors(
  grid: Grid,
  row: number,
  col: number,
  includeDiagonals: boolean = false
): Neighbor[] {
  const rows = grid.length;
  const cols = grid.length > 0 ? (grid[0]?.length ?? 0) : 0;
  const deltas = includeDiagonals ? [...ORTHO, ...DIAG] : ORTHO;
  const out: Neighbor[] = [];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const value = grid[nr]?.[nc];
    if (value === undefined) continue;
    out.push({ row: nr, col: nc, value });
  }
  return out;
}

export function floodFill(
  grid: Grid,
  startRow: number,
  startCol: number,
  target: Cell,
  replacement: Cell
): Grid {
  const rows = grid.length;
  const copy: Grid = grid.map((r) => (r ? r.slice() : []));
  if (startRow < 0 || startRow >= rows) return copy;
  const startRowArr = grid[startRow];
  if (startRowArr === undefined) return copy;
  if (startCol < 0 || startCol >= startRowArr.length) return copy;
  const startValue = startRowArr[startCol];
  if (startValue === undefined || startValue !== target) return copy;
  if (startValue === replacement) return copy;

  const stack: Array<[number, number]> = [[startRow, startCol]];
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === undefined) break;
    const [r, c] = top;
    const rowArr = copy[r];
    if (rowArr === undefined) continue;
    if (rowArr[c] !== target) continue;
    rowArr[c] = replacement;
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows) continue;
      const nrow = copy[nr];
      if (nrow === undefined) continue;
      if (nrow[nc] === target) stack.push([nr, nc]);
    }
  }
  return copy;
}

export function rotateGrid(grid: Grid, times: 1 | 2 | 3): Grid {
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0]?.length ?? 0;
  if (times === 2) {
    const out: Grid = [];
    for (let r = 0; r < rows; r++) {
      const src = grid[rows - 1 - r];
      out.push(src ? src.slice().reverse() : []);
    }
    return out;
  }
  const newRows = cols;
  const out: Grid = [];
  for (let r = 0; r < newRows; r++) {
    const rowArr: Cell[] = [];
    for (let c = 0; c < rows; c++) {
      if (times === 1) {
        const src = grid[rows - 1 - c];
        const v = src ? src[r] : undefined;
        rowArr.push(v ?? 0);
      } else {
        const src = grid[c];
        const v = src ? src[cols - 1 - r] : undefined;
        rowArr.push(v ?? 0);
      }
    }
    out.push(rowArr);
  }
  return out;
}

const LINES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
];

function cellKey(cell: CellPos): string {
  return `${cell.row}:${cell.col}`;
}

export function findLines(
  grid: Grid,
  length: number,
  target: Cell
): CellPos[][] {
  const rows = grid.length;
  if (rows === 0 || length < 1) return [];
  const cols = grid[0]?.length ?? 0;
  if (length > rows && length > cols) return [];

  const seen = new Set<string>();
  const out: CellPos[][] = [];
  for (const [dr, dc] of LINES) {
    const maxStartRow = dr > 0 ? rows - length : dr < 0 ? length - 1 : rows;
    const maxStartCol = dc > 0 ? cols - length : dc < 0 ? length - 1 : cols;
    for (let r = 0; r <= maxStartRow; r++) {
      for (let c = 0; c <= maxStartCol; c++) {
        let ok = true;
        const cells: CellPos[] = [];
        for (let k = 0; k < length; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) {
            ok = false;
            break;
          }
          const v = grid[rr]?.[cc];
          if (v !== target) {
            ok = false;
            break;
          }
          cells.push({ row: rr, col: cc });
        }
        if (!ok) continue;
        const norm = cells.slice().sort((a, b) => a.row - b.row || a.col - b.col);
        const key = norm.map(cellKey).join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cells);
      }
    }
  }
  return out;
}
