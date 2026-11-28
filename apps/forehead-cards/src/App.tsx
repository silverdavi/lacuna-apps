import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Pills } from '@lacuna/ui'
import { CATEGORIES, countByCategory, type Card } from './data/deck'
import { host, type DeckRecord, type Settings } from './host'
import { buildPool, dealRound, newSession, type Played, type RoundRecord, type Session } from './lib/game'
import { beep, primeAudio, TONES } from './lib/beep'
import { Setup } from './screens/Setup'
import { Decks } from './screens/Decks'
import { Print } from './screens/Print'
import { Play } from './screens/Play'
import { Summary } from './screens/Summary'

export const DEFAULTS: Settings = {
  categories: [...CATEGORIES],
  seconds: 60,
  includeCustom: true,
  controls: 'tap',
  teamMode: false,
  teamCount: 2,
  teamNames: ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6'],
  sound: false,
}

type Phase = 'setup' | 'ready' | 'play' | 'summary'
const TABS = ['Play', 'Decks', 'Print']

type TiltState = 'off' | 'active' | 'unavailable' | 'denied'

export function App() {
  const [settings, setSettings] = useState<Settings>(() => host.readSettings(DEFAULTS))
  const [decks, setDecks] = useState<DeckRecord[]>(() => host.listDecks())
  const [tab, setTab] = useState('Play')
  const [phase, setPhase] = useState<Phase>('setup')
  const [queue, setQueue] = useState<Card[]>([])
  const [note, setNote] = useState('')
  const [tilt, setTilt] = useState<TiltState>('off')
  const [rounds, setRounds] = useState<RoundRecord[]>([])
  const sessionRef = useRef<Session>(newSession())
  const soundRef = useRef(settings.sound)
  soundRef.current = settings.sound

  useEffect(() => {
    host.writeSettings(settings)
  }, [settings])

  const patch = useCallback((next: Partial<Settings>) => setSettings((s) => ({ ...s, ...next })), [])

  const pool = useMemo(() => buildPool(settings.categories, settings.includeCustom, decks), [settings.categories, settings.includeCustom, decks])
  const counts = useMemo(countByCategory, [])
  const teamCount = settings.teamMode ? settings.teamCount : 1
  const team = rounds.length % teamCount

  async function askTilt(): Promise<TiltState> {
    if (settings.controls !== 'tilt') return 'off'
    const Ctor = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
    if (!Ctor) return 'unavailable'
    if (typeof Ctor.requestPermission === 'function') {
      try {
        return (await Ctor.requestPermission()) === 'granted' ? 'active' : 'denied'
      } catch {
        return 'denied'
      }
    }
    return 'active'
  }

  function deal() {
    const dealt = dealRound(sessionRef.current, pool)
    setQueue(dealt.queue)
    setNote(dealt.restarted ? 'Every card has been shown, so the deck was reshuffled.' : '')
    setPhase('ready')
  }

  async function start() {
    if (pool.length === 0) return
    primeAudio()
    // Must run inside the Start tap on iOS.
    const state = await askTilt()
    setTilt(state)
    setRounds([])
    sessionRef.current = newSession()
    deal()
  }

  function nextRound() {
    primeAudio()
    deal()
  }

  function finish(played: Played[], exhausted: boolean) {
    if (soundRef.current) beep(TONES.end, 220)
    setRounds((r) => [...r, { team: r.length % teamCount, played, note: exhausted ? 'The deck ran out of cards, so the round ended early.' : undefined }])
    setPhase('summary')
  }

  function toggle(round: number, index: number) {
    setRounds((all) =>
      all.map((r, i) =>
        i !== round ? r : { ...r, played: r.played.map((p, j) => (j !== index ? p : { ...p, result: p.result === 'correct' ? 'pass' : 'correct' })) },
      ),
    )
  }

  const teamNames = settings.teamNames.slice(0, teamCount).map((n, i) => n.trim() || `Team ${i + 1}`)
  const inRound = phase === 'ready' || phase === 'play'

  return (
    <AppShell name="Forehead Cards" icon="grid" hue="cobalt" category="Play" meta={`${pool.length} ${pool.length === 1 ? 'card' : 'cards'} ready`}>
      <div className="fc-page" inert={inRound}>
      {phase === 'summary' ? (
        <Summary
          rounds={rounds}
          teamNames={teamNames}
          teamMode={settings.teamMode}
          nextTeam={teamNames[team]}
          onToggle={toggle}
          onNext={nextRound}
          onBack={() => setPhase('setup')}
        />
      ) : (
        <>
          <Pills items={TABS} active={tab} onSelect={setTab} />
          {tab === 'Play' && (
            <Setup settings={settings} patch={patch} counts={counts} pool={pool.length} customCount={decks.length} onStart={start} />
          )}
          {tab === 'Decks' && <Decks decks={decks} setDecks={setDecks} />}
          {tab === 'Print' && <Print decks={decks} defaultCategories={settings.categories} />}
        </>
      )}
      </div>
      {inRound && (
        <Play
          key={rounds.length}
          phase={phase === 'ready' ? 'ready' : 'play'}
          queue={queue}
          seconds={settings.seconds}
          controls={settings.controls}
          tilt={tilt}
          sound={settings.sound}
          teamLabel={settings.teamMode ? teamNames[team] : ''}
          note={note}
          onStarted={() => setPhase('play')}
          onTiltState={setTilt}
          onSeen={(text) => sessionRef.current.seen.add(text)}
          onFinish={finish}
        />
      )}
    </AppShell>
  )
}
