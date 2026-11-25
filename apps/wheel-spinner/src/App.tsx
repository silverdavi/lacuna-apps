// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { cryptoRng, randomInt } from '@lacuna/random'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host/mock'
import type { WheelState } from './host'

type TabId = 'Spin' | 'History'
const TABS: readonly TabId[] = ['Spin', 'History']

function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function App() {
  const [state, setState] = useState<WheelState>(() => host.read())
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ winner: string; at: number } | null>(null)
  const [tab, setTab] = useState<TabId>('Spin')
  const clipboard = useClipboard({ timeoutMs: 1200 })

  const entries = state.entries
  const spins = state.spins

  const lastWinner = spins.length > 0 ? spins[spins.length - 1]?.winner ?? '' : ''

  function add() {
    const next = label.trim()
    if (!next) return setError('Type a name first')
    if (entries.some((e) => e.name === next)) return setError('That entry is already in the list')
    setState(host.addEntry(next))
    setLabel('')
    setError(null)
  }

  function remove(id: string) {
    setState(host.deleteEntry(id))
  }

  function spin() {
    if (entries.length === 0) return
    const winner = entries[randomInt(cryptoRng(), 0, entries.length - 1)].name
    const at = Date.now()
    const next = host.addSpin(winner, at)
    setState(next)
    setResult({ winner, at })
    setTab('Spin')
  }

  function copyResult() {
    if (result === null) return
    void clipboard.copy(`Winner: ${result.winner}`)
  }

  function resetAll() {
    setState(host.clear())
    setResult(null)
    setLabel('')
    setError(null)
  }

  const spinRows = spins.map((s, i) => ({
    cells: {
      winner: i === spins.length - 1 ? `Winner: ${s.winner}` : s.winner,
      at: timeLabel(s.at),
    },
    hot: i === spins.length - 1,
  }))

  return (
    <AppShell
      name="Wheel Spinner"
      icon="grid"
      hue="teal"
      category="Productivity"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · ${spins.length} ${spins.length === 1 ? 'spin' : 'spins'}`}
      side={
        <Rail
          title="Session"
          note={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} on the wheel`}
        >
          <KpiRow>
            <Kpi value={String(entries.length)} label="Entries" />
            <Kpi value={String(spins.length)} label="Spins" accent={spins.length > 0} />
          </KpiRow>
        </Rail>
      }
    >
      <div
        className="lc-tabs"
        role="tablist"
        aria-label="View"
      >
        {TABS.map((t) => (
          <button
            type="button"
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: 'var(--ink)',
              padding: 'calc(2px * var(--sf)) calc(12px * var(--sf)) calc(11px * var(--sf))',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Spin' ? (
        <Stack lg>
          <Card mono="New" title="Add an entry">
            <FormGrid>
              <TextInput label="Entry name" value={label} onChange={setLabel} error={error} placeholder="Alice" />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={add}>Add entry</Button>
            </Actions>
          </Card>

          <Card mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} title="Entries">
            {entries.length === 0 ? (
              <EmptyState mono="Empty" title="No entries yet" detail="Add the first one above." actionLabel="Add entry" />
            ) : (
              <List label="Entries">
                {entries.map((entry) => (
                  <Row
                    key={entry.id}
                    title={entry.name}
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${entry.name}`} onClick={() => remove(entry.id)}>
                        Delete
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>

          <Card mono="Spin" title="Pick a winner">
            <Actions>
              <Button kind="primary" onClick={spin} disabled={entries.length === 0}>
                Spin
              </Button>
              <Button kind="secondary" onClick={copyResult} disabled={result === null}>
                {clipboard.copied ? 'Copied' : 'Copy result'}
              </Button>
              <Button kind="ghost" onClick={resetAll} disabled={entries.length === 0 && spins.length === 0}>
                Reset all
              </Button>
            </Actions>
            {result !== null ? (
              <div role="status" style={{ marginTop: 'calc(14px * var(--sf))', fontFamily: 'var(--serif)', fontSize: 'calc(20px * var(--tf))', color: 'var(--accent)' }}>
                Winner: {result.winner}
              </div>
            ) : (
              <EmptyState
                mono="Empty"
                title="No result yet"
                detail="Add entries, then press Spin."
                actionLabel="Spin"
              />
            )}
          </Card>
        </Stack>
      ) : (
        <Card mono={`${spins.length} ${spins.length === 1 ? 'spin' : 'spins'}`} title="Spin log">
          {spins.length === 0 ? (
            <EmptyState mono="Empty" title="No spins yet" detail="Spin to start the log." actionLabel="Spin" onAction={spin} />
          ) : (
            <Table
              label="Spin log"
              columns={[
                { key: 'winner', label: 'Winner' },
                { key: 'at', label: 'Time' },
              ]}
              rows={spinRows}
              empty="No spins yet"
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
