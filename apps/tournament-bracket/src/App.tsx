import { useEffect, useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { RecordTable, type ColumnDef } from '@lacuna/record-table'
import { players, matchWinners } from './host'

type ResolvedMatch = {
  id: string
  round: number
  index: number
  a: string | null
  b: string | null
  winner: string | null
}

function roundCounts(playerCount: number): number[] {
  let n = playerCount
  const counts: number[] = []
  while (n > 0) {
    counts.unshift(Math.max(1, Math.ceil(n / 2)))
    n = Math.ceil(n / 2)
  }
  return counts
}

function roundTitle(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final'
  if (totalRounds === 2 && round === 2) return 'Semifinal'
  return `Round ${round}`
}

export function App() {
  const [tick, setTick] = useState(0)
  const [tab, setTab] = useState<'Players' | 'Bracket' | 'Results'>('Bracket')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [winners, setWinnersState] = useState<Record<string, string>>(() => matchWinners.get())
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    matchWinners.set(winners)
  }, [winners])

  const playerNames = useMemo(
    () =>
      players
        .list()
        .sort((a, b) => a.seed - b.seed)
        .map((p) => p.name),
    [tick],
  )

  const matches = useMemo(() => {
    const counts = roundCounts(playerNames.length)
    const totalRounds = counts.length
    const list: { id: string; round: number; index: number; a: string | null; b: string | null }[] = []
    for (let r = 0; r < totalRounds; r++) {
      for (let i = 0; i < counts[r]; i++) {
        list.push({ id: `r${r + 1}m${i + 1}`, round: r + 1, index: i, a: null, b: null })
      }
    }
    const slots: (string | null)[] = []
    for (let i = 0; i < (counts[0] ?? 0) * 2; i++) slots.push(i < playerNames.length ? playerNames[i] : null)
    for (const m of list) {
      if (m.round === 1) {
        m.a = slots[m.index * 2]
        m.b = slots[m.index * 2 + 1]
      }
    }
    return list
  }, [playerNames])

  const totalRounds = useMemo(() => roundCounts(playerNames.length).length, [playerNames.length])

  const resolved = useMemo(() => {
    const byId = new Map(matches.map((m) => [m.id, m]))
    const winnersById = new Map<string, string | null>()
    function win(m: { id: string; round: number; index: number }): string | null {
      const cached = winnersById.get(m.id)
      if (cached !== undefined) return cached
      const direct = winners[m.id]
      const value = direct ?? null
      winnersById.set(m.id, value)
      return value
    }
    const out: ResolvedMatch[] = []
    const walk = (m: { id: string; round: number; index: number; a: string | null; b: string | null }): ResolvedMatch => {
      let a = m.a
      let b = m.b
      if (m.round > 1) {
        const left = byId.get(`r${m.round - 1}m${Math.floor(m.index / 2) + 1}`)
        const right = byId.get(`r${m.round - 1}m${Math.floor(m.index / 2) + 2}`)
        if (left) a = win(left)
        if (right) b = win(right)
      }
      const winner = winners[m.id] ?? null
      out.push({ id: m.id, round: m.round, index: m.index, a, b, winner })
      return { id: m.id, round: m.round, index: m.index, a, b, winner }
    }
    for (const m of matches) walk(m)
    return out
  }, [matches, winners])

  const rounds = useMemo(
    () =>
      Array.from({ length: totalRounds }, (_, i) => ({
        round: i + 1,
        title: roundTitle(i + 1, totalRounds),
        matches: resolved.filter((m) => m.round === i + 1),
      })),
    [resolved, totalRounds],
  )

  const champion = useMemo(() => {
    const finalMatches = resolved.filter((m) => m.round === totalRounds)
    if (finalMatches.length === 0) return null
    return finalMatches[finalMatches.length - 1].winner
  }, [resolved, totalRounds])

  function pickWinner(matchId: string, winnerName: string | null) {
    if (!winnerName) return
    setWinnersState((prev) => ({ ...prev, [matchId]: winnerName }))
  }

  function addPlayer() {
    const next = name.trim()
    if (!next) return setError('Type a player name first')
    if (players.list().some((p) => p.name.toLowerCase() === next.toLowerCase())) {
      return setError('That player is already in the bracket')
    }
    players.add({ name: next, seed: players.list().length + 1 })
    setWinnersState({})
    setName('')
    setError(null)
    setTick((t) => t + 1)
  }

  const resultsRows = useMemo(
    () =>
      resolved
        .filter((m) => m.winner)
        .map((m) => ({
          id: m.id,
          match: roundTitle(m.round, totalRounds),
          winner: m.winner!,
          score: '1-0',
        })),
    [resolved, totalRounds],
  )

  const csvText = useMemo(() => {
    const header = 'Match,Winner,Score'
    if (resultsRows.length === 0) return header
    const last = resultsRows[resultsRows.length - 1]
    return `${header}\n${last.match},${last.winner},${last.score}`
  }, [resultsRows])

  const playerRecords = useMemo(
    () =>
      players
        .list()
        .sort((a, b) => a.seed - b.seed)
        .map((p) => ({ id: p.id, name: p.name, seed: p.seed })),
    [tick],
  )

  const playerColumns: ColumnDef<{ id: string; name: string; seed: number }>[] = useMemo(
    () => [
      { key: 'seed', header: 'Seed', sortable: true },
      { key: 'name', header: 'Name', sortable: true },
    ],
    [],
  )

  function MatchCard({ match }: { match: ResolvedMatch }) {
    const bothSet = match.a != null && match.b != null
    return (
      <div
        style={{
          border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
          borderRadius: 'calc(4px * var(--sf))',
          padding: 'calc(8px * var(--sf))',
          display: 'flex',
          flexDirection: 'column',
          gap: 'calc(6px * var(--sf))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>
            {roundTitle(match.round, totalRounds)}
          </span>
          {match.a != null && match.b != null && (
            <span style={{ fontFamily: 'var(--serif)' }}>
              {match.a} vs {match.b}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'calc(6px * var(--sf))', flexWrap: 'wrap' }}>
          <Button
            kind={match.winner === match.a ? 'primary' : 'secondary'}
            disabled={!bothSet}
            ariaLabel={match.a ? `Winner: ${match.a}` : 'Winner: —'}
            onClick={() => pickWinner(match.id, match.a)}
          >
            {match.a ?? '—'}
          </Button>
          <Button
            kind={match.winner === match.b ? 'primary' : 'secondary'}
            disabled={!bothSet}
            ariaLabel={match.b ? `Winner: ${match.b}` : 'Winner: —'}
            onClick={() => pickWinner(match.id, match.b)}
          >
            {match.b ?? '—'}
          </Button>
        </div>
      </div>
    )
  }

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 'calc(8px * var(--sf))',
  }

  const championBlock = champion ? (
    <div
      style={{
        padding: 'calc(12px * var(--sf))',
        textAlign: 'center',
        border: 'calc(2px * var(--sf)) solid var(--accent)',
        borderRadius: 'calc(6px * var(--sf))',
      }}
    >
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>
        Champion
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 'calc(20px * var(--tf))', color: 'var(--accent)' }}>
        Champion: {champion}
      </div>
    </div>
  ) : null

  return (
    <AppShell
      name="Tournament Bracket"
      icon="people"
      hue="gold"
      category="Productivity"
      meta={`${playerNames.length} player${playerNames.length === 1 ? '' : 's'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Tournament Bracket"
          note="Single elimination · local"
          chips={['Add players', 'Pick winners', 'Crown a champion', 'Export CSV', 'Works offline']}
        />
      }
    >
      <div role="tablist" aria-label="Views" style={{ marginBottom: 'calc(12px * var(--sf))' }}>
        <div className="lc-tabs">
          {(['Players', 'Bracket', 'Results'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`lc-tab${tab === item ? ' active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Players' && (
        <>
          <Card mono="New" title="Add a player">
            <FormGrid>
              <TextInput
                label="Player name"
                value={name}
                onChange={(value) => {
                  setName(value)
                  if (error) setError(null)
                }}
                error={error}
                placeholder="Alice"
              />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={addPlayer}>
                Add player
              </Button>
            </Actions>
          </Card>
          <Card mono={`${playerNames.length} player${playerNames.length === 1 ? '' : 's'}`} title="Players">
            {playerNames.length === 0 ? (
              <EmptyState mono="Empty" title="No players yet" detail="Add the first player above to start the bracket." />
            ) : (
              <RecordTable records={playerRecords} columns={playerColumns} ariaLabel="Players" />
            )}
          </Card>
        </>
      )}

      {tab === 'Bracket' && (
        <Card mono={`${resolved.length} matches`} title="Bracket">
          {playerNames.length === 0 ? (
            <EmptyState mono="Empty" title="No players yet" detail="Add at least 2 players to see the bracket." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--sf))' }}>
              {rounds.map((r) => (
                <div key={r.round} style={grid}>
                  {r.matches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              ))}
              {championBlock}
            </div>
          )}
        </Card>
      )}

      {tab === 'Results' && (
        <Card
          mono={`${resultsRows.length} result${resultsRows.length === 1 ? '' : 's'}`}
          title="Results"
          actions={
            <Button kind="secondary" onClick={() => void copy(csvText)} disabled={resultsRows.length === 0}>
              {copied ? 'Copied' : 'Export CSV'}
            </Button>
          }
        >
          {resultsRows.length === 0 ? (
            <EmptyState mono="Empty" title="No results yet" detail="Pick winners in the bracket to see results here." />
          ) : (
            <Table
              label="Results"
              columns={[
                { key: 'match', label: 'Match' },
                { key: 'winner', label: 'Winner' },
                { key: 'score', label: 'Score', num: true },
              ]}
              rows={resultsRows.map((r) => ({ cells: { match: r.match, winner: r.winner, score: r.score } }))}
            />
          )}
          {championBlock}
        </Card>
      )}
    </AppShell>
  )
}
