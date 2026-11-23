<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useDragReorder at 9c7f3ab. -->

> `@lacuna/use-drag-reorder` `0.1.0`. To use it in an app: add `"@lacuna/use-drag-reorder": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-drag-reorder": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-drag-reorder'`.

# useDragReorder

A React hook for reordering items by pointer drag or by arrow keys, within a single list or across multiple lists. Spread the returned `itemProps(listIndex, itemIndex)` onto each item element and `listProps(listIndex)` onto each list container. A drag begins only after the pointer moves past `dragThreshold` (default 4 px), so a simple click never starts a reorder. Arrow keys move the focused item up, down, or across lists; `moveItem` performs a programmatic move without any pointer or keyboard input. A completed reorder reports `(fromList, fromIndex, toList, toIndex)` to `onReorder`; the hook is stateless about ordering and leaves the actual array manipulation to the caller.

## Signature

```ts
export interface DragReorderOptions {
  listCount?: number;
  onReorder?: (fromList: number, fromIndex: number, toList: number, toIndex: number) => void;
  dragThreshold?: number;
}

export interface DragReorderReturn {
  itemProps: (listIndex: number, itemIndex: number) => ItemProps;
  listProps: (listIndex: number) => ListProps;
  isDragging: boolean;
  draggingItem: { listIndex: number; itemIndex: number } | null;
  moveItem: (fromList: number, fromIndex: number, toList: number, toIndex: number) => void;
}

export function useDragReorder(options?: DragReorderOptions): DragReorderReturn;
```

## Usage

```tsx
import { useDragReorder } from '@lacuna/use-drag-reorder';

export function Example() {
  const { itemProps, isDragging } = useDragReorder({
    onReorder: (fromList, fromIndex, toList, toIndex) => console.log(fromList, fromIndex, toList, toIndex),
  });
  return (
    <ul>
      {[0, 1, 2].map((i) => (
        <li key={i} {...itemProps(0, i)}>Item {i}</li>
      ))}
      {isDragging && <span>dragging</span>}
    </ul>
  );
}
```
