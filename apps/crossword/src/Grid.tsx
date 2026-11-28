import { memo } from 'react'
import type { Ref } from 'react'
import { isBlock, solution } from './play.ts'
import type { PlayState, Pos } from './play.ts'
import type { Puzzle } from './generate.ts'

interface Props {
  puzzle: Puzzle
  nums: number[][]
  /** Player entries. Omit to draw a blank grid, or pass showSolution to draw the answers. */
  state?: PlayState
  showSolution?: boolean
  active?: Pos
  inWord?: Set<string>
  onCell?: (at: Pos) => void
  gridRef?: Ref<HTMLDivElement>
  label?: string
}

export const key = (r: number, c: number) => `${r},${c}`

function GridView({ puzzle: p, nums, state, showSolution, active, inWord, onCell, gridRef, label }: Props) {
  const rows = []
  for (let r = 0; r < p.rows; r++) {
    const cells = []
    for (let c = 0; c < p.cols; c++) {
      if (isBlock(p, r, c)) {
        cells.push(<div key={c} className="cw-block" aria-hidden="true" />)
        continue
      }
      const letter = showSolution ? solution(p, r, c) : (state?.entries[r][c] ?? '')
      const cls = ['cw-cell']
      if (inWord?.has(key(r, c))) cls.push('in-word')
      if (active && active.r === r && active.c === c) cls.push('active')
      if (state?.wrong[r][c]) cls.push('wrong')
      if (state?.revealed[r][c]) cls.push('revealed')
      const n = nums[r][c]
      const flags = [state?.wrong[r][c] ? 'wrong' : '', state?.revealed[r][c] ? 'revealed' : ''].filter(Boolean).join(' ')
      cells.push(
        <div
          key={c}
          role="gridcell"
          data-pos={`${r},${c}`}
          aria-selected={active ? active.r === r && active.c === c : undefined}
          className={cls.join(' ')}
          onClick={onCell ? () => onCell({ r, c }) : undefined}
        >
          {n ? <span className="cw-n">{n}</span> : null}
          <span className="cw-letter">{letter}</span>
          {letter === '' || flags ? <span className="cw-sr">{[letter === '' ? 'empty' : '', flags].filter(Boolean).join(' ')}</span> : null}
        </div>,
      )
    }
    rows.push(
      <div key={r} role="row" className="cw-row">
        {cells}
      </div>,
    )
  }
  return (
    <div ref={gridRef} className="cw-grid" role="grid" aria-label={label ?? 'Crossword grid'} style={{ ['--cols' as string]: p.cols }}>
      {rows}
    </div>
  )
}

export const Grid = memo(GridView)
