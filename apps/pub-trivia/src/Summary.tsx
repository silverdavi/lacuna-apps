import { Actions, Button, Card, EmptyState, Kpi, KpiRow, List, Row, Stack, Table } from '@lacuna/ui'
import { percent, type Bank } from './deck'
import type { Session } from './session'

export function Summary({ bank, s, onAgain, onRetry, onDone }: {
  bank: Bank
  s: Session
  onAgain: () => void
  onRetry: () => void
  onDone: () => void
}) {
  const solo = s.mode === 'solo'
  const got = s.cards.filter((_, i) => s.marks[i] === 'got').length
  const missedCards = s.cards.filter((_, i) => s.marks[i] === 'miss')
  const skipped = s.cards.filter((_, i) => s.marks[i] === 'skip').length
  const scored = got + missedCards.length

  const byCat = new Map<number, { cards: number; got: number; scored: number }>()
  s.cards.forEach((card, i) => {
    const e = byCat.get(card.c) ?? { cards: 0, got: 0, scored: 0 }
    e.cards++
    if (s.marks[i] === 'got') e.got++
    if (s.marks[i] === 'got' || s.marks[i] === 'miss') e.scored++
    byCat.set(card.c, e)
  })
  const catRows = [...byCat.entries()].sort((x, y) => y[1].cards - x[1].cards).map(([c, e]) => ({
    cells: { cat: bank.categories[c], cards: e.cards, got: e.got, pct: solo ? `${percent(e.got, e.scored)}%` : '-' },
  }))

  const teamRows = s.teams.map((name, t) => ({
    name,
    points: Object.values(s.awards).filter((a) => a.includes(t)).length,
  })).sort((x, y) => y.points - x.points)

  return (
    <Stack>
      <Card mono="Deck finished" title={s.title || 'Summary'}>
        <Stack>
          {solo ? (
            <KpiRow>
              <Kpi value={`${got} of ${scored}`} label="Score" accent />
              <Kpi value={`${percent(got, scored)}%`} label="Correct" />
              <Kpi value={missedCards.length} label="Missed" />
              <Kpi value={skipped} label="Skipped" />
            </KpiRow>
          ) : (
            <KpiRow>
              <Kpi value={s.cards.length} label="Cards read" accent />
              {teamRows.length > 0 ? <Kpi value={`${teamRows[0]!.name}`} label="Leading" /> : null}
            </KpiRow>
          )}
          <Actions>
            <Button kind="primary" onClick={onAgain}>Play again</Button>
            {solo ? <Button onClick={onRetry} disabled={missedCards.length === 0}>Retry missed</Button> : null}
            <Button kind="ghost" onClick={onDone}>Change settings</Button>
          </Actions>
        </Stack>
      </Card>

      {!solo && teamRows.length > 0 ? (
        <Card mono="Teams" title="Scoreboard">
          <Table
            label="Team scores"
            columns={[{ key: 'team', label: 'Team' }, { key: 'pts', label: 'Points', num: true }]}
            rows={teamRows.map((t, i) => ({ hot: i === 0, cells: { team: t.name, pts: t.points } }))}
          />
        </Card>
      ) : null}

      <Card mono="By category" title="Breakdown">
        <Table
          label="Per-category results"
          columns={[
            { key: 'cat', label: 'Category' },
            { key: 'cards', label: 'Cards', num: true },
            { key: 'got', label: 'Got it', num: true },
            { key: 'pct', label: 'Correct', num: true },
          ]}
          rows={catRows}
        />
      </Card>

      {solo ? (
        <Card mono={`${missedCards.length} missed`} title="Missed questions">
          {missedCards.length === 0 ? (
            <EmptyState mono="Clean" title="Nothing missed" detail="Every scored card was a Got it." />
          ) : (
            <List label="Missed questions">
              {missedCards.map((c) => (
                <Row key={c.id} title={c.q} meta={bank.categories[c.c]} value={c.a} />
              ))}
            </List>
          )}
        </Card>
      ) : null}
    </Stack>
  )
}
