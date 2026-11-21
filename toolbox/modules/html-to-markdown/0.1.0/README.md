<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components htmlToMarkdown at d422a73. -->

> `@lacuna/html-to-markdown` `0.1.0`. To use it in an app: add `"@lacuna/html-to-markdown": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/html-to-markdown": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/html-to-markdown'`.

# htmlToMarkdown

Converts a sanitized HTML string into a Markdown string, stripping scripts, styles, and unsafe URLs.

## Usage

```ts
import { htmlToMarkdown } from '@lacuna/html-to-markdown'

const md = htmlToMarkdown('<h1>Title</h1><p>Hello <strong>world</strong></p>')
// => '# Title\nHello **world**\n'
```
