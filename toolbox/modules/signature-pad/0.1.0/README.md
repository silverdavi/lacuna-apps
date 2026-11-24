<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components SignaturePad at 5271c52. -->

> `@lacuna/signature-pad` `0.1.0`. To use it in an app: add `"@lacuna/signature-pad": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/signature-pad": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/signature-pad'`.

# SignaturePad

A freehand signature pad. Capture pointer strokes on an SVG surface and export
the result as an SVG string or a PNG data URL.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `400` | SVG surface width in CSS px. |
| `height` | `number` | `200` | SVG surface height in CSS px. |
| `disabled` | `boolean` | `false` | Ignore pointer input and disable the buttons. |
| `onClear` | `() => void` | — | Called after the signature is cleared. |
| `onExport` | `(format, data) => void` | — | Called with `'svg'` and an SVG string, then `'png'` and a `data:image/png` URL. |

## Usage

```tsx
import { useState } from 'react'
import { SignaturePad } from '@lacuna/signature-pad'

function App() {
  const [png, setPng] = useState('')

  return (
    <SignaturePad
      width={400}
      height={160}
      onClear={() => console.log('cleared')}
      onExport={(format, data) => {
        if (format === 'png') setPng(data)
      }}
    />
  )
}
```
