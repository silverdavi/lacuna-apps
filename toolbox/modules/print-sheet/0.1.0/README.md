<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components PrintSheet at 6188248. -->

> `@lacuna/print-sheet` `0.1.0`. To use it in an app: add `"@lacuna/print-sheet": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/print-sheet": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/print-sheet'`.

# PrintSheet

A paper-sized layout container (A4 or Letter) with print-specific CSS (page margins, page breaks, label/card grids) for generating printable documents. Used by invoice generators, math worksheets, and other apps that produce print-ready output. Each page is rendered as a separate sheet with a `data-page` attribute, and an optional label grid divides a sheet into equal cells.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `size` | `'A4' \| 'Letter'` | `'A4'` | Paper size. |
| `orientation` | `'portrait' \| 'landscape'` | `'portrait'` | Sheet orientation. |
| `pages` | `number` | `1` | Number of sheets to render. `0` renders an empty container. |
| `labelGrid` | `{ rows: number; columns: number }` | — | When set, divides each sheet into `rows × columns` equal `gridcell` divs. |
| `children` | `React.ReactNode` | required | Content rendered inside each sheet (or each grid cell). |
| `className` | `string` | — | Additional CSS class name on the container. |

The container has `role="document"`, an accessible name of "Print sheet", `data-size` and `data-orientation` attributes, and a `print-sheet` class. Each sheet has a `data-page` attribute, `data-size`/`data-orientation` matching the props, and a `print-sheet__page` class. Print CSS (page breaks, removed borders) is injected via an embedded `<style>` block.

## Usage

```tsx
import { PrintSheet } from '@lacuna/print-sheet'

export function Example() {
  return (
    <PrintSheet size="A4" orientation="portrait" pages={2}>
      <p>Invoice content</p>
    </PrintSheet>
  )
}
```
