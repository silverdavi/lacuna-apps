import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Divider, Keys, Kpi, KpiRow, Rail, Tabs } from '@lacuna/ui'
import { useHotkeys } from '@lacuna/use-hotkeys'
import { mulberry32 } from '@lacuna/random'
import {
  applyMark, buildDeck, dateKey, filterBank, groupRounds, markSeen, percent, streakOf,
  type Bank, type Mark, type Question, type Round,
} from './deck'
import { loadBank } from './data/load'
import { host, type Saved, type Settings } from './host'
import { isRevealed, type Session } from './session'
import { Setup } from './Setup'
import { CardView } from './CardView'
import { Summary } from './Summary'
import { Rounds } from './Rounds'
import { Daily } from './Daily'
import { Stats } from './Stats'

const TABS = ['Play', 'Rounds', 'Daily', 'Stats']

export function App() {
  const [bank, setBank] = useState<Bank | null>(null)
  const [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState<Saved>(() => host.read())
  const [tab, setTab] = useState('Play')
  const [session, setSession] = useState<Session | null>(null)
  const today = useMemo(() => dateKey(new Date()), [])

  useEffect(() => {
    loadBank().then(setBank, () => setFailed(true))
  }, [])

  const update = (fn: (s: Saved) => Saved) =>
    setSaved((prev) => {
      const next = fn(prev)
      host.write(next)
      return next
    })
  const setSettings = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))

  const { settings } = saved
  const pool = useMemo(
    () => (bank ? filterBank(bank, settings.cats ?? bank.categories.map((_, i) => i), settings.tiers) : []),
    [bank, settings.cats, settings.tiers],
  )
  const rounds = useMemo(() => (bank ? groupRounds(bank) : []), [bank])
  const teams = settings.mode === 'quizmaster' ? saved.teams.slice(0, settings.teamCount) : []

  const begin = (title: string, cards: Question[], deckPool: Question[] | null, size: number, mode = settings.mode) => {
    if (cards.length === 0) return
    setSession({ title, cards, idx: 0, marks: {}, shown: {}, awards: {}, mode, teams: mode === 'quizmaster' ? teams : [], pool: deckPool, size, finished: false })
    setTab('Play')
  }
  const startDeck = (p = pool, size = settings.size) =>
    begin('', buildDeck(p, size, saved.recent, mulberry32((Date.now() ^ (Math.random() * 2 ** 31)) >>> 0)), p, size)
  const openRound = (r: Round) => begin(r.title, r.rows, null, 0)
  const again = (s: Session) => (s.pool ? startDeck(s.pool, s.size) : begin(s.title, s.cards, null, 0, s.mode))
  const retry = (s: Session) => {
    const missed = s.cards.filter((_, i) => s.marks[i] === 'miss')
    begin(s.title ? `${s.title}, missed` : 'Missed questions', missed, null, 0, s.mode)
  }

  const patch = (fn: (s: Session) => Session) => setSession((s) => (s ? fn(s) : s))
  const reveal = () => {
    const s = session
    if (!s || s.finished || isRevealed(s)) return
    patch((x) => ({ ...x, shown: { ...x.shown, [x.idx]: true } }))
    update((v) => ({ ...v, recent: markSeen(v.recent, [s.cards[s.idx]!.id]), ever: v.ever.includes(s.cards[s.idx]!.id) ? v.ever : [...v.ever, s.cards[s.idx]!.id] }))
  }
  const advance = (x: Session): Session => (x.idx + 1 >= x.cards.length ? { ...x, finished: true } : { ...x, idx: x.idx + 1 })
  const mark = (m: Mark) => {
    const s = session
    if (!s || s.finished) return
    if (m !== 'skip' && !isRevealed(s)) return
    const card = s.cards[s.idx]!
    if (s.mode === 'solo') update((v) => ({ ...v, stats: applyMark(v.stats, card.c, s.marks[s.idx], m) }))
    patch((x) => advance({ ...x, marks: { ...x.marks, [x.idx]: m } }))
  }
  const next = () => patch((x) => (x.finished ? x : advance(x)))
  const back = () => patch((x) => (x.finished ? { ...x, finished: false } : x.idx > 0 ? { ...x, idx: x.idx - 1 } : x))
  const award = (t: number) =>
    patch((x) => {
      const cur = x.awards[x.idx] ?? []
      return { ...x, awards: { ...x.awards, [x.idx]: cur.includes(t) ? cur.filter((n) => n !== t) : [...cur, t] } }
    })
  const markDaily = (date: string, m: 'got' | 'miss') => update((v) => ({ ...v, daily: { ...v.daily, [date]: m } }))
  const resetStats = () => update((v) => ({ ...v, stats: { answered: 0, correct: 0, byCat: {} }, recent: [], ever: [] }))

  const playing = tab === 'Play' && !!session && !session.finished
  const solo = session?.mode === 'solo'
  useHotkeys(
    [
      { keys: 'g', handler: () => mark('got'), description: 'Got it' },
      { keys: 'arrowright', handler: () => mark('got'), description: 'Got it' },
      { keys: 'm', handler: () => mark('miss'), description: 'Missed it' },
      { keys: 'arrowleft', handler: () => mark('miss'), description: 'Missed it' },
      { keys: 's', handler: () => mark('skip'), description: 'Skip' },
      { keys: 'b', handler: back, description: 'Back' },
    ],
    { enabled: playing && solo === true },
  )
  // The hotkey helper cannot bind the space bar, so it has its own listener.
  const onSpace = () => (session && isRevealed(session) ? (solo ? undefined : next()) : reveal())
  const spaceRef = useRef(onSpace)
  spaceRef.current = onSpace
  useEffect(() => {
    if (!playing) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target
      if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey) return
      if (el instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      spaceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing])
  // Quizmaster has no self-scoring, so the arrow keys step through cards instead.
  useHotkeys(
    [
      { keys: 'arrowright', handler: next, description: 'Next card' },
      { keys: 'arrowleft', handler: back, description: 'Previous card' },
    ],
    { enabled: playing && solo === false },
  )

  const stats = saved.stats
  const streak = streakOf(saved.daily, today)

  let play
  if (failed) {
    play = <div className="pt-note" role="alert">The question bank could not be loaded. Reload the page to try again.</div>
  } else if (session && bank && session.finished) {
    play = <Summary bank={bank} s={session} onAgain={() => again(session)} onRetry={() => retry(session)} onDone={() => setSession(null)} />
  } else if (session && bank) {
    play = (
      <CardView
        bank={bank} s={session} onReveal={reveal} onMark={mark} onSkip={() => mark('skip')} onNext={next}
        onBack={back} onAward={award} onQuit={() => patch((x) => ({ ...x, finished: true }))}
      />
    )
  } else {
    play = (
      <Setup
        bank={bank} settings={settings} teams={saved.teams} matches={pool.length}
        onChange={setSettings} onTeams={(t) => update((v) => ({ ...v, teams: t }))} onStart={() => startDeck()}
      />
    )
  }

  return (
    <AppShell
      name="Pub trivia"
      icon="grid"
      hue="gold"
      category="Games"
      meta={bank ? `${bank.rows.length.toLocaleString()} questions` : 'Loading'}
      side={
        <Rail title="Pub trivia" note="42 categories · offline" chips={['3 tiers', 'No account']}>
          <KpiRow>
            <Kpi value={stats.answered} label="Answered" accent />
            <Kpi value={`${percent(stats.correct, stats.answered)}%`} label="Accuracy" />
          </KpiRow>
          <KpiRow>
            <Kpi value={streak} label="Daily streak" />
          </KpiRow>
          <Divider />
          <Keys
            items={
              session?.mode === 'quizmaster'
                ? [['Space', 'Reveal, then next card'], ['Right', 'Next card'], ['Left', 'Previous card']]
                : [['Space', 'Reveal answer'], ['G / Right', 'Got it'], ['M / Left', 'Missed it'], ['S', 'Skip'], ['B', 'Back']]
            }
          />
        </Rail>
      }
    >
      <div className="pt-tabs"><Tabs items={TABS} active={tab} onSelect={setTab} /></div>
      {tab === 'Play' ? play : null}
      {tab === 'Rounds' ? (
        <Rounds rounds={rounds} ready={!!bank} mode={settings.mode} onMode={(mode) => setSettings({ mode })} onOpen={openRound} />
      ) : null}
      {tab === 'Daily' ? <Daily bank={bank} today={today} history={saved.daily} onMark={markDaily} /> : null}
      {tab === 'Stats' ? <Stats bank={bank} stats={stats} seen={saved.ever.length} onReset={resetStats} /> : null}
    </AppShell>
  )
}
