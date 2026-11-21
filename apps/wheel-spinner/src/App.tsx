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
  List,
  Row,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { cryptoRng, randomInt } from '@lacuna/random'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host/mock'
import type { WheelEntry, SpinRecord } from './host'

type TabId = 'Spin' | 'History'
const TABS: TabId[] = ['Spin', 'History']

function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('Spin')
  const clipboard = useClipboard({ timeoutMs: 1200 })

  const entries = state.entries
  const spins = state.spins

  function add() {
    const next = label.trim()
    if (!next) return setError('Type a name first')
    if (entries.some((e) => e.name === next)) return setError('That entry is already in the list')
    setState(host.addEntry(next))
    setLabel('')
    setError(null)
  }

  function remove(entry: WheelEntry) {
    setState(host.deleteEntry(entry.id))
  }

  function spin() {
    if (entries.length === 0) return
    const winner = entries[randomInt(cryptoRng(), 0, entries.length - 1)].name
    const next = host.addSpin(winner)
    setState(next)
    setResult(winner)
    setTab('Spin')
  }

  function copyResult() {
    if (result === null) return
    void clipboard.copy(`Winner: ${result}`)
  }

  function resetAll() {
    setState(host.clear())
    setResult(null)
    setLabel('')
    setError(null)
  }

  const spinRows = spins.map((s: SpinRecord) => ({
    cells: {
      winner: s.winner,
      at: timeLabel(s.at),
    },
  }))

  return (
    <AppShell
      name="Wheel Spinner"
      icon="timesheets"
      hue="gold"
      category="Productivity"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
    >
      <div role="tablist" aria-label="Sections" style={{ display: 'flex', gap: 'calc(4px * var(--sf))', marginBottom: 'calc(16px * var(--sf))' }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(13px * var(--tf))',
              color: tab === t ? 'var(--paper)' : 'var(--ink)',
              background: tab === t ? 'var(--ink)' : 'transparent',
              border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
              borderRadius: 'calc(7px * var(--sf))',
              padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
              cursor: 'pointer',
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
              <TextInput label="Entry name" value={label} onChange={setLabel} error={error} />
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
                      <Button kind="ghost" ariaLabel={`Delete ${entry.name}`} onClick={() => remove(entry)}>
                        Delete {entry.name}
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>

          <Card mono="Spin" title="Pick a winner">
            <Actions>
              <Button kind="primary" onClick={spin} disabled={entries.length === 0}>Spin</Button>
              <Button kind="secondary" onClick={copyResult} disabled={result === null}>
                {clipboard.copied ? 'Copied' : 'Copy result'}
              </Button>
              <Button kind="ghost" onClick={resetAll} disabled={entries.length === 0 && spins.length === 0}>Reset all</Button>
            </Actions>
            {result !== null && (
              <div
                role="status"
                style={{
                  marginTop: 'calc(14px * var(--sf))',
                  padding: 'calc(12px * var(--sf))',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  borderRadius: 'calc(4px * var(--sf))',
                  background: 'var(--ui-card)',
                }}
              >
                <span style={{ fontSize: 'calc(16px * var(--tf))', fontWeight: 600 }}>Winner: {result}</span>
              </div>
            )}
          </Card>
        </Stack>
      ) : (
        <Card mono={`${spins.length} ${spins.length === 1 ? 'spin' : 'spins'}`} title="History">
          {spins.length === 0 ? (
            <EmptyState mono="Empty" title="No spins yet" detail="Spin to start the log." actionLabel="Spin" />
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
