// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, TextInput } from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { store, type Poll } from './host/mock'

const MAX_CHOICES = 3

type Draft = { question: string; choices: string[] }

export function App() {
  const [polls, setPolls] = useState<Poll[]>(() => store.list())
  const [draft, setDraft] = useState<Draft>({ question: '', choices: ['', '', ''] })
  const [error, setError] = useState<string | null>(null)

  function persist(next: Poll[]) {
    setPolls(next)
    store.replaceAll(next)
  }

  function setChoice(i: number, v: string) {
    setDraft((d) => {
      const choices = [...d.choices]
      choices[i] = v
      return { ...d, choices }
    })
    if (error) setError(null)
  }

  function createPoll() {
    const question = draft.question.trim()
    const filled = draft.choices.map((c) => c.trim()).filter(Boolean)
    if (!question) {
      setError('Type a question first')
      return
    }
    if (filled.length < 2) {
      setError('Add at least two choices')
      return
    }
    if (filled.some((c, i) => filled.slice(0, i).includes(c))) {
      setError('Choices must be unique')
      return
    }
    const created = store.add({ question, choices: filled, votes: {} })
    setPolls([...polls, created])
    setDraft({ question: '', choices: ['', '', ''] })
    setError(null)
  }

  function vote(poll: Poll, choice: string) {
    const next = polls.map((p) =>
      p.id === poll.id
        ? { ...p, votes: { ...p.votes, [choice]: (p.votes[choice] ?? 0) + 1 } }
        : p,
    )
    persist(next)
  }

  function removePoll(id: string) {
    persist(polls.filter((p) => p.id !== id))
  }

  function totalVotes(p: Poll): number {
    return p.choices.reduce((s, c) => s + (p.votes[c] ?? 0), 0)
  }

  function chartData(p: Poll) {
    return p.choices.map((c) => ({ label: c, value: p.votes[c] ?? 0 }))
  }

  return (
    <AppShell name="Poll Maker" icon="tasks" hue="gold" category="Productivity" meta={`${polls.length} ${polls.length === 1 ? 'poll' : 'polls'}`} status="Saved on this device">
      <Card title="New poll" mono="Create">
        <FormGrid>
          <TextInput
            label="Question"
            value={draft.question}
            onChange={(v) => {
              setDraft((d) => ({ ...d, question: v }))
              if (error) setError(null)
            }}
            error={error}
          />
          {Array.from({ length: MAX_CHOICES }, (_, i) => (
            <TextInput key={i} label={`Choice ${i + 1}`} value={draft.choices[i] ?? ''} onChange={(v) => setChoice(i, v)} />
          ))}
        </FormGrid>
        <Button kind="primary" onClick={createPoll}>
          Create poll
        </Button>
      </Card>

      {polls.length === 0 ? (
        <Card title="Polls" mono="None yet">
          <EmptyState mono="Empty" title="No polls yet" detail="Create your first poll above, then vote to see the charts." />
        </Card>
      ) : (
        polls.map((poll) => (
          <Card key={poll.id}>
            <span style={{ display: 'block', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: '1.1em', marginBottom: 4 }}>{poll.question}</span>
            <div role="list" aria-label={`Choices for ${poll.question}`}>
              {poll.choices.map((choice) => (
                <div key={choice} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontFamily: 'var(--mono)' }}>{choice}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{poll.votes[choice] ?? 0}</span>
                  <Button kind="secondary" ariaLabel={`Vote ${choice}`} onClick={() => vote(poll, choice)}>
                    Vote
                  </Button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Chart type="donut" data={chartData(poll)} title={`Breakdown for ${poll.question}`} ariaLabel={`Donut chart for ${poll.question}`} />
            </div>
            {totalVotes(poll) > 0 ? (
              <div style={{ marginTop: 12, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>Total votes: {totalVotes(poll)}</div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              <Button kind="ghost" onClick={() => removePoll(poll.id)}>
                Delete poll
              </Button>
            </div>
          </Card>
        ))
      )}

    </AppShell>
  )
}
