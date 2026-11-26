<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components FlipCard at f879fb0. -->

> `@lacuna/flip-card` `0.1.0`. To use it in an app: add `"@lacuna/flip-card": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/flip-card": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/flip-card'`.

# FlipCard

A two-sided card that flips between its front and back on click or Enter, for flashcard and vocabulary apps where the user sees a prompt, reveals the answer, and optionally grades recall. The card is a `role="button"` whose accessible name comes from the `front` prop and whose `aria-pressed` mirrors the flip state. When `onGrade` is provided, the back also shows six grade buttons named "Grade 0" through "Grade 5"; when `disabled` is set the card cannot flip and no grade buttons render.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `front` | `string` | — | Text on the front face; also the card's accessible name. |
| `back` | `string` | — | Text on the back face, hidden until flipped. |
| `onGrade` | `(grade: number) => void` | — | When set, renders Grade 0–5 buttons on the back and reports the chosen grade. |
| `disabled` | `boolean` | `false` | Blocks flipping and hides the grade buttons. |

## Usage

```tsx
import { FlipCard } from '@lacuna/flip-card'
import { useState } from 'react'

export function FlashcardExample() {
  const [grade, setGrade] = useState<number | null>(null)
  return (
    <FlipCard
      front="What is 2+2?"
      back="4"
      onGrade={(g) => setGrade(g)}
    />
  )
}
```
