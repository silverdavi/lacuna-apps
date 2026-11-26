<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components csvParse at 9c7f3ab. -->

> `@lacuna/csv-parse` `0.1.0`. To use it in an app: add `"@lacuna/csv-parse": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/csv-parse": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/csv-parse'`.

# csvParse

Pure functions for parsing and writing RFC 4180 CSV text. `parseCsv` turns a string into rows of string fields, honouring quoting (commas, newlines, and doubled quotes inside quoted fields), CRLF and LF line endings, and a configurable delimiter, and reports unterminated quotes with their 1-based line number. With `{ header: true }` the first row is returned as `header` and separated from `rows`. `toCsv` writes rows back to CSV, quoting only fields that need it, and `toRecords` maps rows to objects keyed by the header. No DOM, no type inference.

## Signature

```ts
export type CsvOptions = { delimiter?: string; header?: boolean }
export type CsvResult = { rows: string[][]; header: string[] | null; errors: { line: number; message: string }[] }
export function parseCsv(text: string, options?: CsvOptions): CsvResult
export function toCsv(rows: string[][], options?: { delimiter?: string }): string
export function toRecords(result: CsvResult): Record<string, string>[]
```

## Usage

```tsx
import { parseCsv, toRecords } from '@lacuna/csv-parse'

const result = parseCsv('name,city\nAda,Paris', { header: true })
const records = toRecords(result)
```
