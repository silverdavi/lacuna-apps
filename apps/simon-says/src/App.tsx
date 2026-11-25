import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell, Card, PrimaryButton, Button, Body, MonoLabel, Table } from '@lacuna/ui'
import { createMockRecordStore } from '@lacuna/host-mock'
import { mulberry32, randomInt } from '@lacuna/random'
import './styles.css'

type Pad = 0 | 1 | 2 | 3

const PAD_NAMES: Record<Pad, string> = { 0: 'Red', 1: 'Blue', 2: 'Green', 3: 'Yellow' }

interface HistoryRecord {
  id: string
  seed: number
  bestScore: number
}

function buildSequence(seed: number, rounds: number): Pad[] {
  const seq: Pad[] = [0, 1, 2, 3]
  for (let r = 1; r <= rounds; r++) {
    const rng = mulberry32(seed * 1000 + r)
    seq.push(randomInt(rng, 0, 3) as Pad)
  }
  return seq
}

export function App() {
  const store = useRef(
    createMockRecordStore<HistoryRecord>({ key: 'simon-says-history' })
  ).current

  const [seed, setSeed] = useState('')
  const [sequence, setSequence] = useState<Pad[]>([])
  const [score, setScore] = useState(0)
  const [activePad, setActivePad] = useState<Pad | null>(null)
  const [showing, setShowing] = useState(false)
  const [inputIdx, setInputIdx] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [status, setStatus] = useState('Press Start to begin')
  const [tab, setTab] = useState('play')
  const [copied, setCopied] = useState(false)
  const [bestScore, setBestScore] = useState(0)

  useEffect(() => {
    const records = store.list()
    if (records.length > 0) {
      const best = records.reduce((m, r) => (r.bestScore > m ? r.bestScore : m), 0)
      setBestScore(best)
    }
  }, [store])

  const saveBest = useCallback(
    (s: number, seedNum: number) => {
      const existing = store.list()
      const match = existing.find((r) => r.seed === seedNum)
      if (match) {
        if (s > match.bestScore) {
          store.update(match.id, { bestScore: s })
        }
      } else {
        store.add({ seed: seedNum, bestScore: s })
      }
      setBestScore((prev) => (s > prev ? s : prev))
    },
    [store]
  )

  const playSequence = useCallback(async (seq: Pad[]) => {
    setShowing(true)
    setActivePad(null)
    for (const pad of seq) {
      await new Promise((r) => setTimeout(r, 500))
      setActivePad(pad)
      await new Promise((r) => setTimeout(r, 400))
      setActivePad(null)
      await new Promise((r) => setTimeout(r, 100))
    }
    setShowing(false)
  }, [])

  const startGame = useCallback(async () => {
    const n = parseInt(seed, 10)
    if (isNaN(n) || n < 0) return
    setGameOver(false)
    setScore(0)
    setInputIdx(0)
    setCopied(false)
    const seq = buildSequence(n, 0)
    setSequence(seq)
    setStatus('Watch the sequence')
    await playSequence(seq)
    setStatus('Your turn')
  }, [seed, playSequence])

  const handlePadClick = useCallback(
    async (pad: Pad) => {
      if (showing || sequence.length === 0 || gameOver) return
      if (pad !== sequence[inputIdx]) {
        setGameOver(true)
        setStatus('Wrong pad')
        saveBest(score, parseInt(seed, 10) || 0)
        return
      }
      const newIdx = inputIdx + 1
      setInputIdx(newIdx)
      if (newIdx === sequence.length) {
        const newScore = score + 1
        setScore(newScore)
        saveBest(newScore, parseInt(seed, 10) || 0)
        const extended = buildSequence(parseInt(seed, 10) || 0, newScore)
        setSequence(extended)
        setInputIdx(0)
        setStatus('Correct — next sequence')
        await new Promise((r) => setTimeout(r, 400))
        await playSequence(extended)
        setStatus('Your turn')
      }
    },
    [showing, sequence, gameOver, inputIdx, score, seed, playSequence, saveBest]
  )

  const restart = useCallback(() => {
    setScore(0)
    setSequence([])
    setInputIdx(0)
    setGameOver(false)
    setActivePad(null)
    setShowing(false)
    setCopied(false)
    setStatus('Press Start to begin')
  }, [])

  const copyBest = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`Best score: ${bestScore}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable
    }
  }, [bestScore])

  const padsDisabled = showing || gameOver || sequence.length === 0

  const historyRecords = store.list().sort((a, b) => b.bestScore - a.bestScore)

  return (
    <AppShell
      name="Simon Says Game"
      meta={bestScore > 0 ? `Best: ${bestScore}` : undefined}
      actions={
        tab === 'play' ? (
          <div className="ss-actions">
            {sequence.length === 0 ? (
              <PrimaryButton onClick={startGame} disabled={showing}>
                Start
              </PrimaryButton>
            ) : (
              <Button kind="secondary" onClick={restart}>
                Restart
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="ss-layout">
        <div role="tablist" className="ss-tabs">
          <button
            role="tab"
            aria-selected={tab === 'play'}
            className={tab === 'play' ? 'ss-tab active' : 'ss-tab'}
            onClick={() => setTab('play')}
          >
            Play
          </button>
          <button
            role="tab"
            aria-selected={tab === 'history'}
            className={tab === 'history' ? 'ss-tab active' : 'ss-tab'}
            onClick={() => setTab('history')}
          >
            History
          </button>
        </div>

        {tab === 'play' && (
          <>
            <Card title="Controls" mono="seed">
              <div className="ss-seed-field">
                <label className="ss-seed-label" htmlFor="ss-seed-input">
                  Seed
                </label>
                <input
                  id="ss-seed-input"
                  type="text"
                  className="ss-seed-input"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="e.g. 42"
                />
              </div>
            </Card>

            <Card title="Pads" mono="board">
              <div className="ss-pads">
                {([0, 1, 2, 3] as Pad[]).map((pad) => (
                  <button
                    key={pad}
                    onClick={() => handlePadClick(pad)}
                    aria-label={PAD_NAMES[pad]}
                    className={
                      activePad === pad
                        ? 'ss-pad active'
                        : padsDisabled
                          ? 'ss-pad disabled'
                          : 'ss-pad idle'
                    }
                    disabled={padsDisabled}
                  />
                ))}
              </div>
            </Card>

            <Card title="Status" mono="state">
              <Body>{status}</Body>
              {sequence.length > 0 && !showing && !gameOver && (
                <div className="ss-status-detail">
                  <MonoLabel sm>
                    Round {score + 1} — {inputIdx} / {sequence.length}
                  </MonoLabel>
                </div>
              )}
            </Card>

            <div className="ss-score-row">
              <MonoLabel>Score: {score}</MonoLabel>
            </div>
          </>
        )}

        {tab === 'history' && (
          <Card title="History" mono="records">
            {bestScore > 0 && (
              <div className="ss-best-row">
                <MonoLabel>Best Score: {bestScore}</MonoLabel>
                <Button kind="secondary" onClick={copyBest}>
                  Copy best
                </Button>
                {copied && <Body sm>Best score copied</Body>}
              </div>
            )}
            <Table
              columns={[
                { key: 'seed', label: 'Seed' },
                { key: 'best', label: 'Best Score', num: true },
              ]}
              rows={historyRecords.map((r) => ({
                cells: { seed: String(r.seed), best: String(r.bestScore) },
              }))}
              empty="No rounds yet"
            />
          </Card>
        )}
      </div>
    </AppShell>
  )
}
