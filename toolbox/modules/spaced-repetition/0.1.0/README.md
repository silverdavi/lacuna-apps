<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components spacedRepetition at 9c7f3ab. -->

> `@lacuna/spaced-repetition` `0.1.0`. To use it in an app: add `"@lacuna/spaced-repetition": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/spaced-repetition": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/spaced-repetition'`.

# spacedRepetition

SM-2 style spaced-repetition scheduling. It tracks each card's state (ease factor, interval, repetitions, due date), applies a review grade to update the schedule, and derives a due queue and summary stats (total, due, learning, mature) for the deck. Designed for flashcard and vocabulary apps that need adaptive review timing without a full scheduler.

## Signature

```ts
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface CardState {
  id: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
}

export interface ReviewResult {
  card: CardState;
  nextDueDate: string;
}

export function newCard(id: string, today: string): CardState;
export function reviewCard(card: CardState, grade: Grade, today: string): ReviewResult;
export function getDueQueue(cards: CardState[], today: string): CardState[];
export function getStats(cards: CardState[], today: string): { total: number; due: number; learning: number; mature: number };
```

Dates are ISO `YYYY-MM-DD` strings. Grades `0`–`2` reset the card to a fresh card due today and lower the ease factor; grades `3`–`5` advance the interval and raise or hold it. The ease factor is floored at `1.3`.

## Usage

```tsx
import { newCard, reviewCard, getDueQueue, type CardState } from '@lacuna/spaced-repetition';

export function ReviewQueue({ cards, today }: { cards: CardState[]; today: string }) {
  const due = getDueQueue(cards, today);
  return (
    <ul>
      {due.map((card) => {
        const next = reviewCard(card, 4, today);
        return <li key={card.id}>{card.id} → due {next.nextDueDate}</li>;
      })}
      {due.length === 0 && <li>{`Nothing due today. New: ${newCard('fresh', today).dueDate}`}</li>}
    </ul>
  );
}
```
