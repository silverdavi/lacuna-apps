<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useUndoStack at 9c7f3ab. -->

> `@lacuna/use-undo-stack` `0.1.0`. To use it in an app: add `"@lacuna/use-undo-stack": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-undo-stack": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-undo-stack'`.

# useUndoStack

Undo and redo for any editor state — paint strokes, form edits, list reorders. `useUndoStack` holds a present value plus past and future stacks, with an optional cap on how many steps are kept.

## Signature

```ts
export type UndoStack<T> = {
  value: T
  set: (next: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  reset: (value: T) => void
  canUndo: boolean
  canRedo: boolean
}
export function useUndoStack<T>(initial: T, options?: { limit?: number }): UndoStack<T>
```

- `set` pushes the current value onto the past stack and clears the future; an `Object.is`-equal value is a no-op.
- `undo` / `redo` move between the stacks; both are no-ops when their stack is empty.
- `reset(value)` replaces the value and empties both stacks.
- `{ limit: n }` keeps at most `n` past entries, dropping the oldest.

## Usage

```tsx
import { useUndoStack } from '@lacuna/use-undo-stack'

function Counter() {
  const counter = useUndoStack(0)
  return (
    <div>
      <span>{counter.value}</span>
      <button onClick={() => counter.set((v) => v + 1)}>Add one</button>
      <button onClick={() => counter.undo()} disabled={!counter.canUndo}>
        Undo
      </button>
      <button onClick={() => counter.redo()} disabled={!counter.canRedo}>
        Redo
      </button>
    </div>
  )
}
```
