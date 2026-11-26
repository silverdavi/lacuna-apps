<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Keypad at 4cddd6c. -->

> `@lacuna/keypad` `0.1.0`. To use it in an app: add `"@lacuna/keypad": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/keypad": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/keypad'`.

# Keypad

Renders an on-screen grid of keys (digits, letters, or symbols) that mirrors physical keyboard input. Used by calculators, PIN entry, and other apps that need a visible key layout for touch or mouse interaction. The component listens for `keydown` on the document so physical digit, Backspace, and Enter keys drive the same callbacks as clicking the on-screen keys.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `keys` | `KeypadKey[]` | required | Keys to render, in row-major order. Each key has a `label`, `value`, optional `span`, `rowSpan`, and `disabled` flag. |
| `columns` | `number` | required | Number of columns in the CSS grid. |
| `onKey` | `(value: string) => void` | required | Called when a key is activated (click or matching physical key press). |
| `onBackspace` | `() => void` | — | Called when Backspace is pressed (physical or on-screen). |
| `onEnter` | `() => void` | — | Called when Enter is pressed. |
| `ariaLabel` | `string` | — | Accessible label for the keypad group. |

The root element has `role="group"` and is labelled by `ariaLabel`. Every key is a `<button>` whose accessible name equals its `label`. Disabled keys carry `aria-disabled="true"` and are excluded from Tab navigation. Physical key input is mirrored via a document-level `keydown` listener that matches the pressed key against the `value` of each `KeypadKey`.

## Usage

```tsx
import { Keypad, type KeypadKey } from '@lacuna/keypad'

const keys: KeypadKey[] = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
]

export function Example() {
  return (
    <Keypad keys={keys} columns={3} onKey={(v) => console.log(v)} ariaLabel="Demo pad" />
  )
}
```
