<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CodeArea at 9c7f3ab. -->

> `@lacuna/code-area` `0.1.0`. To use it in an app: add `"@lacuna/code-area": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/code-area": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/code-area'`.

# CodeArea

A monospace text editor with line numbers, tab-to-spaces conversion, and light regex-based syntax highlighting for code or plain text. It is used by apps that need an inline code or text editing surface such as Markdown Editor, JSON Formatter, and Typing Test.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | — | Current editor value (controlled). Provide `onChange` to keep it in sync. |
| `defaultValue` | `string` | `''` | Initial value when uncontrolled (no `value` prop). |
| `onChange` | `(value: string) => void` | — | Called with the next value on edit. |
| `tabSize` | `number` | `2` | Spaces inserted for a Tab key press. |
| `maxLines` | `number` | `500` | Maximum number of line-number cells rendered. |
| `language` | `'plain' \| 'json' \| 'js' \| 'ts' \| 'html' \| 'css' \| 'md'` | `'plain'` | Optional language hint for light highlighting. |
| `readOnly` | `boolean` | `false` | Whether the editor is read-only. |
| `ariaLabel` | `string` | `'Code editor'` | Accessible label for the textarea. |
| `showLineNumbers` | `boolean` | `true` | Whether to render the line-number gutter. |

## Usage

```tsx
import { useState } from 'react'
import { CodeArea } from '@lacuna/code-area'

export function Example() {
  const [value, setValue] = useState('{\n  "a": 1\n}')
  return (
    <>
      <CodeArea value={value} onChange={setValue} language="json" ariaLabel="JSON editor" />
      <CodeArea defaultValue="console.log('hi')" language="js" ariaLabel="JS editor" />
    </>
  )
}
```
