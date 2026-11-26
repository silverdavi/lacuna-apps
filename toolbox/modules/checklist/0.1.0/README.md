<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Checklist at 5271c52. -->

> `@lacuna/checklist` `0.1.0`. To use it in an app: add `"@lacuna/checklist": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/checklist": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/checklist'`.

# Checklist

A checkable list widget for task lists, to-do apps, and planners. It renders a named region containing a list whose items can be toggled, added inline, renamed inline, removed, and reordered by pointer drag or by arrow keys (via `useDragReorder`). An optional progress bar tracks the done count, and the component is fully stateless: the parent owns the items array and receives the new ordering or edits through callbacks.

## Props

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `items` | `ChecklistItem[]` | — | The list of items: `id`, `label`, `done`. |
| `onToggle` | `(id: string) => void` | — | Called when an item's done state toggles. |
| `onAdd` | `(label: string) => void` | — | Called when a new item is added with the given label. |
| `onEdit` | `(id: string, label: string) => void` | — | Called when an item's label is edited. |
| `onRemove` | `(id: string) => void` | — | Called when an item is removed. |
| `onReorder` | `(ids: string[]) => void` | — | Called when items are reordered; receives the new ordered array of ids. |
| `showProgress` | `boolean` | `true` | Whether to show the progress bar. |
| `allowEdit` | `boolean` | `true` | Whether to allow inline editing of labels. |
| `allowRemove` | `boolean` | `true` | Whether to allow removing items. |
| `checklistLabel` | `string` | `'Checklist'` | Accessible label for the checklist region. |
| `footer` | `ReactNode` | — | Optional custom content rendered after the list. |

`ChecklistItem` is `{ id: string; label: string; done: boolean }`.

## Usage

```tsx
import { useState } from 'react';
import { Checklist } from '@lacuna/checklist';
import type { ChecklistItem } from '@lacuna/checklist';

export function Example() {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', label: 'Task A', done: false },
    { id: '2', label: 'Task B', done: true },
  ]);

  return (
    <Checklist
      items={items}
      onToggle={(id) => setItems(items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))}
      onAdd={(label) => setItems([...items, { id: String(items.length + 1), label, done: false }])}
      onEdit={(id, label) => setItems(items.map((it) => (it.id === id ? { ...it, label } : it)))}
      onRemove={(id) => setItems(items.filter((it) => it.id !== id))}
      onReorder={(ids) => setItems(ids.map((x) => items.find((it) => it.id === x)!))}
    />
  );
}
```
