import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Actions, Button, Kpi, KpiRow, Keys, Rail, Tabs } from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { Custom } from './Custom.tsx'
import { NewPuzzle } from './New.tsx'
import { Play } from './Play.tsx'
import { PrintView } from './Print.tsx'
import { Saved } from './Saved.tsx'
import { allWords, dailySeed } from './generate.ts'
import type { Puzzle, SizeKey } from './generate.ts'
import { host } from './host/index.ts'
import type { CrosswordRecord, Stats } from './host/index.ts'
import { formatTime, freshState, isComplete } from './play.ts'
import type { PlayState } from './play.ts'

type View = 'New puzzle' | 'Play' | 'Custom' | 'Saved'

interface Session {
  puzzle: Puzzle
  state: PlayState
  source: CrosswordRecord['source']
  name: string
}

const hasProgress = (s: PlayState) => s.checks > 0 || s.reveals > 0 || s.entries.some((row) => row.some((v) => v !== ''))

export function App() {
  const [view, setView] = useState<View>('New puzzle')
  const [session, setSession] = useState<Session | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [stats, setStats] = useState<Stats>(() => host.readStats())
  const [records, setRecords] = useState<CrosswordRecord[]>(() => host.listRecords())
  const [withAnswers, setWithAnswers] = useState(false)
  const [printJob, setPrintJob] = useState<{ puzzle: Puzzle; n: number } | null>(null)
  const [finished, setFinished] = useState<{ time: number; reveals: number; checks: number; best: boolean } | null>(null)
  const [undo, setUndo] = useState<CrosswordRecord | null>(null)
  const today = useMemo(() => dailySeed(new Date()).replace('daily-', ''), [])

  const refresh = useCallback(() => setRecords(host.listRecords()), [])
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed

  const persist = useCallback(
    (s: Session, time: number, done: boolean) => {
      const keep = s.source === 'custom' || hasProgress(s.state) || done
      if (!keep) return
      host.putRecord({
        id: s.puzzle.id,
        kind: 'crossword',
        name: s.name,
        source: s.source,
        status: done ? 'solved' : 'in-progress',
        updatedAt: Date.now(),
        puzzle: s.puzzle,
        state: { ...s.state, elapsed: time, done },
      })
      refresh()
    },
    [refresh],
  )

  const start = useCallback((puzzle: Puzzle, source: CrosswordRecord['source'], state?: PlayState | null, name?: string) => {
    const s = state ?? freshState(puzzle)
    const label = name ?? (source === 'daily' ? `Daily ${puzzle.seed.replace('daily-', '')}` : `${puzzle.size[0].toUpperCase()}${puzzle.size.slice(1)} crossword`)
    setSession({ puzzle, state: s, source, name: label })
    setElapsed(s.elapsed)
    setPaused(false)
    setFinished(null)
    setView('Play')
  }, [])

  const update = useCallback((fn: (s: PlayState) => PlayState) => {
    setSession((cur) => (cur ? { ...cur, state: fn(cur.state) } : cur))
  }, [])

  // Clock: one tick a second while the puzzle is open, unpaused and unsolved.
  const running = view === 'Play' && session != null && !paused && !session.state.done
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  // Completion.
  useEffect(() => {
    if (!session || session.state.done || !isComplete(session.puzzle, session.state)) return
    const time = elapsedRef.current
    const { reveals, checks } = session.state
    const next: Stats = { best: { ...stats.best }, daily: { ...stats.daily } }
    let best = false
    const size = session.puzzle.size
    if (size !== 'custom' && reveals === 0) {
      const old = next.best[size as SizeKey]
      if (old === undefined || time < old) {
        next.best[size as SizeKey] = time
        best = true
      }
    }
    if (session.source === 'daily') {
      const date = session.puzzle.seed.replace('daily-', '')
      if (!next.daily[date]) next.daily[date] = { time, reveals, checks }
    }
    host.writeStats(next)
    setStats(next)
    const done = { ...session.state, done: true, elapsed: time }
    setSession({ ...session, state: done })
    persist({ ...session, state: done }, time, true)
    setFinished({ time, reveals, checks, best })
  }, [session, stats, persist])

  // Save progress when the grid changes, and every five seconds of play.
  const saveKey = session ? session.state : null
  useEffect(() => {
    if (session) persist(session, elapsedRef.current, session.state.done)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveKey, paused])
  useEffect(() => {
    if (session && running && elapsed % 5 === 0) persist(session, elapsed, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed])
  useEffect(() => {
    const flush = () => session && persist(session, elapsedRef.current, session.state.done)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [session, persist])

  // Printing: the print stylesheet shows the print view; this opens the browser dialog once it has rendered.
  useEffect(() => {
    if (!printJob) return
    const id = setTimeout(() => window.print(), 60)
    return () => clearTimeout(id)
  }, [printJob])

  const print = (puzzle: Puzzle) => setPrintJob((j) => ({ puzzle, n: (j?.n ?? 0) + 1 }))
  const printTarget = printJob?.puzzle ?? session?.puzzle ?? null

  const resume = (r: CrosswordRecord) => {
    if (r.source === 'daily' && r.status === 'solved') {
      start(r.puzzle, 'daily', null, r.name)
      return
    }
    start(r.puzzle, r.source, r.state && r.status === 'in-progress' ? r.state : null, r.name)
  }

  const saveCustom = (puzzle: Puzzle) => {
    host.putRecord({ id: puzzle.id, kind: 'crossword', name: puzzle.title, source: 'custom', status: 'new', updatedAt: Date.now(), puzzle, state: null })
    refresh()
  }

  const del = (r: CrosswordRecord) => {
    host.deleteRecord(r.id)
    if (session?.puzzle.id === r.id) setSession(null)
    setUndo(r)
    refresh()
  }

  const undoDelete = () => {
    if (undo) host.putRecord({ ...undo, updatedAt: Date.now() })
    setUndo(null)
    refresh()
  }

  const tabs: View[] = session ? ['New puzzle', 'Play', 'Custom', 'Saved'] : ['New puzzle', 'Custom', 'Saved']
  const goto = (v: string) => {
    setView(v as View)
    if (v !== 'Saved') setUndo(null)
    if (v === 'Saved') refresh()
  }

  const dailyDone = stats.daily[today]
  const bestOf = (k: SizeKey) => (stats.best[k] !== undefined ? formatTime(stats.best[k]!) : '—')
  const words = session ? allWords(session.puzzle).length : 0
  const meta = session && view === 'Play' ? `${session.name} · ${words} words` : `${records.filter((r) => r.status === 'in-progress').length} in progress`

  return (
    <AppShell
      name="Crossword"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={meta}
      side={
        <Rail title="Crossword" note="Built on this device" chips={['Works offline', 'No account']}>
          <KpiRow>
            <Kpi value={bestOf('small')} label="Best small" accent />
            <Kpi value={bestOf('medium')} label="Best medium" />
          </KpiRow>
          <KpiRow>
            <Kpi value={bestOf('large')} label="Best large" />
            <Kpi value={dailyDone ? formatTime(dailyDone.time) : '—'} label="Daily" />
          </KpiRow>
          <Keys
            items={[
              ['A-Z', 'Fill a letter'],
              ['Tab', 'Next clue'],
              ['Arrows', 'Move'],
              ['Space', 'Across or down'],
              ['Esc', 'Leave the grid'],
            ]}
          />
        </Rail>
      }
    >
      <div className="cw-nav">
        <Tabs items={tabs} active={view} onSelect={goto} />
      </div>
      <div className="cw-screen">
        {view === 'New puzzle' ? <NewPuzzle onStart={(p, s) => start(p, s)} today={today} dailyDone={dailyDone} /> : null}
        {view === 'Play' && session ? (
          <Play
            key={session.puzzle.id}
            puzzle={session.puzzle}
            state={session.state}
            update={update}
            elapsed={elapsed}
            paused={paused}
            setPaused={setPaused}
            onPrint={() => print(session.puzzle)}
            withAnswers={withAnswers}
            setWithAnswers={setWithAnswers}
          />
        ) : null}
        {view === 'Custom' ? (
          <Custom onPlay={(p) => start(p, 'custom', null, p.title)} onSave={saveCustom} onPrint={print} withAnswers={withAnswers} setWithAnswers={setWithAnswers} />
        ) : null}
        {view === 'Saved' ? (
          <Saved
            records={records}
            onResume={resume}
            onPrint={(r) => print(r.puzzle)}
            onDelete={del}
            withAnswers={withAnswers}
            setWithAnswers={setWithAnswers}
            undo={undo}
            onUndo={undoDelete}
            onNew={() => goto('New puzzle')}
          />
        ) : null}
      </div>
      {printTarget ? <PrintView puzzle={printTarget} answers={withAnswers} /> : null}
      <Dialog open={finished != null} onClose={() => setFinished(null)} title="Puzzle solved">
        {finished ? (
          <div className="cw-field">
            <KpiRow>
              <Kpi value={formatTime(finished.time)} label="Time" accent />
              <Kpi value={String(finished.reveals)} label="Letters revealed" />
              <Kpi value={String(finished.checks)} label="Checks" />
            </KpiRow>
            {finished.best ? <p className="cw-hint">A new best time for this size.</p> : finished.reveals > 0 ? <p className="cw-hint">Best times count only puzzles solved with no reveals.</p> : null}
            <Actions>
              <Button
                kind="primary"
                onClick={() => {
                  setFinished(null)
                  setView('New puzzle')
                }}
              >
                New puzzle
              </Button>
              <Button onClick={() => setFinished(null)}>Close</Button>
            </Actions>
          </div>
        ) : null}
      </Dialog>
    </AppShell>
  )
}
