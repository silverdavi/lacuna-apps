<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useHotkeys at 9c7f3ab. -->

> `@lacuna/use-hotkeys` `0.1.0`. To use it in an app: add `"@lacuna/use-hotkeys": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-hotkeys": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-hotkeys'`.

# useHotkeys

A React hook that registers scoped keyboard shortcuts with platform-aware modifier keys. The `mod` prefix maps to Meta on macOS and Control elsewhere, so `'mod+k'` works with both Cmd+K and Ctrl+K without any platform detection in user code. Handlers are suppressed while an editable element (`input`, `textarea`, `select`, or a content-editable node) is focused, so shortcuts never fight with typing. Bindings can be toggled off with the `enabled` option or removed at runtime with `unregister(keys)`.

## Signature

```ts
export interface HotkeyBinding {
  keys: string;
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

export interface UseHotkeysOptions {
  enabled?: boolean;
  scope?: string;
}

export interface UseHotkeysReturn {
  bindings: ReadonlyArray<HotkeyBinding>;
  unregister: (keys: string) => void;
}

export function useHotkeys(
  bindings: HotkeyBinding[],
  options?: UseHotkeysOptions
): UseHotkeysReturn;
```

## Usage

```tsx
import { useHotkeys } from '@lacuna/use-hotkeys';

export function Example() {
  const handle = () => console.log('fired');
  const { bindings } = useHotkeys([{ keys: 'mod+k', handler: handle, description: 'Focus search' }]);
  return <p>{bindings.length} hotkeys active</p>;
}
```
