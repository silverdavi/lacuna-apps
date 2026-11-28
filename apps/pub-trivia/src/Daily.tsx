import { useState } from 'react'
import { Actions, Button, Card, EmptyState, Kpi, KpiRow, Stack, Tag } from '@lacuna/ui'
import { drawDaily, shiftDate, streakOf, TIER_NAMES, type Bank } from './deck'

export function Daily({ bank, today, history, onMark }: {
  bank: Bank | null
  today: string
  history: Record<string, 'got' | 'miss'>
  onMark: (date: string, m: 'got' | 'miss') => void
}) {
  const [open, setOpen] = useState(false)
  if (!bank) {
    return (
      <Card mono="Loading" title="Question of the day">
        <div className="pt-skel" role="status" aria-label="Loading question"><div className="pt-skel-line wide" /><div className="pt-skel-line" /></div>
      </Card>
    )
  }
  const q = drawDaily(bank, today)
  const yesterday = shiftDate(today, -1)
  const yq = drawDaily(bank, yesterday)
  const done = history[today]
  const revealed = open || !!done
  const streak = streakOf(history, today)

  return (
    <Stack>
      <KpiRow>
        <Kpi value={streak} label={streak === 1 ? 'Day streak' : 'Days streak'} accent />
        <Kpi value={Object.keys(history).length} label="Days answered" />
      </KpiRow>
      <Card mono={today} title="Question of the day">
        <div className="pt-card">
          <div className="pt-tags">
            <Tag>{bank.categories[q.c]}</Tag>
            <Tag accent>{TIER_NAMES[q.t]}</Tag>
          </div>
          <p className="pt-q">{q.q}</p>
          {revealed ? (
            <div className="pt-reveal">
              <div className="lc-mono lc-mono-sm lc-faint">Answer</div>
              <p className="pt-a">{q.a}</p>
              {q.n ? <p className="pt-note">{q.n}</p> : null}
            </div>
          ) : null}
        </div>
        {done ? (
          <EmptyState mono="Answered" title={done === 'got' ? 'Got it today' : 'Missed it today'} detail="Come back tomorrow for a new question." />
        ) : (
          <div className="pt-bar pt-bar-inline">
            {!revealed ? (
              <Button kind="primary" onClick={() => setOpen(true)}>Reveal answer</Button>
            ) : (
              <Actions>
                <Button onClick={() => onMark(today, 'miss')}>Missed it</Button>
                <Button kind="primary" onClick={() => onMark(today, 'got')}>Got it</Button>
              </Actions>
            )}
          </div>
        )}
      </Card>
      <Card mono={yesterday} title="Yesterday">
        <div className="pt-card">
          <p className="pt-q pt-small">{yq.q}</p>
          <p className="pt-a pt-small">{yq.a}</p>
          <div className="lc-mono lc-mono-sm lc-faint">
            {history[yesterday] === 'got' ? 'You got it' : history[yesterday] === 'miss' ? 'You missed it' : 'Not answered'}
          </div>
        </div>
      </Card>
    </Stack>
  )
}
