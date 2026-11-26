// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useState, type CSSProperties } from 'react'
import { mulberry32, randomInt } from '@lacuna/random'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Table,
  TextInput,
} from '@lacuna/ui'
import { historyStore } from './host'

type Cell = [number, number]

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

const DIRS: Cell[] = [[0, 1], [1, 0], [0, -1], [-1, 0]]

function solvable(open: boolean[][], n: number): boolean {
  const q: Cell[] = [[0, 0]]
  const vis: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  vis[0][0] = true
  while (q.length) {
    const next = q.shift()
    if (!next) continue
    const [r, c] = next
    if (!vis[r][c]) continue
    if (r === n - 1 && c === n - 1) return true
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && open[nr][nc] && !vis[nr][nc]) {
        vis[nr][nc] = true
        q.push([nr, nc])
      }
    }
  }
  return false
}

function generateMaze(seed: string, n: number, wallProb: number): boolean[][] {
  const open: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(true))
  const rng = mulberry32(hashSeed(String(seed)))
  const visited: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  const stack: Cell[] = [[0, 0]]
  visited[0][0] = true
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const unvisited: Cell[] = []
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc]) unvisited.push([nr, nc])
    }
    if (unvisited.length === 0) {
      stack.pop()
      continue
    }
    const [nr, nc] = unvisited[randomInt(rng, 0, unvisited.length - 1)]
    visited[nr][nc] = true
    stack.push([nr, nc])
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r === 0 && c === 0) continue
      if (r === n - 1 && c === n - 1) continue
      if (rng() < wallProb) {
        const prev = open[r][c]
        open[r][c] = false
        if (!solvable(open, n)) open[r][c] = prev
      }
    }
  }
  return open
}

const SIZES = ['5x5', '7x7', '9x9']
const WALL_PROB = 0.2

