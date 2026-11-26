<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components quizEngine at 9c7f3ab. -->

> `@lacuna/quiz-engine` `0.1.0`. To use it in an app: add `"@lacuna/quiz-engine": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/quiz-engine": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/quiz-engine'`.

# quizEngine

Pure functions for building a question bank, creating shuffled quiz sessions, checking answers (multiple-choice, free-text, numeric), and computing scores. Used by quiz and practice apps that need deterministic, seedable question ordering and flexible answer validation.

## Signature

```ts
export type QuestionType = 'choice' | 'text' | 'number';

export interface ChoiceQuestion {
  type: 'choice';
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface TextQuestion {
  type: 'text';
  id: string;
  prompt: string;
  correctAnswer: string;
  caseSensitive: boolean;
}

export interface NumberQuestion {
  type: 'number';
  id: string;
  prompt: string;
  correctValue: number;
  tolerance: number;
}

export type Question = ChoiceQuestion | TextQuestion | NumberQuestion;

export interface QuizSession {
  questions: Question[];
  seed: number;
}

export interface AnswerResult {
  questionId: string;
  correct: boolean;
  given: string | number;
}

export interface Score {
  total: number;
  correct: number;
  percentage: number;
}

export function createSession(questions: Question[], seed: number): QuizSession;
export function checkAnswer(question: Question, given: string | number): boolean;
export function scoreSession(session: QuizSession, answers: AnswerResult[]): Score;
export function validateQuestionBank(questions: Question[]): string[];
```

## Usage

```tsx
import { createSession, checkAnswer, scoreSession, validateQuestionBank } from '@lacuna/quiz-engine';

const bank = [
  { type: 'choice' as const, id: 'q1', prompt: 'Capital of France?', options: ['Paris', 'Lyon'], correctIndex: 0 },
  { type: 'text' as const, id: 'q2', prompt: 'Largest planet?', correctAnswer: 'jupiter', caseSensitive: false },
];

const issues = validateQuestionBank(bank);
const session = createSession(bank, 42);
const ok = checkAnswer(session.questions[0]!, 'Paris');
const score = scoreSession(session, [
  { questionId: 'q1', correct: ok, given: 'Paris' },
  { questionId: 'q2', correct: checkAnswer(session.questions[1]!, 'Jupiter'), given: 'Jupiter' },
]);
```
