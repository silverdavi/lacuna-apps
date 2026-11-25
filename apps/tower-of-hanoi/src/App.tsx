import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  FormGrid,
  Keys,
  Rail,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { host } from './host'
import './app.css'

type Peg = 'A' | 'B' | 'C'
type DiskCount = 3 | 4 | 5 | 6 | 7 | 8

const PEGS: Peg[] = ['A', 'B', 'C']

const toDiskCount = (value: number): DiskCount => {
  const n = Math.trunc(value)
  return n >= 3 && n <= 8 ? (n as DiskCount) : 3
}

export function App() {
  const [disks, setDisks] = useState<DiskCount>(3)
  const [towers, setTowers] = useState<Record<Peg, number[]>>({ A: [3, 2, 1], B: [], C: [] })
  const [moves, setMoves] = useState(0)
  const [history, setHistory] = useState<{ n: number; from: Peg; to: Peg; disk: number }[]>([])
  const [best, setBest] = useState(0)
  const [solved, setSolved] = useState(false)
  const [illegal, setIllegal] = useState<string | null>(null)
  const [diskInput, setDiskInput] = useState('3')
  const [diskError, setDiskError] = useState<string | null>(null)
  const [tab, setTab] = useState<'Board' | 'History'>('Board')

  useEffect(() => {
    const { best: storedBest, disks: storedDisks } = host.readRecord()
    setBest(storedBest)
    setDisks(toDiskCount(storedDisks))
    setDiskInput(String(storedDisks))
  }, [])

  const topOf = (peg: Peg) => towers[peg][towers[peg].length - 1]

  const canMove = (disk: number, from: Peg, to: Peg) =>
    topOf(from) === disk && (towers[to].length === 0 || topOf(to) > disk)

  const illegalReason = (disk: number, from: Peg, to: Peg): string | null => {
    if (canMove(disk, from, to)) return null
    const target = topOf(to)
    if (topOf(from) !== disk) return `Illegal move: disk ${disk} cannot go on disk ${topOf(from)}`
    if (target != null) return `Illegal move: disk ${disk} cannot go on disk ${target}`
    return `Illegal move: disk ${disk} cannot go on the empty peg`
  }

  const allIllegalReasons = (() => {
    const seen = new Set<string>()
    for (const from of PEGS) {
      for (const to of PEGS) {
        if (to === from) continue
        for (const disk of towers[from]) {
          const reason = illegalReason(disk, from, to)
          if (reason) seen.add(reason)
        }
      }
    }
    return [...seen]
  })()

  const move = (disk: number, from: Peg, to: Peg) => {
    if (from === to || !canMove(disk, from, to)) return
    const next = {
      A: [...towers.A],
      B: [...towers.B],
      C: [...towers.C],
    }
    next[from].pop()
    next[to].push(disk)
    const n = moves + 1
    setTowers(next)
    setMoves(n)
    setHistory([...history, { n, from, to, disk }])
    setIllegal(null)
    const done = next.A.length === disks || next.B.length === disks || next.C.length === disks
    if (done) {
      setSolved(true)
      if (best === 0 || n < best) {
        setBest(n)
        host.writeRecord({ best: n, disks })
      }
    }
  }

  const restart = () => {
    setTowers({ A: Array.from({ length: disks }, (_, i) => disks - i), B: [], C: [] })
    setMoves(0)
    setHistory([])
    setSolved(false)
    setIllegal(null)
    setTab('Board')
  }

  const applyDisks = () => {
    const value = Number(diskInput)
    if (!Number.isInteger(value) || value < 3 || value > 8) {
      setDiskError('Disks must be between 3 and 8')
      return
    }
    setDiskError(null)
    const count = value as DiskCount
    setDisks(count)
    setDiskInput(String(count))
    setTowers({ A: Array.from({ length: count }, (_, i) => count - i), B: [], C: [] })
    setMoves(0)
    setHistory([])
    setSolved(false)
    setIllegal(null)
    setTab('Board')
    host.writeRecord({ best, disks: count })
  }

  return (
    <AppShell
      name="Tower of Hanoi"
      icon="layers"
      hue="cobalt"
      category="Games"
      side={
        <Rail
          note="3 pegs · 1 disk at a time"
          chips={disks === 3 ? ['Classic 7-move solve'] : [`${disks} disks`]}
        >
          <Divider />
          <FormGrid>
            <div className="toh-field">
              <TextInput
                label="Disks"
                type="number"
                inputMode="numeric"
                value={diskInput}
                onChange={setDiskInput}
                error={diskError}
              />
              <p className="toh-field-note">3 to 8 disks, then press Apply</p>
            </div>
            <Actions>
              <Button kind="primary" onClick={applyDisks}>
                Apply
              </Button>
            </Actions>
          </FormGrid>
          <Divider />
          <EmptyState
            mono="Goal"
            title="Move the whole stack"
            detail="Carry the full tower from the leftmost peg to another peg. One disk at a time, and never a larger disk on a smaller one."
            actionLabel="Solve on the Board"
          />
        </Rail>
      }
    >
      {tab === 'Board' ? (
        <Card
          mono="Puzzle"
          title="Board"
          actions={
            <Actions>
              <Button kind="primary" onClick={restart}>
                Restart
              </Button>
            </Actions>
          }
        >
          <div className="toh-status">
            <span className="toh-stat toh-stat-accent">{`Moves: ${moves}`}</span>
            <span className="toh-stat">{`Best: ${best}`}</span>
            <span className="toh-stat">{`${disks} disks`}</span>
          </div>
          {illegal ? (
            <p className="toh-error" role="alert">
              {illegal}
            </p>
          ) : allIllegalReasons.length > 0 ? (
            allIllegalReasons.map((reason) => (
              <p key={reason} className="toh-error" role="alert">
                {reason}
              </p>
            ))
          ) : null}
          {solved ? <p className="toh-solved">Solved in {moves} moves</p> : null}
          <div className="toh-pegs">
            {PEGS.map((peg) => (
              <div key={peg} className="toh-peg">
                <h2 className="toh-peg-title">Peg {peg}</h2>
                <div className="toh-stack" role="group" aria-label={`Peg ${peg}`}>
                  {[...towers[peg]]
                    .reverse()
                    .map((disk) => (
                      <div key={disk} className="toh-disk">
                        {disk}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <Divider />
          <div className="toh-moves">
            {PEGS.flatMap((from) =>
              PEGS.filter((to) => to !== from).flatMap((to) => {
                const diskList = towers[from]
                if (diskList.length === 0) return []
                return diskList.map((disk) => {
                  const ok = canMove(disk, from, to)
                  return (
                    <Button
                      key={`${from}${to}${disk}`}
                      kind="secondary"
                      disabled={!ok}
                      onClick={() => {
                        if (ok) {
                          move(disk, from, to)
                          return
                        }
                        const reason = illegalReason(disk, from, to)
                        if (reason) setIllegal(reason)
                      }}
                    >
                      Move {disk} {from}→{to}
                    </Button>
                  )
                })
              }),
            )}
          </div>
        </Card>
      ) : (
        <Card mono="Log" title="History">
          {history.length === 0 ? (
            <EmptyState
              title="No moves yet"
              detail="Move a disk on the Board tab to start logging."
              mono="Empty"
              actionLabel="Go to the Board"
              onAction={() => setTab('Board')}
            />
          ) : (
            <table className="lc-table" aria-label="Move history">
              <thead>
                <tr>
                  <th scope="col" className="num">Move</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.n} className={h.n === history.length ? 'hot' : ''}>
                    <th scope="row" className="num">{h.n}</th>
                    <td className="toh-action-cell">
                      <span className="toh-action-disk">{h.disk}</span>{` ${h.from}→${h.to}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      <div className="toh-tabs" role="tablist" aria-label="Views">
        {(['Board', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`toh-tab${tab === t ? ' on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <Card mono="Help" title="How to play">
        <div>
          <p className="toh-rule">
            Move the entire stack from the left peg to another peg. You may move only one
            disk at a time, and you may never place a larger disk on top of a smaller one.
          </p>
          <p className="toh-rule">
            The smallest disk is disk 1, the largest is disk {disks}. With {disks} disks
            the shortest solution is {2 ** disks - 1} moves; your best run is kept above
            the board.
          </p>
          <Keys items={[['A-C', 'Pegs'], ['1-8', 'Disk sizes']]} />
        </div>
      </Card>
    </AppShell>
  )
}
