// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, Rail, TextInput } from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { openFile, saveText } from '@lacuna/file-save-open'
import { store, type Poll } from './host/mock'

const MAX_CHOICES = 3
const SPACING = 'calc(8px * var(--sf))'
const SMALL_SPACING = 'calc(4px * var(--sf))'

type Draft = { question: string; choices: string[] }
type BackupPoll = {
  question: string
  choices: string[]
  votes: Record<string, number>
}

function toBackupRecords(polls: Poll[]): Array<{ id: string; data: BackupPoll; createdAt: number; updatedAt: number }> {
  const now = Date.now()
  return polls.map((p) => ({
    id: p.id,
    data: { question: p.question, choices: p.choices, votes: p.votes },
    createdAt: now,
    updatedAt: now,
  }))
}

function validBackupRecord(r: { data: unknown }): string | null {
  const d = r.data as BackupPoll | undefined
  if (!d || typeof d.question !== 'string' || d.question.trim() === '') return 'missing question'
  if (!Array.isArray(d.choices) || d.choices.length < 2) return 'missing two choices'
  if (d.choices.some((c) => typeof c !== 'string' || c.trim() === '')) return 'choice is empty'
  if (new Set(d.choices).size !== d.choices.length) return 'duplicate choice'
  if (typeof d.votes !== 'object' || d.votes === null || Array.isArray(d.votes)) return 'votes are malformed'
  return null
}

