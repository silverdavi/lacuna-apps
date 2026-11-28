import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Actions, Button, Checkbox, EmptyState, MonoLabel, Tabs } from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { Grid, key } from './Grid.tsx'
import { wordCells } from './generate.ts'
import type { Dir, Puzzle, Word } from './generate.ts'
import {
  cellsFor,
  check,
  clearAll,
  clueOrder,
  eraseLetter,
  formatTime,
  isBlock,
  numberAt,
  reveal,
  startPos,
  typeLetter,
  wordFilled,
  wordIndex,
} from './play.ts'
import type { PlayState, Pos } from './play.ts'

export function useMedia(query: string): boolean {
  const get = () => (typeof matchMedia === 'function' ? matchMedia(query).matches : false)
  const [on, setOn] = useState(get)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(query)
    const f = () => setOn(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [query])
  return on
}

interface Props {
  puzzle: Puzzle
  state: PlayState
  update: (fn: (s: PlayState) => PlayState) => void
  elapsed: number
  paused: boolean
  setPaused: (p: boolean) => void
  onPrint: () => void
  withAnswers: boolean
  setWithAnswers: (v: boolean) => void
}

export function Play({ puzzle: p, state, update, elapsed, paused, setPaused, onPrint, withAnswers, setWithAnswers }: Props) {
  const phone = useMedia('(max-width: 45em)')
  const wi = useMemo(() => wordIndex(p), [p])
  const nums = useMemo(() => numberAt(p), [p])
  const order = useMemo(() => clueOrder(p), [p])
  const start = useMemo(() => startPos(p), [p])
  const [at, setAt] = useState<Pos>(start.at)
  const [dir, setDir] = useState<Dir>(start.dir)
  const [listTab, setListTab] = useState<'Across' | 'Down'>('Across')
  const [menu, setMenu] = useState(false)
  const [note, setNote] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const wordFor = (pos: Pos, d: Dir): Word | null => (d === 'across' ? wi.across[pos.r][pos.c] : wi.down[pos.r][pos.c])
  const word = wordFor(at, dir) ?? wordFor(at, dir === 'across' ? 'down' : 'across')
  const wordDir: Dir = word?.dir ?? dir
  const inWord = useMemo(() => new Set(word ? wordCells(word).map(([r, c]) => key(r, c)) : []), [word])

  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches && !paused) input.current?.focus({ preventScroll: true })
  }, [paused])

  useEffect(() => {
    if (phone && word) setListTab(word.dir === 'across' ? 'Across' : 'Down')
  }, [phone, word])

  // Keep the current clue visible inside its list.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.cw-clue.on')
    const box = el?.closest<HTMLElement>('.cw-clues')
    if (el && box) {
      const top = el.offsetTop - box.offsetTop
      if (top < box.scrollTop) box.scrollTop = top
      else if (top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + el.offsetHeight - box.clientHeight
    }
  }, [word, listTab])

  const focusInput = () => input.current?.focus({ preventScroll: true })

  const goto = (pos: Pos, d: Dir) => {
    setAt(pos)
    setDir(d)
  }

  const clickCell = (pos: Pos) => {
    focusInput()
    if (pos.r === at.r && pos.c === at.c) {
      const other: Dir = dir === 'across' ? 'down' : 'across'
      if (wordFor(pos, other)) setDir(other)
      return
    }
    setAt(pos)
    if (!wordFor(pos, dir)) setDir(dir === 'across' ? 'down' : 'across')
  }

  const jumpToWord = (w: Word, back = false) => {
    const cells = wordCells(w)
    const empty = back ? undefined : cells.find(([r, c]) => state.entries[r][c] === '')
    const [r, c] = empty ?? cells[0]
    goto({ r, c }, w.dir)
    focusInput()
  }

  const stepClue = (delta: number) => {
    const i = word ? order.indexOf(word) : -1
    jumpToWord(order[(i + delta + order.length) % order.length])
  }

  const cellStep = (pos: Pos, d: Dir, delta: number): Pos | null => {
    const w = wordFor(pos, d)
    if (!w) return null
    const cells = wordCells(w)
    const i = cells.findIndex(([r, c]) => r === pos.r && c === pos.c) + delta
    if (i < 0 || i >= cells.length) return null
    return { r: cells[i][0], c: cells[i][1] }
  }

  const type = (letter: string) => {
    update((s) => typeLetter(s, at, letter))
    const next = cellStep(at, wordDir, 1)
    if (next) setAt(next)
    setNote('')
  }

  const backspace = () => {
    if (state.entries[at.r][at.c] !== '' && !state.revealed[at.r][at.c]) {
      update((s) => eraseLetter(s, at))
      return
    }
    const prev = cellStep(at, wordDir, -1)
    if (prev) {
      setAt(prev)
      update((s) => eraseLetter(s, prev))
    }
  }

  const arrow = (dr: number, dc: number) => {
    let r = at.r + dr
    let c = at.c + dc
    while (r >= 0 && c >= 0 && r < p.rows && c < p.cols && isBlock(p, r, c)) {
      r += dr
      c += dc
    }
    if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) return
    const axis: Dir = dr === 0 ? 'across' : 'down'
    setAt({ r, c })
    if (wordFor({ r, c }, axis)) setDir(axis)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault()
      type(k.toUpperCase())
      return
    }
    switch (k) {
      case 'Backspace':
        e.preventDefault()
        backspace()
        break
      case 'Delete':
        e.preventDefault()
        update((s) => eraseLetter(s, at))
        break
      case 'ArrowLeft':
        e.preventDefault()
        arrow(0, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        arrow(0, 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        arrow(-1, 0)
        break
      case 'ArrowDown':
        e.preventDefault()
        arrow(1, 0)
        break
      case 'Tab':
        e.preventDefault()
        stepClue(e.shiftKey ? -1 : 1)
        break
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const other: Dir = wordDir === 'across' ? 'down' : 'across'
        if (wordFor(at, other)) setDir(other)
        break
      }
      case 'Escape':
        input.current?.blur()
        break
    }
  }

  // Phone keyboards that send no key codes deliver letters through the input event.
  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value
    e.currentTarget.value = ''
    for (const ch of v.toUpperCase()) if (/^[A-Z]$/.test(ch)) type(ch)
  }

  const runCheck = (scope: 'letter' | 'word' | 'puzzle') => {
    const cells = cellsFor(p, scope, at, word)
    const filled = cells.filter(({ r, c }) => state.entries[r][c] !== '')
    const r = check(p, state, cells)
    update(() => r.state)
    setNote(filled.length === 0 ? 'Nothing to check yet.' : r.wrong === 0 ? 'No wrong letters.' : `${r.wrong} wrong ${r.wrong === 1 ? 'letter' : 'letters'} marked.`)
    setMenu(false)
  }

  const runReveal = (scope: 'letter' | 'word' | 'puzzle') => {
    const cells = cellsFor(p, scope, at, word)
    update((s) => reveal(p, s, cells))
    setNote(scope === 'puzzle' ? 'Puzzle revealed.' : scope === 'word' ? 'Word revealed.' : 'Letter revealed.')
    setMenu(false)
  }

  const clueItem = (w: Word) => {
    const on = word === w
    const done = wordFilled(state, w)
    return (
      <li key={`${w.dir}${w.n}`}>
        <button
          type="button"
          className={`cw-clue${on ? ' on' : ''}${done ? ' done' : ''}`}
          aria-current={on ? 'true' : undefined}
          onClick={() => jumpToWord(w)}
        >
          <span className="no">{w.n}</span>
          <span>{w.clue}</span>
        </button>
      </li>
    )
  }

  const list = (title: 'Across' | 'Down', words: Word[]) => (
    <div>
      <div className="cw-clue-title">
        <MonoLabel>{title}</MonoLabel>
      </div>
      <ul className="cw-clues" aria-label={`${title} clues`}>
        {words.map(clueItem)}
      </ul>
    </div>
  )

  const clueBar = word ? (
    <div className="cw-clue-bar" aria-live="polite">
      <Button kind="ghost" ariaLabel="Previous clue" onClick={() => stepClue(-1)}>
        ‹
      </Button>
      <span className="cw-clue-text">
        <span className="cw-clue-no">
          {word.n} {word.dir}
        </span>
        <br />
        {word.clue} <span className="cw-hint">({word.answer.length})</span>
      </span>
      <Button kind="ghost" ariaLabel="Next clue" onClick={() => stepClue(1)}>
        ›
      </Button>
    </div>
  ) : null

  const tools = (
    <div className="cw-tools">
      <div className="cw-tool-row">
        <span className="cw-timer" role="timer" aria-label="Time">
          {formatTime(elapsed)}
        </span>
        <Button onClick={() => setPaused(!paused)} ariaLabel={paused ? 'Resume' : 'Pause'}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button onClick={() => setConfirmClear(true)} disabled={paused}>
          Clear
        </Button>
        <Button onClick={onPrint}>Print</Button>
        <Checkbox label="Answer page" checked={withAnswers} onChange={setWithAnswers} />
      </div>
      {phone ? (
        <>
          <div className="cw-tool-row">
            <Button onClick={() => setMenu(!menu)} disabled={paused} ariaLabel="Check and reveal menu">
              {menu ? 'Close menu' : 'Check and reveal'}
            </Button>
          </div>
          {menu ? (
            <div className="cw-menu" role="group" aria-label="Check and reveal">
              <Button onClick={() => runCheck('letter')}>Check letter</Button>
              <Button onClick={() => runCheck('word')}>Check word</Button>
              <Button onClick={() => runCheck('puzzle')}>Check puzzle</Button>
              <Button onClick={() => runReveal('letter')}>Reveal letter</Button>
              <Button onClick={() => runReveal('word')}>Reveal word</Button>
              <Button onClick={() => runReveal('puzzle')}>Reveal puzzle</Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Actions>
            <Button onClick={() => runCheck('letter')} disabled={paused}>Check letter</Button>
            <Button onClick={() => runCheck('word')} disabled={paused}>Check word</Button>
            <Button onClick={() => runCheck('puzzle')} disabled={paused}>Check puzzle</Button>
          </Actions>
          <Actions>
            <Button onClick={() => runReveal('letter')} disabled={paused}>Reveal letter</Button>
            <Button onClick={() => runReveal('word')} disabled={paused}>Reveal word</Button>
            <Button onClick={() => runReveal('puzzle')} disabled={paused}>Reveal puzzle</Button>
          </Actions>
        </>
      )}
      <p className="cw-status" role="status">
        {note}
      </p>
    </div>
  )

  return (
    <div className="cw-play">
      <div className="cw-board">
        {paused ? null : clueBar}
        {paused ? (
          <EmptyState mono="Paused" title="The clock is stopped" detail="The grid is hidden while paused." actionLabel="Resume" onAction={() => setPaused(false)} />
        ) : (
          <div className="cw-gridwrap">
            <Grid puzzle={p} nums={nums} state={state} active={at} inWord={inWord} onCell={clickCell} />
            <input
              ref={input}
              className="cw-input"
              aria-label="Crossword entry. Type letters; Tab for next clue; Escape to leave."
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="next"
              onKeyDown={onKeyDown}
              onInput={onInput}
            />
          </div>
        )}
        {tools}
      </div>
      {paused ? null : (
        <div className="cw-side">
          {phone ? (
            <>
              <Tabs items={['Across', 'Down']} active={listTab} onSelect={(t) => setListTab(t as 'Across' | 'Down')} />
              <ul className="cw-clues" aria-label={`${listTab} clues`}>
                {(listTab === 'Across' ? p.across : p.down).map(clueItem)}
              </ul>
            </>
          ) : (
            <div className="cw-lists">
              {list('Across', p.across)}
              {list('Down', p.down)}
            </div>
          )}
        </div>
      )}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear the grid">
        <div className="cw-field">
          <p>This empties every cell, including revealed letters. The timer keeps running.</p>
          <Actions>
            <Button
              kind="primary"
              onClick={() => {
                update(clearAll)
                setConfirmClear(false)
                setNote('Grid cleared.')
                goto(start.at, start.dir)
              }}
            >
              Clear grid
            </Button>
            <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
          </Actions>
        </div>
      </Dialog>
    </div>
  )
}
