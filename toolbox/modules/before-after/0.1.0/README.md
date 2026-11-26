<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components BeforeAfter at 9c7f3ab. -->

> `@lacuna/before-after` `0.1.0`. To use it in an app: add `"@lacuna/before-after": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/before-after": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/before-after'`.

# BeforeAfter

A comparison widget that shows two pieces of content — typically a "before" and an "after"
image or text block — and lets the user reveal one over the other. In the default `slider`
mode a draggable, keyboard-operable divider splits the two panes; in `side-by-side` mode the
two panes sit next to each other with no divider. The widget only displays the React nodes it
is given; it does no image loading, resizing, or conversion.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `before` | `React.ReactNode` | — | Content for the left/before side. |
| `after` | `React.ReactNode` | — | Content for the right/after side. |
| `mode` | `"slider" \| "side-by-side"` | `"slider"` | Comparison mode. |
| `initialPosition` | `number` | `0.5` | Initial slider position as a fraction 0–1. |
| `ariaLabel` | `string` | `"Comparison slider"` | Accessible label for the slider handle. |
| `minHeight` | `number` | `12` | Minimum height in scale units (× `var(--sf)`). |
| `disabled` | `boolean` | `false` | Disables the slider handle. |

In `slider` mode the handle exposes `role="slider"`, `aria-valuemin="0"`,
`aria-valuemax="100"`, and `aria-valuenow` as the current percentage. Arrow keys move the
handle by 5; Home/End jump to the edges; clicking the track moves the handle to the pointer.
In `side-by-side` mode the container is a `role="group"` labeled "Before and after
comparison".

## Usage

```tsx
import { BeforeAfter } from '@lacuna/before-after'

export function Example() {
  return (
    <BeforeAfter
      before={<img src="a.png" alt="A" />}
      after={<img src="b.png" alt="B" />}
    />
  )
}
```
