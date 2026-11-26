<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components QuestionCard at 27329c5. -->

> `@lacuna/question-card` `0.1.0`. To use it in an app: add `"@lacuna/question-card": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/question-card": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/question-card'`.

# QuestionCard

A widget that presents a single quiz question. Depending on `type` it renders
multiple-choice buttons (`choice`) or a text input (`text`, `number`), grades
the answer on submission (choice grading happens on click; submitted text is
compared against `correctAnswer`, optionally case-insensitive, or parsed and
compared against `correctValue` within `tolerance`), shows `Correct` or
`Incorrect` feedback, and then offers a "Next question" button that reports the
outcome through `onNext(correct)`. A `disabled` card is inert: its input is
disabled, its choice buttons are disabled, and no Next button is rendered.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `prompt` | `string` | The question text, rendered as an `h2` heading. |
| `type` | `'choice' \| 'text' \| 'number'` | Which answer controls to render and how to grade. |
| `options` | `string[]` (optional) | Buttons for `type='choice'`. |
| `correctAnswer` | `string` (optional) | Expected answer for `choice` and `text`. |
| `correctValue` | `number` (optional) | Expected answer for `type='number'`. |
| `tolerance` | `number` (optional) | Allowed absolute error for numbers. Defaults to `0`. |
| `caseSensitive` | `boolean` (optional) | Treat `text`/`choice` matching as case-sensitive. Defaults to `false`. |
| `onNext` | `(correct: boolean) => void` | Called by the Next button with the grading result. |
| `disabled` | `boolean` (optional) | Makes the card inert; the Next button is not rendered. |
| `resultLine` | `string` (optional) | Renders a small status line inside the card (the demo uses it for "Last result: …"). |

## Usage

```tsx
import { useState } from 'react'
import { QuestionCard } from '@lacuna/question-card'

function Quiz() {
  const [result, setResult] = useState<boolean | null>(null)

  return (
    <QuestionCard
      prompt="What is 7 × 8?"
      type="number"
      correctValue={56}
      onNext={setResult}
      resultLine={result === null ? 'Last result: none' : `Last result: ${result}`}
    />
  )
}
```
