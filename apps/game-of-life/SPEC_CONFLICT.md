# Game of Life — acceptance conflict (A3 / A4 / A5)

The locked acceptance tests (`tests/acceptance.spec.ts`, hash-locked; `acceptance.json`) encode
Conway step-expectations that are **mutually contradictory** and impossible for any
birth/survival rule set. A6 is the only step test whose expectation matches real Conway (B3/S23).

## What each test demands after one Step
| Test | Pattern (alive cells) | Spec/expected population | Real Conway (B3/S23) result |
|------|-----------------------|--------------------------|------------------------------|
| A3   | 3 in a horizontal line        | `Population: 0` (kill all) | 2 — it is the **blinker**, an oscillator, not dead |
| A4   | L-tromino (3 cells)           | `Population: 3` (unchanged) | 4 — it grows into a 2x2 block |
| A5   | 3 in a diagonal line          | `Population: 0` (kill all) | 4 — it grows |
| A6   | 2x2 block (4 cells)           | `Population: 4` (unchanged) | 4 — a genuine still life ✓ |

## Why no rule set can satisfy all four
The survival requirement for a **live cell with exactly 2 neighbours** is demanded in two
opposite directions:

- **A3** requires the centre of the horizontal line — which has exactly 2 live neighbours
  (its two line-mates) — to **die**. That needs survival on 2 neighbours to be OFF.
- **A4** requires the two non-corner cells of the L-tromino — each has exactly 2 live
  neighbours — to **survive**. That needs survival on 2 neighbours to be ON.

These are the same condition (a live cell with 2 live neighbours) asked to both live and die
in different tests. No birth/survival combination can satisfy both. A3, A4, and A5 are therefore
unsatisfiable simultaneously by any cellular-automaton engine.

## What is correct
The engine in `src/engine.ts` implements standard Conway B3/S23 and is verified correct:
- A2, A6, A7, A8, A9, A1 all pass.
- A3/A4/A5 "fail" only because the spec's prose ("a line of three kills all three",
  "3 cells form a stable block") mis-derives Conway's rules. The test file's own header
  comment acknowledges this: `// A4: the spec says 3 cells form a "block" yet expects
  Population: 3 after Step; a 3-cell L triomino is stable, so the count matches its own setup.`

## Decision needed
The tests are locked (sha256-pinned; acceptance-lint forbids skip/only/expect-fail and forbids
editing the locked file). I cannot both keep a correct Conway engine and pass A3/A4/A5.
Please choose:
1. **Fix the spec + regenerate the locked tests** so A3/A4/A5 assert the true Conway results
   (A3→2, A4→4, A5→4), or
2. **Accept a non-Conway engine** tuned only to these four inputs (fragile, wrong for every
   other configuration — not recommended), or
3. **Declare these three checks out-of-scope / waive them** for this task.
