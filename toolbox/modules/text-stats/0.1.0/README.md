<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components textStats at 6188248. -->

> `@lacuna/text-stats` `0.1.0`. To use it in an app: add `"@lacuna/text-stats": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/text-stats": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/text-stats'`.

# textStats

Computes word, character, sentence, paragraph counts and estimated reading time from a text string. Used by writing and typing apps such as Typing Test and Word Counter. Single-shot, pure, and allocation-light: sentences are delimited by `.`, `!`, `?`, paragraphs by blank lines, and reading time is the word count divided by a words-per-minute rate (default 200), rounded to the nearest minute.

## Signature

```ts
export interface TextStats {
  readonly words: number;
  readonly characters: number;
  readonly charactersNoSpaces: number;
  readonly sentences: number;
  readonly paragraphs: number;
  readonly readingTimeMinutes: number;
}

export function textStats(text: string, wpm?: number): TextStats;
```

## Usage

```tsx
import { textStats } from '@lacuna/text-stats'

const stats = textStats('Para one.\n\nPara two.', 200)
const minutes: number = stats.readingTimeMinutes
```
