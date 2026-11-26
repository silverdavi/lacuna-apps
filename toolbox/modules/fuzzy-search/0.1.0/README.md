<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components fuzzySearch at 9c7f3ab. -->

> `@lacuna/fuzzy-search` `0.1.0`. To use it in an app: add `"@lacuna/fuzzy-search": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/fuzzy-search": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/fuzzy-search'`.

# fuzzySearch

Ranked fuzzy character-subsequence matching across one or more record fields, returning scored matches with per-field, character-level highlight ranges for search-as-you-type UIs. All fields contribute equally to the score; matching is case-insensitive by default.

## Signature

```ts
export interface FuzzyMatch {
  index: number;
  score: number;
  highlights: Array<{ field: string; start: number; end: number }>;
}

export interface FuzzySearchOptions {
  fields: string[];
  caseSensitive?: boolean;
  maxResults?: number;
}

export function fuzzySearch<T extends Record<string, unknown>>(
  records: T[],
  query: string,
  options: FuzzySearchOptions
): FuzzyMatch[];
```

## Usage

```tsx
import { fuzzySearch } from '@lacuna/fuzzy-search';

const records = [{ name: 'apple' }, { name: 'banana' }];
const matches = fuzzySearch(records, 'app', { fields: ['name'], maxResults: 10 });
for (const match of matches) {
  const record = records[match.index];
  if (record === undefined) continue;
  console.log(match.index, match.score, match.highlights, record.name);
}
```
