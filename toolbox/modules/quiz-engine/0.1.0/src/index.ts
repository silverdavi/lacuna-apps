// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/quiz-engine 0.1.0: snapshot of lacuna-components quizEngine at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { mulberry32, shuffle } from '@lacuna/random';

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

export function createSession(questions: Question[], seed: number): QuizSession {
  const rng = mulberry32(seed);
  return {
    questions: shuffle(rng, questions),
    seed,
  };
}

export function checkAnswer(question: Question, given: string | number): boolean {
  switch (question.type) {
    case 'choice': {
      if (typeof given !== 'string') return false;
      return given === question.options[question.correctIndex];
    }
    case 'text': {
      if (typeof given !== 'string') return false;
      if (question.caseSensitive) {
        return given === question.correctAnswer;
      }
      return given.toLowerCase() === question.correctAnswer.toLowerCase();
    }
    case 'number': {
      if (typeof given !== 'number' || Number.isNaN(given)) return false;
      return Math.abs(given - question.correctValue) <= question.tolerance;
    }
    default:
      return false;
  }
}

export function scoreSession(
  session: QuizSession,
  answers: AnswerResult[],
): Score {
  const total = session.questions.length;
  const correct = answers.filter((a) => a.correct).length;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percentage };
}

export function validateQuestionBank(questions: Question[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      issues.push(`Duplicate question id "${q.id}"`);
      continue;
    }
    seen.add(q.id);
    switch (q.type) {
      case 'choice':
        if (q.options.length < 2) {
          issues.push(`Choice question "${q.id}" must have at least 2 options`);
        }
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          issues.push(`Choice question "${q.id}" has correctIndex out of range`);
        }
        break;
      case 'text':
        if (q.correctAnswer === '') {
          issues.push(`Text question "${q.id}" has an empty correct answer`);
        }
        break;
      case 'number':
        if (Number.isNaN(q.correctValue)) {
          issues.push(`Number question "${q.id}" has a non-numeric correct value`);
        }
        if (q.tolerance < 0) {
          issues.push(`Number question "${q.id}" has a negative tolerance`);
        }
        break;
    }
  }
  return issues;
}
