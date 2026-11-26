<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components FileToolKit at 9c7f3ab. -->

> `@lacuna/file-tool-kit` `0.1.0`. To use it in an app: add `"@lacuna/file-tool-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/file-tool-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/file-tool-kit'`.

# FileToolKit

A drop-in composition that lets a user drop or pick a local file, preview it, choose transformation options, apply the transform, and export the result. It wires a file drop zone, an options panel, a before/after preview, and an export menu together into one kit used by file-processing apps such as Image Resizer, File Converter, and PDF Toolkit.

## Props

- `accept?: string` — Accept attribute forwarded to the file input, e.g. `"image/*"`.
- `maxSizeBytes?: number` — Maximum file size in bytes; files above this are rejected with a "File too large" message.
- `options?: FileToolKitOptions` — Options panel: each key is an option id, value is the initial value (string, number, or boolean).
- `transform: (file: File, options: FileToolKitOptions) => Promise<Blob>` — Transform function; the "after" preview updates when it resolves.
- `exportFormats?: Array<'csv' | 'json' | 'png' | 'pdf' | 'print'>` — Export formats offered in the export menu.
- `title?: string` — Label for the kit heading (level 2) and the options group.
- `dropZoneProps?`, `beforeAfterProps?`, `exportMenuProps?` — Forwarded to the internal drop zone, before/after, and export menu.

## Usage

```tsx
import { FileToolKit } from '@lacuna/file-tool-kit'
import type { FileToolKitOptions } from '@lacuna/file-tool-kit'

async function resize(file: File, options: FileToolKitOptions): Promise<Blob> {
  const bytes = await file.arrayBuffer()
  void options
  return new Blob([bytes], { type: 'image/png' })
}

export function App() {
  return (
    <FileToolKit
      title="Image Resizer"
      accept="image/*"
      maxSizeBytes={10 * 1024 * 1024}
      options={{ format: 'png', quality: 90, watermark: false }}
      transform={resize}
      exportFormats={['png', 'json']}
    />
  )
}
```

## Notes

The spec's "Uses" section references `@lacuna/file-drop-zone`, which does not exist in this repository (only `BeforeAfter` and `ExportMenu` are present as siblings). Per the spec's "Out of scope" clause ("the kit does not implement its own viewer"), the drop zone is implemented inline in `src/FileToolKit.tsx` rather than imported from a missing sibling. `FileDropZoneProps` is defined locally in `src/types.ts` and re-exported so the public surface still names it.
