<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ConfirmDialog at 9c7f3ab. -->

> `@lacuna/confirm-dialog` `0.1.0`. To use it in an app: add `"@lacuna/confirm-dialog": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/confirm-dialog": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/confirm-dialog'`.

# ConfirmDialog

A modal dialog that asks the person to confirm or cancel an action, such as deleting an item or clearing a canvas. It is controlled by an `open` prop, traps focus inside the dialog while open, closes on Escape or backdrop click by calling `onCancel`, and returns focus to the element that was focused before it opened. When `danger` is set, the confirm button is styled as destructive.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `open` | `boolean` | Whether the dialog is rendered. `false` renders nothing. |
| `title` | `string` | Heading text; becomes the dialog's accessible name. |
| `message` | `string?` | Supporting text; becomes the dialog's description. |
| `confirmLabel` | `string?` | Confirm button label. Defaults to `"Confirm"`. |
| `cancelLabel` | `string?` | Cancel button label. Defaults to `"Cancel"`. |
| `danger` | `boolean?` | Styles the confirm button as destructive. |
| `onConfirm` | `() => void` | Called when the confirm button is clicked. |
| `onCancel` | `() => void` | Called on the cancel button, Escape, or a backdrop click. |

## Usage

```tsx
import { useState } from 'react'
import { ConfirmDialog } from '@lacuna/confirm-dialog'

export function DeleteExample() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete item
      </button>
      <ConfirmDialog
        open={open}
        title="Delete item"
        message="This cannot be undone."
        danger
        onConfirm={() => {
          setOpen(false)
        }}
        onCancel={() => {
          setOpen(false)
        }}
      />
    </>
  )
}
```
