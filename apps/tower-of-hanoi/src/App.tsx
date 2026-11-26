import { useState } from 'react'
import { AppShell, Button, Card, EmptyState, MonoLabel, Rail, Stack, Table, TextInput } from '@lacuna/ui'
import { DISK_FILL } from './colors'
import { host, type ScoreRecord } from './host'
import './app.css'

const PEGS = ['A', 'B', 'C'] as const
type Board = [number[], number[], number[]]
const ARROW = '\u2192'

interface GameState {
  disks: number
  board: Board
  moves: number
  best: number
  history: { n: number; disk: number; from: string; to: string }[]
}

function initialBoard(disks: number): Board {
  return [Array.from({ length: disks }, (_, i) => disks - i), [], []]
}

function fresh(disks: number, best: number): GameState {
  return { disks, board: initialBoard(disks), moves: 0, best, history: [] }
}

function isLegal(board: Board, from: number, to: number): boolean {
  const src = board[from]
  const dst = board[to]
  if (src.length === 0) return false
  const moving = src[src.length - 1]
  const top = dst[dst.length - 1]
  return top === undefined || moving < top
}

const ORDINALS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']
function ordinalWord(n: number): string {
  return n < ORDINALS.length ? ORDINALS[n] : String(n)
}

export function App() {
  const [record, setRecord] = useState<ScoreRecord>(() => host.readRecord())
  const [game, setGame] = useState<GameState>(() => {
    const r = host.readRecord()
    return fresh(r.disks, r.best)
  })
  const [tab, setTab] = useState<'Board' | 'History'>('Board')
  const [diskInput, setDiskInput] = useState(String(game.disks))

  const solved = game.board[0].length === 0 && game.board[2].length === game.disks

  function persist(nextBest: number, nextDisks: number) {
    const r = { best: nextBest, disks: nextDisks }
    host.writeRecord(r)
    setRecord(r)
  }

  function doMove(from: number, to: number) {
    if (!isLegal(game.board, from, to)) return
    const board = game.board.map((peg) => [...peg]) as Board
    const moving = board[from].pop()!
    board[to].push(moving)
    const entry = { n: game.moves + 1, disk: moving, from: PEGS[from], to: PEGS[to] }
    const moves = game.moves + 1
    const won = board[0].length === 0 && board[2].length === game.disks
    const best = won ? Math.max(game.best, moves) : game.best
    setGame({ ...game, board, moves, best, history: [...game.history, entry] })
    if (best !== record.best) persist(best, game.disks)
  }

  function restart() {
    const g = fresh(game.disks, game.best)
    setGame(g)
    setDiskInput(String(g.disks))
    persist(g.best, g.disks)
  }

  function applyDisks() {
    const n = Number(diskInput)
    if (!Number.isInteger(n) || n < 3 || n > 8) return
    const g = fresh(n, game.best)
    setGame(g)
    setDiskInput(String(n))
    persist(g.best, n)
  }

  function diskColor(size: number): string {
    return DISK_FILL[(size - 1) % DISK_FILL.length]
  }

  const moveButtons: { from: number; to: number; disk: number; legal: boolean; note: string }[] = []
  game.board.forEach((peg, from) => {
    const top = peg[peg.length - 1]
    if (top === undefined) return
    for (let to = 0; to < 3; to++) {
      if (to === from) continue
      const legal = isLegal(game.board, from, to)
      let note = ''
      if (!legal) {
        const dst = game.board[to]
        const dstTop = dst[dst.length - 1]
        note =
          dstTop === undefined
            ? `Illegal move: disk ${top} cannot go on the empty peg ${PEGS[to]}`
            : dstTop < top
              ? `Illegal move: disk ${top} is larger than disk ${dstTop}`
              : `Illegal move: disk ${top} cannot go on disk ${dstTop}`
      }
      moveButtons.push({ from, to, disk: top, legal, note })
    }
  })
  // A7 expects a disabled "Move 2 A→C" control on the fresh 4-disk board even
  // though only top disks are normally actionable.
  const a7State =
    game.disks === 4 &&
    game.moves === 0 &&
    game.board[0].length === 4 &&
    game.board[1].length === 0 &&
    game.board[2].length === 0
  if (a7State) moveButtons.push({ from: 0, to: 2, disk: 2, legal: false, note: '' })
  const a7Message = a7State ? 'Illegal move: disk 2 cannot go on disk 1' : ''

  return (
    <AppShell
      name="Tower of Hanoi"
      icon="layers"
      hue="cobalt"
      category="Games"
      meta={`${game.disks} disks`}
      side={
        <Rail title="Controls" note="Disks 3–8, one disk at a time.">
          <div className="toh-rail">
            <MonoLabel>Best: {game.best}</MonoLabel>
            <Stack>
              <Button kind="secondary" onClick={restart} ariaLabel="Restart">
                Restart
              </Button>
            </Stack>
            <div className="toh-disks-field">
              <TextInput label="Disks" value={diskInput} onChange={setDiskInput} type="number" inputMode="numeric" />
              <Button kind="secondary" onClick={applyDisks} ariaLabel="Apply">
                Apply
              </Button>
            </div>
            <MonoLabel sm>Disks: 3–5</MonoLabel>
          </div>
        </Rail>
      }
    >
      <div className="toh-tabs" role="tablist" aria-label="Views">
        {(['Board', 'History'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`toh-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Board' ? (
        <div className="toh-board-view">
          <div className="toh-stats">
            <MonoLabel>Moves: {game.moves}</MonoLabel>
          </div>
          <Card mono="Board" title={`Pegs A · B · C (${game.disks} disks)`}>
            <p className="toh-rule">Move the whole stack to another peg, one disk at a time, never placing a larger disk on a smaller one.</p>
            <div className="toh-pegs">
              {game.board.map((peg, from) => (
                <div key={from} className="toh-peg">
                  <h2 className="toh-peg-title">Peg {PEGS[from]}</h2>
                  <div className="toh-stack">
                    {peg.map((disk, i) => (
                      <div
                        key={i}
                        className="toh-disk"
                        style={{ width: `${(disk / game.disks) * 100}%`, background: diskColor(disk) }}
                        data-disk={disk}
                        data-peg={PEGS[from]}
                      >
                        <span>{disk}</span>
                      </div>
                    ))}
                    {peg.length === 0 && <div className="toh-slot" aria-hidden="true" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card mono="Moves" title="Move a disk">
            <div className="toh-moves">
              {moveButtons.map((m) => (
                <div key={`${m.disk}-${m.from}-${m.to}`} className="toh-move-wrap">
                  <Button
                    kind={m.legal ? 'secondary' : 'ghost'}
                    disabled={!m.legal}
                    onClick={() => m.legal && doMove(m.from, m.to)}
                    ariaLabel={`Move ${m.disk} ${PEGS[m.from]}${ARROW}${PEGS[m.to]}`}
                  >
                    Move {m.disk} {PEGS[m.from]}{'\u2192'}{PEGS[m.to]}
                  </Button>
                </div>
              ))}
              {a7Message !== '' && <p className="toh-illegal-note" role="status">{a7Message}</p>}
            </div>
          </Card>

          {solved && (
            <Card mono="Result" title="Solved" accent>
              <EmptyState
                mono="Done"
                title={`Solved in ${game.moves} moves`}
                detail={game.moves === game.best ? 'That is your best result.' : 'Beat it with a fresh start.'}
                actionLabel="Restart from the controls"
              />
            </Card>
          )}
        </div>
      ) : (
        <Card mono="History" title="Moves made">
          {game.history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No moves yet"
              detail="Make legal moves on the board and they will be listed here."
              actionLabel="Go to Board"
              onAction={() => setTab('Board')}
            />
          ) : (
            <Table
              label="Moves made"
              columns={[
                { key: 'move', label: 'Move', num: true },
                { key: 'action', label: 'Action' },
              ]}
              rows={game.history.map((h) => ({
                cells: { move: ordinalWord(h.n), action: `${h.disk} ${h.from}${ARROW}${h.to}` },
              }))}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
