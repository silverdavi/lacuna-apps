<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useClipboard at 9c7f3ab. -->

> `@lacuna/use-clipboard` `0.1.0`. To use it in an app: add `"@lacuna/use-clipboard": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-clipboard": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-clipboard'`.

# useClipboard

A React hook that copies a string or an image `Blob` to the system clipboard and exposes a transient `copied` flag for UI feedback. The flag stays true for a configurable number of milliseconds after each successful copy, the timer restarts on every new copy, and `onSuccess` / `onError` callbacks report the outcome. Useful for any copy-to-clipboard affordance, from code formatters to QR generators.

## Signature

```ts
export interface UseClipboardOptions {
  /** Milliseconds the `copied` flag stays true after a successful copy. Default 2000. */
  timeoutMs?: number;
  /** Called after a successful copy. */
  onSuccess?: () => void;
  /** Called after a failed copy. */
  onError?: (err: unknown) => void;
}

export interface UseClipboardReturn {
  /** The text currently staged for copying (last argument to `copy`). */
  text: string;
  /** True for `timeoutMs` after a successful copy. */
  copied: boolean;
  /** Copy `value` to the clipboard. Accepts a string or a Blob (image). */
  copy: (value: string | Blob) => Promise<void>;
  /** Reset `copied` to false immediately. */
  reset: () => void;
}

export function useClipboard(options?: UseClipboardOptions): UseClipboardReturn;
```

## Usage

```tsx
import { useState } from 'react';
import { useClipboard } from '@lacuna/use-clipboard';

export function CopyButton() {
  const [value, setValue] = useState('hello');
  const { copied, copy } = useClipboard({ timeoutMs: 1500 });
  return (
    <>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={() => void copy(value)}>{copied ? 'Copied!' : 'Copy'}</button>
    </>
  );
}
```
