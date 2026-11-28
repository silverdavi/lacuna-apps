import { Body, Button, Card, EmptyState, List, Pills, Row, Stack } from '@lacuna/ui'
import type { Round } from './deck'
import type { Mode } from './host'

export function Rounds({ rounds, ready, mode, onMode, onOpen }: {
  rounds: Round[]
  ready: boolean
  mode: Mode
  onMode: (m: Mode) => void
  onOpen: (r: Round) => void
}) {
  if (!ready) {
    return (
      <Card mono="Loading" title="Themed rounds">
        <div className="pt-skel" role="status" aria-label="Loading rounds">
          <div className="pt-skel-line wide" />
          <div className="pt-skel-line" />
        </div>
      </Card>
    )
  }
  return (
    <Stack>
      <Card mono={`${rounds.length} rounds`} title="Themed rounds">
        <Stack>
          <Body sm>Eight linked questions in a fixed order. Pick one and play it through.</Body>
          <Pills items={['Solo', 'Quizmaster']} active={mode === 'solo' ? 'Solo' : 'Quizmaster'} onSelect={(v) => onMode(v === 'Solo' ? 'solo' : 'quizmaster')} />
        </Stack>
      </Card>
      {rounds.length === 0 ? (
        <EmptyState mono="Empty" title="No rounds in the bank" />
      ) : (
        <List label="Themed rounds">
          {rounds.map((r) => (
            <Row
              key={r.title + r.rows[0]!.id}
              title={r.title}
              meta={`${r.category ?? 'Mixed categories'} · ${r.rows.length} questions`}
              action={<Button onClick={() => onOpen(r)} ariaLabel={`Play ${r.title}`}>Play</Button>}
            />
          ))}
        </List>
      )}
    </Stack>
  )
}
