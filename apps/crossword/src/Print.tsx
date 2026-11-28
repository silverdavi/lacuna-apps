import { useMemo } from 'react'
import { Grid } from './Grid.tsx'
import { allWords } from './generate.ts'
import type { Puzzle, Word } from './generate.ts'
import { numberAt } from './play.ts'

/** Hidden on screen; shown by the print stylesheet. A blank grid with the clues, and an optional answer page. */
export function PrintView({ puzzle: p, answers }: { puzzle: Puzzle; answers: boolean }) {
  const nums = useMemo(() => numberAt(p), [p])
  const list = (title: string, words: Word[], showAnswer: boolean) => (
    <div>
      <h3>{title}</h3>
      <ol>
        {words.map((w) => (
          <li key={`${w.dir}${w.n}`}>
            <b>{w.n}</b>
            {showAnswer ? w.answer : `${w.clue} (${w.answer.length})`}
          </li>
        ))}
      </ol>
    </div>
  )
  return (
    <section className="cw-print" aria-hidden="true" data-testid="print-view">
      <h2>{p.title}</h2>
      <p className="cw-print-meta">{allWords(p).length} words. {p.cols} by {p.rows}.</p>
      <Grid puzzle={p} nums={nums} label="Blank crossword grid for printing" />
      <div className="cw-print-lists">
        {list('Across', p.across, false)}
        {list('Down', p.down, false)}
      </div>
      {answers ? (
        <div className="cw-answers">
          <h2>{p.title} answers</h2>
          <Grid puzzle={p} nums={nums} showSolution label="Answer grid" />
          <div className="cw-print-lists">
            {list('Across', p.across, true)}
            {list('Down', p.down, true)}
          </div>
        </div>
      ) : null}
    </section>
  )
}