export function App() {
  const [polls, setPolls] = useState<Poll[]>(() => store.list())
  const [draft, setDraft] = useState<Draft>({ question: '', choices: ['', '', ''] })
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const active = activeId ? polls.find((p) => p.id === activeId) ?? null : null

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
    setPolls((prev) => [...prev, created])
    setDraft({ question: '', choices: ['', '', ''] })
    setError(null)
    setActiveId(created.id)
    setToast('Poll created')
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
    if (activeId === id) setActiveId(null)
  }

  function totalVotes(p: Poll): number {
    return p.choices.reduce((s, c) => s + (p.votes[c] ?? 0), 0)
  }

  function chartData(p: Poll): ChartDataPoint[] {
    return p.choices.map((c) => ({ label: c, value: p.votes[c] ?? 0 }))
  }

  function topChoice(p: Poll): string | null {
    let top: string | null = null
    let best = -1
    for (const c of p.choices) {
      const v = p.votes[c] ?? 0
      if (v > best) {
        best = v
        top = c
      }
    }
    return best > 0 ? top : null
  }

  const totals = useMemo(() => {
    let all = 0
    let voted = 0
    for (const p of polls) {
      const t = totalVotes(p)
      all += t
      if (t > 0) voted += 1
    }
    return { all, voted }
  }, [polls])

  function exportJson() {
    const json = exportBackup<BackupPoll>({
      appId: 'poll-maker',
      version: 1,
      records: toBackupRecords(polls),
      filename: 'poll-maker',
    })
    saveText(json, { filename: 'poll-maker.json', mimeType: 'application/json' })
    setToast('Exported a JSON backup')
  }

  function pickImport() {
    fileRef.current?.click()
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setImportError(`Could not read ${file.name}: ${result.error}`)
      return
    }
    try {
      const imported = importBackup<BackupPoll>(JSON.stringify(result.data), {
        currentVersion: 1,
        validate: validBackupRecord,
      })
      const existing = new Set(polls.map((p) => p.id))
      const fresh = imported.records.filter((r) => !existing.has(r.id))
      for (const record of fresh) {
        store.add({
          question: record.data.question,
          choices: record.data.choices,
          votes: record.data.votes,
        })
      }
      setPolls(store.list())
      setImportError('')
      if (imported.droppedCount > 0) {
        setToast(`Imported ${fresh.length} polls, skipped ${imported.droppedCount}`)
      } else {
        setToast(fresh.length > 0 ? `Imported ${fresh.length} polls` : 'No new polls in that file')
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import that file')
    }
  }

  return (
    <AppShell
      name="Poll Maker"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={`${polls.length} ${polls.length === 1 ? 'poll' : 'polls'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Poll Maker"
          note="Quick votes"
          chips={[`${polls.length} polls`, `${totals.all} votes`]}
        />
      }
    >
      <Card
        mono="Summary"
        title="Polls at a glance"
        actions={
          polls.length > 0 ? (
            <div style={{ display: 'flex', gap: SMALL_SPACING }}>
              <Button kind="secondary" onClick={exportJson} ariaLabel="Export JSON backup">
                Export
              </Button>
              <Button kind="secondary" onClick={pickImport} ariaLabel="Import JSON backup">
                Import
              </Button>
            </div>
          ) : undefined
        }
      >
        <KpiRow>
          <Kpi value={polls.length} label="Polls" accent />
          <Kpi value={totals.all} label="Total votes" />
          <Kpi value={totals.voted} label="Polls with votes" />
        </KpiRow>
      </Card>

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
            <TextInput
              key={i}
              label={`Choice ${i + 1}`}
              value={draft.choices[i] ?? ''}
              onChange={(v) => setChoice(i, v)}
            />
          ))}
        </FormGrid>
        <Button kind="primary" onClick={createPoll}>
          Create poll
        </Button>
      </Card>

      {polls.length === 0 ? (
        <Card title="Polls" mono="None yet">
          <EmptyState
            mono="Empty"
            title="No polls yet"
            detail="Create your first poll above, then vote to see the results."
          />
        </Card>
      ) : (
        polls.map((poll) => (
          <Card
            key={poll.id}
            actions={
              <Button
                kind="ghost"
                ariaLabel={`View results for ${poll.question}`}
                onClick={() => setActiveId(poll.id)}
              >
                Results
              </Button>
            }
          >
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--serif)',
                fontWeight: 600,
                fontSize: '1.1em',
                marginBottom: SMALL_SPACING,
              }}
            >
              {poll.question}
            </span>
            <div role="list" aria-label={`Choices for ${poll.question}`}>
              {poll.choices.map((choice) => (
                <div
                  key={choice}
                  role="listitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING,
                    marginBottom: SMALL_SPACING,
                  }}
                >
                  <span style={{ flex: 1, fontFamily: 'var(--mono)' }}>{choice}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                    {poll.votes[choice] ?? 0}
                  </span>
                  <Button
                    kind="secondary"
                    ariaLabel={`Vote ${choice}`}
                    onClick={() => vote(poll, choice)}
                  >
                    Vote
                  </Button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: SPACING }}>
              <Chart
                type="donut"
                data={chartData(poll)}
                title={`Breakdown for ${poll.question}`}
                ariaLabel={`Donut chart for ${poll.question}`}
              />
            </div>
            {totalVotes(poll) > 0 ? (
              <div style={{ marginTop: SPACING, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                Total votes: {totalVotes(poll)}
              </div>
            ) : null}
            <div style={{ marginTop: SMALL_SPACING }}>
              <Button kind="ghost" onClick={() => removePoll(poll.id)}>
                Delete poll
              </Button>
            </div>
          </Card>
        ))
      )}

      {active ? (
        <Card mono="Results" title={`Results: ${active.question}`}>
          <KpiRow>
            <Kpi value={totalVotes(active)} label="Total votes" accent />
            <Kpi value={active.choices.length} label="Choices" />
            <Kpi value={topChoice(active) ?? '—'} label="Leading" />
          </KpiRow>
          <div style={{ marginTop: SPACING }}>
            <Chart
              type="donut"
              data={chartData(active)}
              title={`Share of votes for ${active.question}`}
              ariaLabel={`Donut chart for ${active.question}`}
            />
          </div>
          <div style={{ marginTop: SPACING }}>
            <Chart
              type="bar"
              data={chartData(active)}
              title={`Vote counts for ${active.question}`}
              ariaLabel={`Bar chart for ${active.question}`}
            />
          </div>
          <div style={{ marginTop: SPACING }}>
            <Button
              kind="secondary"
              ariaLabel={`Export ${active.question}`}
              onClick={() => {
                saveText(
                  exportBackup<BackupPoll>({
                    appId: 'poll-maker',
                    version: 1,
                    records: toBackupRecords([active]),
                    filename: 'poll-maker',
                  }),
                  { filename: 'poll-maker.json', mimeType: 'application/json' },
                )
                setToast(`Exported ${active.question}`)
              }}
            >
              Export this poll
            </Button>
          </div>
        </Card>
      ) : null}

      {importError ? (
        <Card mono="Import" title="Import">
          <div style={{ color: 'var(--danger)', fontFamily: 'var(--mono)' }}>{importError}</div>
          <div style={{ marginTop: SMALL_SPACING }}>
            <Button kind="ghost" onClick={() => setImportError(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      ) : null}

      {toast ? (
        <div style={{ color: 'var(--ink-60)', fontFamily: 'var(--mono)' }}>{toast}</div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={onImportFile}
      />
    </AppShell>
  )
}
