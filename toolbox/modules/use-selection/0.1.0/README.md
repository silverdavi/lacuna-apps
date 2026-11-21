<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useSelection at 9c7f3ab. -->

> `@lacuna/use-selection` `0.1.0`. To use it in an app: add `"@lacuna/use-selection": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-selection": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-selection'`.

# useSelection

A React hook that manages selection state over a list of logical indices. It supports three modes: `single` (one item at a time, toggling replaces the selection), `multi` (independent toggles that accumulate), and `range` (a `selectRange(from, to)` that fills the inclusive span between two bounds, reversed bounds handled). It exposes the current selection as a `ReadonlySet<number>`, an `isSelected` predicate, `toggle`, `clear`, `selectRange`, and `selectAll`. `selectAll` covers `0` through the largest index ever passed to `toggle` or `selectRange`, or `0` through `99` when there has been no prior interaction. The hook is list-agnostic: it knows nothing about rendering, virtualization, or persistence.

## Signature

```ts
export interface UseSelectionOptions {
  mode: 'single' | 'multi' | 'range';
  initial?: number[];
}

export interface UseSelectionReturn {
  selected: ReadonlySet<number>;
  isSelected: (index: number) => boolean;
  toggle: (index: number) => void;
  clear: () => void;
  selectRange: (from: number, to: number) => void;
  selectAll: () => void;
}

export function useSelection(options: UseSelectionOptions): UseSelectionReturn;
```

## Usage

```tsx
import { useSelection } from '@lacuna/use-selection';

export function Example() {
  const { selected, toggle, clear } = useSelection({ mode: 'multi' });
  return (
    <div>
      <button onClick={() => toggle(0)}>Toggle 0</button>
      <button onClick={clear}>Clear</button>
      <span>{selected.size} selected</span>
    </div>
  );
}
```
