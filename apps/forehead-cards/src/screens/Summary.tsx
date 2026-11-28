import { Actions, Body, Card, Kpi, KpiRow, List, PrimaryButton, Row, Stack, Table, Tag, Button } from '@lacuna/ui'
import type { RoundRecord } from '../lib/game'

export function Summary({ rounds, teamNames, teamMode, nextTeam, onToggle, onNext, onBack }: {
  rounds: RoundRecord[]
  teamNames: string[]
  teamMode: boolean
  nextTeam: string
  onToggle: (round: number, index: number) => void
  onNext: () => void
  onBack: () => void
}) {
  const last = rounds.length - 1
  const round = rounds[last]
  if (!round) return null
  const score = round.played.filter((p) => p.result === 'correct').length
  const totals = teamNames.map((_, t) =>
    rounds.filter((r) => r.team === t).reduce((n, r) => n + r.played.filter((p) => p.result === 'correct').length, 0),
  )
  const best = Math.max(...totals)

  return (
    <Stack lg>
      <Card mono={teamMode ? teamNames[round.team] : `Round ${rounds.length}`} title="Round over">
        <KpiRow>
          <Kpi value={score} label="Correct" accent />
          <Kpi value={round.played.length - score} label="Passed" />
        </KpiRow>
        {round.note && <Body sm>{round.note}</Body>}
        {round.played.length === 0 ? (
          <Body>No cards were played this round.</Body>
        ) : (
          <>
            <Body sm>Tap a card to change a mistaken call.</Body>
            <List label="Cards this round">
              {round.played.map((p, i) => (
                <Row
                  key={`${p.card.text}-${i}`}
                  title={p.card.text}
                  meta={p.card.category}
                  value={<Tag accent={p.result === 'correct'}>{p.result === 'correct' ? 'Correct' : 'Passed'}</Tag>}
                  onClick={() => onToggle(last, i)}
                />
              ))}
            </List>
          </>
        )}
        <Actions>
          <PrimaryButton onClick={onNext}>{teamMode ? `Next team: ${nextTeam}` : 'Play again'}</PrimaryButton>
          <Button onClick={onBack}>Back to setup</Button>
        </Actions>
      </Card>

      {teamMode && (
        <Card mono="Scoreboard" title="Teams">
          <Table
            label="Team scoreboard"
            columns={[{ key: 'team', label: 'Team' }, { key: 'rounds', label: 'Rounds', num: true }, { key: 'score', label: 'Correct', num: true }]}
            rows={teamNames.map((n, t) => ({ hot: best > 0 && totals[t] === best, cells: { team: n, rounds: rounds.filter((r) => r.team === t).length, score: totals[t] } }))}
          />
        </Card>
      )}
    </Stack>
  )
}
