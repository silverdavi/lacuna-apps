<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components EditorShellKit at b294bc9. -->

> `@lacuna/editor-shell-kit` `0.1.0`. To use it in an app: add `"@lacuna/editor-shell-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/editor-shell-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/editor-shell-kit'`.

# EditorShellKit

A document editing shell that composes a toolbar, undo/redo history, keyboard
shortcuts, local persistence, autosave status, and export into a single layout
for text-based editor apps such as markdown editors, journals, and form
builders. It renders a labelled region containing a toolbar (Undo, Redo, Save),
a multi-line textarea whose history is kept at character granularity, a record
persisted under `recordKey` with debounced autosave, a "Save status" status
bar, and an export menu with CSV, JSON, and Print options.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `recordKey` | `string` | Unique key for the persisted record. |
| `initialContent` | `string` (optional) | Initial document content (plain text or markdown). |
| `maxHistory` | `number` (optional) | Maximum number of undo history entries. |
| `autosaveInterval` | `number` (optional) | Autosave interval in milliseconds. Default 1000. |
| `showExport` | `boolean` (optional) | Whether to show the export menu. Default `true`. |
| `showStatusBar` | `boolean` (optional) | Whether to show the status bar. Default `true`. |
| `onContentChange` | `(content: string) => void` (optional) | Called on every content change. |
| `onAutosave` | `(content: string) => void` (optional) | Called when autosave completes. |
| `onExport` | `(format: 'csv' \| 'json' \| 'png' \| 'pdf' \| 'print') => void` (optional) | Called when an export is requested. |
| `extraToolbarItems` | `ReactNode` (optional) | Custom toolbar items rendered after the built-in tools. |
| `editorLabel` | `string` (optional) | Accessible label for the editor region. Default "Document Editor". |

Behavior: the document opens on its initial content with an empty history, so
Undo and Redo start disabled. Ctrl/Cmd+Z undoes the last typed character,
Ctrl/Cmd+Y (or Ctrl/Cmd+Shift+Z) redoes it, and Ctrl/Cmd+S saves immediately
without waiting for the autosave interval. The status bar shows "Saved" after
each autosave and "Unsaved changes" otherwise; Escape closes the export menu
and returns focus to its trigger.

## Usage

```tsx
import { EditorShellKit } from '@lacuna/editor-shell-kit';

export default function Page() {
  return <EditorShellKit recordKey="notes" initialContent="Draft" />;
}
```
