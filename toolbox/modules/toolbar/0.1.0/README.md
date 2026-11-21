<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Toolbar at 9c7f3ab. -->

> `@lacuna/toolbar` `0.1.0`. To use it in an app: add `"@lacuna/toolbar": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/toolbar": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/toolbar'`.

# Toolbar

A horizontal tool bar of action buttons. Renders up to `maxVisible` buttons inline; the rest collapse into a "More tools" overflow menu. Supports toggle items, disabled items, keyboard navigation, and hotkey bindings.

## Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| items | `ToolbarItem[]` | — | The tools to render. |
| maxVisible | `number` | — | Maximum buttons rendered inline before overflow. |
| onOverflowChange | `(overflowing: ToolbarItem[]) => void` | — | Called when the set of overflowing items changes. |
| ariaLabel | `string` | `'Toolbar'` | Accessible label for the toolbar region. |

## ToolbarItem

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| id | `string` | — | Stable unique identifier. |
| label | `string` | — | Visible button label. |
| icon | `ReactNode` | — | Optional leading icon. |
| action | `() => void` | — | Invoked when the button is activated. |
| hotkey | `string` | — | Keyboard shortcut, e.g. `'Ctrl+B'`. Registered via `useHotkeys` (platform-aware: `Ctrl` maps to `Cmd` on macOS). |
| type | `'button' \| 'toggle'` | `'button'` | Tool kind; toggles report `aria-pressed`. |
| active | `boolean` | — | Active state for toggle items. |
| disabled | `boolean` | — | Disables the button (`aria-disabled`). |

## Usage

```tsx
import { Toolbar } from '@lacuna/toolbar';
import type { ToolbarItem } from '@lacuna/toolbar';

const apply = (id: string) => console.log('apply', id);

const items: ToolbarItem[] = [
  { id: 'bold', label: 'Bold', type: 'toggle', active: true, hotkey: 'Ctrl+B', action: () => apply('bold') },
  { id: 'italic', label: 'Italic', type: 'toggle', action: () => apply('italic') },
];

<Toolbar items={items} maxVisible={4} ariaLabel="Text formatting" />;
```

## Behavior

- Buttons move focus on `ArrowRight` / `ArrowLeft` within the toolbar.
- The overflow menu closes on `Escape` (returning focus to the trigger) or outside click.
- Disabled items render `aria-disabled` and do not fire `action`.
