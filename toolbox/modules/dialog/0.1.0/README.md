<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Dialog at 9c7f3ab. -->

> `@lacuna/dialog` `0.1.0`. To use it in an app: add `"@lacuna/dialog": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/dialog": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/dialog'`.

# Dialog

An accessible modal dialog for interrupting the user with a confirmation, form, or detail view without navigating away. It traps Tab/Shift+Tab focus inside the dialog while open, closes on Escape by calling `onClose`, and returns focus to the element that opened it (the trigger) once it unmounts. The dialog heading provides the accessible name via `aria-labelledby`.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `open` | `boolean` | Whether the dialog is rendered. `false` renders nothing. |
| `onClose` | `() => void` | Called when Escape is pressed while open. The parent flips `open` to close. |
| `title` | `string` | Heading text; becomes the dialog's accessible name. |
| `children` | `React.ReactNode` | Dialog body content. |

## Usage

```tsx
import { useState } from 'react'
import { Dialog } from '@lacuna/dialog'

export function ConfirmExample() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open Dialog
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirm Action">
        <p>Are you sure?</p>
        <button type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </Dialog>
    </>
  )
}
```
