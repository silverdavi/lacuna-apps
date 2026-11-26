<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Toast at 6188248. -->

> `@lacuna/toast` `0.1.0`. To use it in an app: add `"@lacuna/toast": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/toast": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/toast'`.

# Toast

A transient status message (info, success, or error) that appears fixed at the bottom center of the page, with an optional undo action and an auto-dismiss timer. The container carries `role="status"` for the info/success variants and `role="alert"` for the error variant, is reachable by Tab, and is dismissed by pressing Escape while focused or by the timer.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `message` | `string` | — | Message text to display. |
| `variant` | `'info' \| 'success' \| 'error'` | `'info'` | Visual variant; error uses `role="alert"`. |
| `undoLabel` | `string` | — | Optional undo button label; if provided, an undo button is rendered. |
| `onUndo` | `() => void` | — | Callback when the undo button is clicked. |
| `onDismiss` | `() => void` | — | Callback when the toast is dismissed (auto or manual). |
| `duration` | `number` | `5000` | Auto-dismiss delay in ms. Set to `0` to disable. |

## Usage

```tsx
import { Toast } from '@lacuna/toast';

export function Example() {
  return (
    <Toast
      message="Saved"
      variant="success"
      undoLabel="Undo"
      onUndo={() => console.log('undo')}
      onDismiss={() => console.log('dismissed')}
      duration={0}
    />
  );
}
```
