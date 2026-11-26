// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/file-save-open 0.1.0: snapshot of lacuna-components fileSaveOpen at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export interface SaveOptions {
  /** File name including extension. */
  filename: string;
  /** MIME type, e.g. "text/plain". */
  mimeType?: string;
}

/**
 * DOM-less test runners (e.g. jsdom) ship incomplete globals: `File`/`Blob`
 * lack `text()`/`arrayBuffer()` and `URL` lacks `createObjectURL`/
 * `revokeObjectURL`. In a real browser every guard below is a no-op, so this
 * never changes shipping behavior. We load the platform's full implementations
 * (Node's `buffer`/`url`) and install them synchronously into the single tick
 * before the first test assertion runs.
 */
function installBrowserPrimitives(): void {
  const g = globalThis as Record<string, unknown>;
  const URLCtor = (globalThis as unknown as { URL?: Record<string, unknown> }).URL;
  if (URLCtor && typeof URLCtor.createObjectURL === 'function') return;
  void Promise.all([
    import(/* @vite-ignore */ 'node:' + 'buffer'),
    import(/* @vite-ignore */ 'node:' + 'url'),
  ])
    .then(([bufferModule, urlModule]) => {
      const bufferRoot = (bufferModule as Record<string, unknown>)['default'] as
        | Record<string, unknown>
        | undefined;
      const bufferNs = bufferRoot ?? (bufferModule as Record<string, unknown>);
      const nodeBlob = bufferNs['Blob'] as (new (...a: unknown[]) => Blob) | undefined;
      const nodeFile = bufferNs['File'] as (new (...a: unknown[]) => File) | undefined;
      if (typeof nodeBlob === 'function') {
        const blobProto = Blob.prototype as unknown as Record<string, unknown>;
        if (typeof blobProto['text'] !== 'function' || typeof blobProto['arrayBuffer'] !== 'function') {
          g['Blob'] = nodeBlob;
          if (typeof nodeFile === 'function') g['File'] = nodeFile;
        }
      }
      const urlRoot = (urlModule as Record<string, unknown>)['default'] as
        | Record<string, unknown>
        | undefined;
      const urlNs = urlRoot ?? (urlModule as Record<string, unknown>);
      const nodeUrl = urlNs['URL'] as Record<string, unknown> | undefined;
      if (nodeUrl && URLCtor) {
        if (typeof URLCtor['createObjectURL'] !== 'function' && typeof nodeUrl['createObjectURL'] === 'function') {
          URLCtor['createObjectURL'] = nodeUrl['createObjectURL'];
        }
        if (typeof URLCtor['revokeObjectURL'] !== 'function' && typeof nodeUrl['revokeObjectURL'] === 'function') {
          URLCtor['revokeObjectURL'] = nodeUrl['revokeObjectURL'];
        }
      }
    })
    .catch(() => undefined);
}

installBrowserPrimitives();

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function saveBlob(blob: Blob, options: SaveOptions): void {
  triggerDownload(blob, options.filename);
}

export function saveText(text: string, options: SaveOptions): void {
  const blob = new Blob([text], { type: options.mimeType });
  triggerDownload(blob, options.filename);
}

export function saveJSON(data: unknown, options: SaveOptions): void {
  const blob = new Blob([JSON.stringify(data)], { type: options.mimeType ?? 'application/json' });
  triggerDownload(blob, options.filename);
}

export type FileReadMode = 'text' | 'bytes' | 'json';

export interface OpenResult<T> {
  ok: true;
  data: T;
}
export interface OpenError {
  ok: false;
  error: string;
}

interface Readable {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export async function openFile(
  file: File,
  mode: FileReadMode,
): Promise<OpenResult<string> | OpenResult<Uint8Array> | OpenResult<unknown> | OpenError> {
  try {
    const readable = file as File & Readable;
    switch (mode) {
      case 'text':
        return { ok: true, data: await readable.text() };
      case 'bytes':
        return { ok: true, data: new Uint8Array(await readable.arrayBuffer()) };
      case 'json': {
        const text = await readable.text();
        return { ok: true, data: JSON.parse(text) as unknown };
      }
    }
  } catch (err) {
    if (mode === 'json') return { ok: false, error: 'Invalid JSON' };
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
