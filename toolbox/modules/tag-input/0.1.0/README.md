<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components TagInput at 9c7f3ab. -->

> `@lacuna/tag-input` `0.1.0`. To use it in an app: add `"@lacuna/tag-input": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/tag-input": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/tag-input'`.

# TagInput

A text input for building lists of tags: typed text becomes a removable chip on Enter,
chips can be removed with their remove button or with Backspace on an empty input, and an
optional `suggestions` list powers an autocomplete listbox that filters as the user types
(prefix match). The listbox supports ArrowDown/ArrowUp with wraparound, Enter to select the
highlighted suggestion, and Escape to close it without committing. `maxTags` caps the number
of tags (the input stays active but refuses new tags, so Backspace can still remove one),
and `disabled` freezes the whole control.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `tags` | `string[]` | The current tags, rendered as chips in order. |
| `onChange` | `(tags: string[]) => void` | Called with the next tag list after any add or remove. |
| `suggestions` | `string[]` | Optional autocomplete pool; only suggestions not already tagged and matching the typed prefix are listed. |
| `placeholder` | `string` | Shown in the input when it is empty (defaults to "Add tag"). |
| `maxTags` | `number` | Optional cap on the number of tags; new tags are refused once reached. |
| `disabled` | `boolean` | Disables the input and all remove buttons. |
| `aria-label` | `string` | Accessible name for the input (defaults to "Add tag"). |

## Usage

```tsx
import { useState } from 'react'
import { TagInput } from '@lacuna/tag-input'

function Example() {
  const [tags, setTags] = useState<string[]>(['react'])
  return (
    <TagInput
      tags={tags}
      onChange={setTags}
      suggestions={['react', 'typescript', 'css']}
      placeholder="Type a tag, press Enter"
    />
  )
}
```