export function App() {
  const [seed, setSeed] = useState('42')
  const [size, setSize] = useState('5x5')
  const [maze, setMaze] = useState<{ seed: string; n: number; open: boolean[][] } | null>(null)
  const [path, setPath] = useState<Cell[]>([])
  const [solved, setSolved] = useState(false)
  const [toast, setToast] = useState(false)
  const [tab, setTab] = useState<'Maze' | 'History'>('Maze')
  const [stats, setStats] = useState(() => historyStore.get())

  useEffect(() => {
    setStats(historyStore.get())
  }, [])

  const n = maze?.n ?? 5

  function generate() {
    const s = parseInt(size, 10)
    const open = generateMaze(seed, s, WALL_PROB)
    setMaze({ seed, n: s, open })
    setPath([])
    setSolved(false)
    setToast(false)
  }

  function onCellClick(r: number, c: number) {
    if (!maze) return
    if (!maze.open[r][c]) return
    if (solved) return
    const last = path[path.length - 1]
    if (last && !(Math.abs(last[0] - r) + Math.abs(last[1] - c) === 1)) return
    if (path.some(([pr, pc]) => pr === r && pc === c)) return
    const next = [...path, [r, c] as Cell]
    setPath(next)
    if (r === n - 1 && c === n - 1) {
      setSolved(true)
      setStats((prev) => {
        const nextStats = { best: Math.max(prev.best, 1), solved: prev.solved + 1 }
        historyStore.set(nextStats)
        return nextStats
      })
    }
  }

  function resetMaze() {
    setPath([])
    setSolved(false)
  }

  async function copySolution() {
    if (!solved) return
    const text = path.map(([r, c]) => `${r},${c}`).join(' -> ')
    try {
      await navigator.clipboard.writeText(text)
      setToast(true)
    } catch {
      // ignore
    }
  }

  return (
    <AppShell
      name="Maze Generator"
      icon="grid"
      hue="blue"
      category="Games"
      status={toast ? 'Solution copied to clipboard' : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
        <Card mono="Controls" title="New maze">
          <FormGrid>
            <TextInput label="Seed" value={seed} onChange={setSeed} />
            <label className="lc-field">
              <span className="lc-field-label">Size</span>
              <select
                className="lc-input"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                aria-label="Size"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={generate}>Generate</PrimaryButton>
            <Button kind="secondary" onClick={generate} disabled={!maze}>
              New Maze
            </Button>
            <Button kind="ghost" onClick={resetMaze} disabled={path.length === 0}>
              Reset path
            </Button>
          </Actions>
        </Card>

        <div role="tablist" aria-label="Maze sections" style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
          {(['Maze', 'History'] as const).map((t) => {
            const active = tab === t
            const style: CSSProperties = {
              color: active ? 'var(--ink)' : 'var(--mid)',
            }
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                className={`lc-tab${active ? ' active' : ''}`}
                style={style}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            )
          })}
        </div>

        {tab === 'Maze' ? (
          <Card title="Maze">
            <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', marginBottom: 'calc(8px * var(--sf))' }}>
              <span>{`Path: ${path.length}`}</span>
              <span>{`Score: ${solved ? 1 : 0}`}</span>
            </div>
            {maze ? (
              <>
                <div
                  role="grid"
                  aria-label="Maze"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${n}, calc(44px * var(--sf)))`,
                    gap: 'calc(4px * var(--sf))',
                    width: 'fit-content',
                  }}
                >
                  {maze.open.flatMap((row, r) =>
                    row.map((isOpen, c) => {
                      const isStart = r === 0 && c === 0
                      const isFinish = r === n - 1 && c === n - 1
                      const inPath = path.some(([pr, pc]) => pr === r && pc === c)
                      if (isOpen) {
                        return (
                          <div
                            key={`${r}-${c}`}
                            role="gridcell"
                            aria-label={`Row ${r}, Column ${c}`}
                            style={{
                              width: 'calc(44px * var(--sf))',
                              height: 'calc(44px * var(--sf))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Button
                              kind="secondary"
                              ariaLabel={isStart ? 'Start' : isFinish ? 'Finish' : `Open cell row ${r} column ${c}`}
                              style={{
                                width: 'calc(40px * var(--sf))',
                                height: 'calc(40px * var(--sf))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: inPath ? 'var(--accent)' : 'var(--paper)',
                                borderWidth: 1,
                                borderStyle: 'solid',
                                borderColor: 'var(--ui-line)',
                                borderRadius: 'calc(4px * var(--sf))',
                                cursor: 'pointer',
                                fontSize: 'calc(11px * var(--tf))',
                                fontWeight: 600,
                                color: inPath ? 'var(--paper)' : 'var(--ink)',
                              }}
                              onClick={() => onCellClick(r, c)}
                            >
                              {isStart ? 'S' : isFinish ? 'F' : ''}
                            </Button>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={`${r}-${c}`}
                          role="gridcell"
                          aria-label={`Row ${r}, Column ${c}`}
                          style={{
                            width: 'calc(44px * var(--sf))',
                            height: 'calc(44px * var(--sf))',
                            background: 'var(--ink)',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: 'var(--ui-line)',
                            borderRadius: 'calc(4px * var(--sf))',
                          }}
                        />
                      )
                    }),
                  )}
                </div>
                {solved && (
                  <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                    <Button kind="primary" onClick={copySolution}>
                      Copy Solution
                    </Button>
                    <div style={{ marginTop: 'calc(8px * var(--sf))' }}>Maze solved!</div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                mono="Empty"
                title="No maze generated yet"
                detail="Set a seed and size, then click Generate."
                actionLabel="Generate a maze"
              />
            )}
          </Card>
        ) : (
          <Card mono="All time" title="History">
            <Table
              label="History"
              columns={[
                { key: 'best', label: 'Best Score', num: true },
                { key: 'solved', label: 'Mazes solved', num: true },
              ]}
              rows={[
                {
                  cells: {
                    best: String(stats.best),
                    solved: String(stats.solved),
                  },
                },
              ]}
              empty="No mazes solved yet"
            />
            <div style={{ marginTop: 'calc(8px * var(--sf))' }}>{`${stats.solved} maze${stats.solved === 1 ? '' : 's'} solved`}</div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
