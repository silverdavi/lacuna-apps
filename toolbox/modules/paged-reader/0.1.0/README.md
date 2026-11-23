<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components PagedReader at 8aeeaa8. -->

> `@lacuna/paged-reader` `0.1.0`. To use it in an app: add `"@lacuna/paged-reader": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/paged-reader": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/paged-reader'`.

# PagedReader

Displays paginated text content with a progress indicator, page navigation, and bookmark
toggling. It is needed by EPUB readers, comic book readers, and any app that presents
long-form content in discrete pages. The component is fully controlled: the current page
index and the set of bookmarked pages are supplied by the parent, and navigation and
bookmark changes are reported through callbacks. Clamping is handled internally: the
Previous and Next buttons never report a page outside the array. The reader region itself
is focusable and responds to ArrowRight (next page) and ArrowLeft (previous page), and the
progress indicator shows the current position as "N of M".

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pages` | `React.ReactNode[]` | — | Array of page contents (strings or React nodes). |
| `page` | `number` | — | Current page index (0-based). |
| `onPageChange` | `(page: number) => void` | — | Called when the user navigates to a new page index. |
| `bookmarks` | `ReadonlySet<number>` | — | Set of bookmarked page indices. |
| `onToggleBookmark` | `(page: number) => void` | — | Called when the user toggles a bookmark on the current page. |
| `label` | `string` | `'PagedReader'` | Optional accessible label for the reader region. |

## Usage

```tsx
import { useState } from 'react'
import { PagedReader } from '@lacuna/paged-reader'

const pages = ['Page 1', 'Page 2', 'Page 3']

export function Example() {
  const [page, setPage] = useState(0)
  const [bookmarks, setBookmarks] = useState<ReadonlySet<number>>(new Set())

  const toggleBookmark = (target: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(target)) next.delete(target)
      else next.add(target)
      return next
    })
  }

  return (
    <PagedReader
      pages={pages}
      page={page}
      onPageChange={setPage}
      bookmarks={bookmarks}
      onToggleBookmark={toggleBookmark}
    />
  )
}
```
