<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ExportMenu at 9c7f3ab. -->

> `@lacuna/export-menu` `0.1.0`. To use it in an app: add `"@lacuna/export-menu": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/export-menu": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/export-menu'`.

# ExportMenu

A dropdown menu widget for exporting content as CSV, JSON, PNG, PDF, or triggering a print dialog. It renders an accessible trigger button that opens a `role="menu"` of `role="menuitem"` entries; choosing an entry produces its data through the option's `getData` callback and saves the result as a real browser download named `<fileName>.<extension>` through `fileSaveOpen`. It is intended for apps that need to let users save or print their data, such as Sketch Pad, Markdown Editor, and Stock Inventory Manager.

## Props

```ts
export interface ExportOption {
  /** Unique identifier for the option. */
  id: string
  /** Display label. */
  label: string
  /** MIME type for the export. */
  mimeType: string
  /** File extension (without dot). */
  extension: string
  /** Function that produces the export data. */
  getData: () => string | Blob
}

export interface ExportMenuProps {
  /** List of export options to show in the menu. */
  options: ExportOption[]
  /** Base filename (without extension) for downloads. Default "export". */
  fileName?: string
  /** Accessible label for the trigger button. Default "Export". */
  ariaLabel?: string
  /** Whether the menu is disabled. Default false. */
  disabled?: boolean
  /** Called after a successful export. */
  onExport?: (optionId: string) => void
  /** Called if an export fails. */
  onError?: (optionId: string, error: Error) => void
}

export function ExportMenu(props: ExportMenuProps): React.ReactElement
```

- The trigger button renders the `ariaLabel` text (default `Export`) and carries `aria-label`, `aria-haspopup="menu"`, and `aria-expanded`. When `disabled` it has `aria-disabled="true"` (not the `disabled` attribute) and its click does nothing.
- The menu opens below the trigger with one `role="menuitem"` per option, in order, and its first item receives focus. Arrow keys move between items, `Enter`/Space chooses, and `Escape` closes the menu and returns focus to the trigger.
- Choosing an option calls `getData()`, wraps a `string` result in a `Blob` with the option's `mimeType`, and saves the download named `${fileName}.${extension}`. On success it calls `onExport(option.id)` and closes the menu; if `getData` throws it calls `onError(option.id, error)`, performs no download, and leaves the menu open.

## Usage

```tsx
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'

const options: ExportOption[] = [
  { id: 'csv', label: 'CSV', mimeType: 'text/csv', extension: 'csv', getData: () => 'a,b\n1,2' },
  { id: 'json', label: 'JSON', mimeType: 'application/json', extension: 'json', getData: () => '{"a":1}' },
]

export function Example() {
  return (
    <ExportMenu
      options={options}
      fileName="my-report"
      onExport={(id) => console.log('exported', id)}
      onError={(id, error) => console.error('export failed', id, error.message)}
    />
  )
}
```
