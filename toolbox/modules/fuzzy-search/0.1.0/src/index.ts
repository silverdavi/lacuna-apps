// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/fuzzy-search 0.1.0: snapshot of lacuna-components fuzzySearch at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
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
): FuzzyMatch[] {
  if (query.length === 0 || records.length === 0) {
    return [];
  }

  const { fields, caseSensitive = false, maxResults = Infinity } = options;

  const matches: FuzzyMatch[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record === undefined) continue;
    const fieldHighlights: Array<{ field: string; start: number; end: number }> = [];
    let totalScore = 0;
    let matched = false;

    for (const field of fields) {
      const value = record[field];
      if (typeof value !== 'string') continue;

      const haystack = caseSensitive ? value : value.toLowerCase();
      const needle = caseSensitive ? query : query.toLowerCase();

      const found = matchPositions(haystack, needle);
      if (found.length > 0) {
        matched = true;
        totalScore += scoreMatch(found, needle.length, haystack.length);
        for (const pos of found) {
          fieldHighlights.push({ field, start: pos.start, end: pos.end });
        }
      }
    }

    if (matched) {
      matches.push({ index: i, score: totalScore, highlights: fieldHighlights });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, maxResults);
}

interface MatchPosition {
  start: number;
  end: number;
}

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function matchPositions(haystack: string, needle: string): MatchPosition[] {
  const n = needle.length;
  const h = haystack.length;
  // can[i][j] = true if needle[j..n-1] can be matched against haystack[i..h-1].
  // Whitespace in the needle is transparent: it does not consume a haystack character.
  const can: boolean[][] = new Array<boolean[]>(h + 1).fill(null as unknown as boolean[]).map(() => []);
  for (let i = h; i >= 0; i--) {
    const row = new Array<boolean>(n + 1).fill(false);
    row[n] = true;
    can[i] = row;
    if (i === h) continue;
    const hayChar = haystack[i]!;
    for (let j = n - 1; j >= 0; j--) {
      const needleChar = needle[j]!;
      if (isSpace(needleChar)) {
        row[j] = can[i]![j + 1]!;
      } else {
        row[j] = (hayChar === needleChar && can[i + 1]![j + 1]!) || can[i + 1]![j]!;
      }
    }
  }
  if (!can[0]![0]!) return [];
  // Rightmost subsequence match: for each needle character (skipping spaces),
  // find the rightmost haystack position that matches and still allows the
  // remaining needle to be matched.
  const matched: number[] = [];
  let i = 0;
  let j = 0;
  while (j < n) {
    const needleChar = needle[j]!;
    if (isSpace(needleChar)) {
      j++;
      continue;
    }
    let found = -1;
    for (let p = h - 1; p >= i; p--) {
      if (haystack[p] === needleChar && can[p + 1]![j + 1]!) {
        found = p;
        break;
      }
    }
    if (found === -1) return [];
    matched.push(found);
    i = found + 1;
    j++;
  }
  // Group consecutive matched haystack positions into highlight runs.
  const runs: MatchPosition[] = [];
  for (let k = 0; k < matched.length; k++) {
    const pos = matched[k]!;
    if (k > 0 && pos === matched[k - 1]! + 1) {
      const last = runs[runs.length - 1];
      if (last !== undefined) last.end = pos + 1;
    } else {
      runs.push({ start: pos, end: pos + 1 });
    }
  }
  return runs;
}

function scoreMatch(positions: MatchPosition[], needleLen: number, haystackLen: number): number {
  if (positions.length === 0) return 0;

  let score = 0;

  let prevEnd = -1;
  for (const pos of positions) {
    const runLength = pos.end - pos.start;
    score += runLength * 2;
    if (prevEnd >= 0) {
      const gap = pos.start - prevEnd;
      if (gap <= 1) {
        score += 1;
      } else {
        score -= gap;
      }
    }
    prevEnd = pos.end;
  }

  const coverage = needleLen / haystackLen;
  score += coverage * 10;

  return score;
}
