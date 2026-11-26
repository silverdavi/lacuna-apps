<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components SearchBox at 9c7f3ab. -->

> `@lacuna/search-box` `0.1.0`. To use it in an app: add `"@lacuna/search-box": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/search-box": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/search-box'`.

# SearchBox

A search input field that displays ranked fuzzy-match results from a record set, with keyboard navigation through results and highlighted match ranges. As you type, records are ranked with `fuzzySearch` and shown in a listbox below the input; an empty query shows the first `maxResults` records.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `records` | `T[]` | required | The record set to search. |
| `fields` | `SearchBoxField[]` | required | Record keys to match against, in display order. |
| `placeholder` | `string` | — | Input placeholder; also the fallback accessible name. |
| `maxResults` | `number` | `10` | Maximum number of results shown. |
| `onSelect` | `(record: T) => void` | — | Called when a result is chosen (Enter or click). |
| `onQueryChange` | `(query: string) => void` | — | Called on every query change, including Escape and clear. |
| `renderResult` | `(record, highlights) => ReactNode` | title of first field | Custom result content; pass matched character ranges as `highlights`. |
| `emptyMessage` | `string` | `"No results"` | Shown when no record matches. |
| `ariaLabel` | `string` | `placeholder` | Accessible name of the input. |

Keyboard: `ArrowDown` from the input moves to the first result, `ArrowDown`/`ArrowUp` move between results, `ArrowUp` on the first result returns to the input, `Enter` selects the focused result, and `Escape` clears the query.

## Usage

```tsx
import { SearchBox } from '@lacuna/search-box'

type Note = { id: string; title: string } & Record<string, unknown>

const notes: Note[] = [
  { id: '1', title: 'Meeting notes' },
  { id: '2', title: 'Trip notes' },
]

export function Example() {
  return (
    <SearchBox
      records={notes}
      fields={[{ key: 'title' }]}
      placeholder="Search"
      onSelect={(note) => console.log(note.id)}
    />
  )
}
```
