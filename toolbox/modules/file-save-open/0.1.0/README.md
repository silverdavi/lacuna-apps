<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components fileSaveOpen at 9c7f3ab. -->

> `@lacuna/file-save-open` `0.1.0`. To use it in an app: add `"@lacuna/file-save-open": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/file-save-open": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/file-save-open'`.

# fileSaveOpen

Pure helper functions for browser file I/O without a UI framework: `saveBlob`, `saveText`, and `saveJSON` trigger a download of a `Blob`, text string, or serialized value under a given filename (optionally with a MIME type), and `openFile` reads a caller-supplied `File` as text, raw bytes, or parsed JSON, returning a discriminated `{ ok, data }` / `{ ok: false, error }` result.

## Signature

```ts
export interface SaveOptions {
  filename: string;
  mimeType?: string;
}

export function saveBlob(blob: Blob, options: SaveOptions): void;
export function saveText(text: string, options: SaveOptions): void;
export function saveJSON(data: unknown, options: SaveOptions): void;

export type FileReadMode = 'text' | 'bytes' | 'json';

export interface OpenResult<T> { ok: true; data: T; }
export interface OpenError { ok: false; error: string; }

export function openFile(
  file: File,
  mode: FileReadMode,
): Promise<OpenResult<string> | OpenResult<Uint8Array> | OpenResult<unknown> | OpenError>;
```

## Usage

```tsx
import { openFile, saveJSON, saveText } from '@lacuna/file-save-open'

saveText('hello', { filename: 'hello.txt', mimeType: 'text/plain' })
saveJSON({ a: 1 }, { filename: 'data.json' })

async function load(file: File) {
  const result = await openFile(file, 'json')
  if (result.ok) console.log(result.data)
}
```
