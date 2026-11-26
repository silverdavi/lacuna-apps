<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components TreeOutline at ecef1e3. -->

> `@lacuna/tree-outline` `0.1.0`. To use it in an app: add `"@lacuna/tree-outline": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/tree-outline": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/tree-outline'`.

# TreeOutline

A nested collapsible tree for outline editors, org charts, and hierarchical data viewers. Nodes expand and collapse with a marker plus state, keyboard navigation follows the WAI-ARIA tree pattern (ArrowRight/ArrowLeft expand and collapse, ArrowUp/ArrowDown move focus, Enter toggles, Home/End jump), and Shift+Arrow keys call `onReorder` with `up`, `down`, `indent`, or `outdent` (the reordering itself is left to the caller, which owns the node data). Roving tabindex keeps exactly one treeitem in the tab stop.

## Signature

```ts
import type { CSSProperties, ReactNode } from 'react';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export interface TreeOutlineProps {
  nodes: TreeNode[];
  onReorder?: (nodeId: string, direction: 'up' | 'down' | 'indent' | 'outdent') => void;
  onToggle?: (nodeId: string, expanded: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function TreeOutline(props: TreeOutlineProps): ReactNode;
```

## Usage

```tsx
import { TreeOutline, type TreeNode } from '@lacuna/tree-outline';

const nodes: TreeNode[] = [
  { id: 'a', label: 'A', children: [{ id: 'b', label: 'B' }] },
  { id: 'c', label: 'C' },
];

export function Example() {
  return <TreeOutline nodes={nodes} label="Tree" onReorder={(id, dir) => console.log(id, dir)} />;
}
```
