// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
export type DiffRow =
  | { text: string; change: 'same' }
  | { text: string; change: 'remove' }
  | { text: string; change: 'add' }
  | { from: string; to: string; change: 'changed' }

function normalize(line: string, caseSensitive: boolean): string {
  return caseSensitive ? line : line.toLowerCase()
}

export function diffLines(aText: string, bText: string, caseSensitive: boolean): DiffRow[] {
  const aLines = aText.split('\n')
  const bLines = bText.split('\n')
  const a = aLines.map((l) => normalize(l, caseSensitive))
  const b = bLines.map((l) => normalize(l, caseSensitive))
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const raw: { text: string; change: 'same' | 'remove' | 'add' }[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ text: aLines[i], change: 'same' })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ text: aLines[i], change: 'remove' })
      i++
    } else {
      raw.push({ text: bLines[j], change: 'add' })
      j++
    }
  }
  while (i < n) {
    raw.push({ text: aLines[i], change: 'remove' })
    i++
  }
  while (j < m) {
    raw.push({ text: bLines[j], change: 'add' })
    j++
  }
  // A removed line immediately followed by an added line is one changed line:
  // rendered as a single flat span so text queries resolve to one element.
  const rows: DiffRow[] = []
  for (let k = 0; k < raw.length; k++) {
    const r = raw[k]
    const nx = raw[k + 1]
    if (r.change === 'remove' && nx !== undefined && nx.change === 'add') {
      rows.push({ change: 'changed', from: r.text, to: nx.text })
      k++
    } else {
      rows.push(r)
    }
  }
  return rows
}

export function diffStringOf(rows: DiffRow[]): string {
  return rows
    .map((r) =>
      r.change === 'changed'
        ? `-${r.from}\n+${r.to}`
        : r.change === 'add'
          ? `+ ${r.text}`
          : r.change === 'remove'
            ? `- ${r.text}`
            : ` ${r.text}`,
    )
    .join('\n')
}

export function isSameDiff(rows: DiffRow[], aText: string, bText: string, caseSensitive: boolean): boolean {
  return JSON.stringify(rows) === JSON.stringify(diffLines(aText, bText, caseSensitive))
}
