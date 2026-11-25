<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components MarkdownView at 5a2695c. -->

> `@lacuna/markdown-view` `0.1.0`. To use it in an app: add `"@lacuna/markdown-view": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/markdown-view": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/markdown-view'`.

# MarkdownView

A safe, read-only Markdown viewer built on `@lacuna/markdown-to-html`. It renders a
CommonMark subset (headings, paragraphs, lists, task lists, tables, links, inline and fenced code)
with all raw HTML escaped, and turns task-list items into interactive checkboxes that call
`onTaskToggle` when toggled with Space or a click. The viewer is a labelled region; task
checkboxes are keyboard-reachable with accessible names.

## Props

```ts
export interface MarkdownViewProps {
  source: string
  onTaskToggle?: (index: number, checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}
```

- `source`: the Markdown text to render.
- `onTaskToggle`: called with the zero-based task index and its new checked state when a task
  checkbox is toggled (Space or click).
- `disabled`: when true, task checkboxes do not respond to Space or clicks.
- `label`: accessible name of the region; also the region's `aria-label`.

## Usage

```tsx
import { useState } from 'react'
import { MarkdownView } from '@lacuna/markdown-view'

export function Note() {
  const [tasks, setTasks] = useState([true, false])
  const source = tasks.map((done, i) => `- [${done ? 'x' : ' '}] Item ${i + 1}`).join('\n')
  return (
    <MarkdownView
      source={source}
      label="Tasks"
      onTaskToggle={(index, checked) => setTasks((s) => s.map((v, i) => (i === index ? checked : v)))}
    />
  )
}
```
