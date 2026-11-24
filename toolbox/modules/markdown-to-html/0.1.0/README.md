<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components markdownToHtml at 6e67435. -->

> `@lacuna/markdown-to-html` `0.1.0`. To use it in an app: add `"@lacuna/markdown-to-html": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/markdown-to-html": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/markdown-to-html'`.

# markdownToHtml

Converts a CommonMark subset to sanitized HTML strings.

Supports headings, paragraphs, unordered/ordered lists, links, inline code,
fenced code blocks, tables, and task lists. Raw HTML in the source is
escaped, and generated output is sanitized to strip dangerous constructs
(script tags, event handlers, `javascript:`/`data:` URLs).

## Signature

```ts
export interface MarkdownToHtmlOptions {
  /** If true, task list checkboxes are rendered as disabled inputs. Default: true. */
  taskLists?: boolean
  /** If true, tables are rendered as HTML tables. Default: true. */
  tables?: boolean
}

export function markdownToHtml(markdown: string, options?: MarkdownToHtmlOptions): string
export function parseMarkdown(markdown: string): string
export function sanitizeHtml(html: string): string
```

## Usage

```tsx
import { markdownToHtml } from '@lacuna/markdown-to-html'

const html = markdownToHtml('# Title\n\n- item one\n- item two')
// "<h1>Title</h1>\n<ul>\n<li>item one</li>\n<li>item two</li>\n</ul>"

const noTables = markdownToHtml('| a |\n|---|\n| 1 |', { tables: false })
// "<p>| a | |---| | 1 |</p>"
```
