// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/text-stats 0.1.0: snapshot of lacuna-components textStats at 6188248 by sync-toolbox-components.py; a change gets a new version.
export interface TextStats {
  readonly words: number;
  readonly characters: number;
  readonly charactersNoSpaces: number;
  readonly sentences: number;
  readonly paragraphs: number;
  readonly readingTimeMinutes: number;
}

const DEFAULT_WPM = 200;

function countWords(text: string): number {
  const m = text.match(/\S+/g);
  return m ? m.length : 0;
}

function countSentences(text: string): number {
  const segments = text.split(/[.!?]+/);
  let count = 0;
  for (const segment of segments) {
    if (segment.trim().length > 0) count += 1;
  }
  return count;
}

function countParagraphs(text: string): number {
  const blocks = text.split(/\n\s*\n/);
  let count = 0;
  for (const block of blocks) {
    if (block.trim().length > 0) count += 1;
  }
  return count;
}

function readingTimeMinutes(words: number, wpm: number): number {
  if (words === 0 || wpm <= 0) return 0;
  return Math.round(words / wpm);
}

export function textStats(text: string, wpm: number = DEFAULT_WPM): TextStats {
  const words = countWords(text);
  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    readingTimeMinutes: readingTimeMinutes(words, wpm),
  };
}
