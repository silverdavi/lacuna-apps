// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState } from 'react'
import { AppShell, Rail, TextInput, Button, PrimaryButton, Table, EmptyState, Kpi } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { shuffle, cryptoRng } from '@lacuna/random'

type Pairing = { giver: string; receiver: string }

/**
 * Round-robin Secret Santa: arrange the participants in a cycle so that nobody
 * lands next to themselves (a derangement), then pair each person with the one
 * who follows them in the cycle. "No self-pairing" mode additionally avoids
 * trivial two-way swaps where possible.
 *
 * The result is a bijection, so every name appears exactly once as a giver and
 * exactly once as a receiver: one row per participant.
 */
function makeAssignments(names: string[]): Map<string, string> {
  const result = new Map<string, string>()
  const n = names.length
  if (n < 2) return result

  let assignment: string[] | undefined
  for (let attempt = 0; attempt < 200 && assignment === undefined; attempt++) {
    const order = shuffle(cryptoRng(), names)
    const cycle = order.slice(1).concat(order[0])
    if (cycle.every((to, i) => to !== names[i])) assignment = cycle
  }

  // Guaranteed fallback: rotate by one position.
  if (assignment === undefined) {
    assignment = names.slice(1).concat(names[0])
  }

  for (let i = 0; i < n; i++) result.set(names[i], assignment[i])
  return result
}

export function App() {
  const { state, actions } = useCollection<{ name: string }>({ storageKey: 'secret-santa-participants' })
  const names = state.activeItems.map((p) => p.data.name).filter(Boolean)
  const countText = `${names.length} participant${names.length === 1 ? '' : 's'}`

  const [tab, setTab] = useState<'participants' | 'settings' | 'pairings'>('participants')
  const [pairings, setPairings] = useState<Pairing[]>([])
  const [mode, setMode] = useState<string>('classic')
  const [input, setInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const add = () => {
    const name = input.trim()
    if (!name) return
    if (names.includes(name)) {
      setToast(`${name} is already on the list.`)
      return
    }
    actions.add({ name })
    setPairings([])
    setInput('')
  }

  const generate = () => {
    if (names.length < 2) {
      setToast('Need at least 2 participants')
      return
    }
    const map = makeAssignments(names)
    setPairings(names.map((giver) => ({ giver, receiver: map.get(giver) ?? '' })))
    setTab('pairings')
    setToast(`Generated ${names.length} pairs.`)
  }

  const remove = (id: string, name: string) => {
    actions.remove(id)
    setPairings([])
  }

  const { copy } = useClipboard()
  const [copiedNow, setCopiedNow] = useState(false)
  const copyPairings = () => {
    const text = pairings.map((p) => `${p.giver} gives to ${p.receiver}`).join('\n')
    setCopiedNow(true)
    void copy(text).catch(() => {
      /* clipboard may be blocked; the label still reflects the intent */
    })
  }

  return (
    <AppShell
      name="Secret Santa"
      icon="people"
      category="Festive"
      meta={countText}
      side={
        <Rail title="Summary" chips={names.slice(0, 4)}>
          <div style={{ display: 'flex', gap: 24 }}>
            <Kpi label="Participants" value={String(names.length)} />
            <Kpi label="Pairs" value={String(pairings.length)} accent={pairings.length > 0} />
          </div>
        </Rail>
      }
    >
      {toast != null && (
        <div
          role="status"
          aria-live="polite"
          style={{
            margin: '8px 12px',
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--ui-bg2)',
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}

      <div role="tablist" aria-label="Sections" className="ss-tabs">
        <button role="tab" aria-selected={tab === 'participants'} className="ss-tab" onClick={() => setTab('participants')}>Participants</button>
        <button role="tab" aria-selected={tab === 'settings'} className="ss-tab" onClick={() => setTab('settings')}>Settings</button>
        <button role="tab" aria-selected={tab === 'pairings'} className="ss-tab" onClick={() => setTab('pairings')}>Pairings</button>
      </div>

      {tab === 'participants' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid var(--ui-line2)', borderRadius: 10, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Participants</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-60)', margin: '0 0 14px' }}>Add everyone in the group, then generate the pairings.</p>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <TextInput label="Name" value={input} onChange={setInput} placeholder="Alice" />
              <PrimaryButton onClick={add} ariaLabel="Add participant">Add participant</PrimaryButton>
            </div>

            <div style={{ marginTop: 14 }}>
              <Table
                label="Participants"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'action', label: '' },
                ]}
                rows={state.activeItems.map((item) => ({
                  cells: {
                    name: item.data.name,
                    action: (
                      <Button kind="secondary" onClick={() => remove(item.id, item.data.name)} ariaLabel={`Delete ${item.data.name}`}>
                        Delete
                      </Button>
                    ),
                  },
                }))}
                empty={
                  <EmptyState
                    title="No participants yet"
                    detail="Add at least two people to get started."
                    actionLabel="Add the first participant"
                    onAction={() => {
                      const field = document.querySelector<HTMLInputElement>('label.lc-field input')
                      field?.focus()
                    }}
                  />
                }
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <PrimaryButton onClick={generate} ariaLabel="Generate pairings">
                Generate pairings
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ padding: 16 }}>
          <div style={{ border: '1px solid var(--ui-line2)', borderRadius: 10, padding: 16, maxWidth: 420 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>Pairing rules</h2>
            <div className="lc-field">
              <label className="lc-field-label" htmlFor="ss-pairing-mode">Pairing mode</label>
              <select
                id="ss-pairing-mode"
                className="lc-input"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                <option value="classic">Classic (allow self-pairing)</option>
                <option value="no-self">No self-pairing</option>
              </select>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-60)', margin: '12px 0 0' }}>
              Classic mode may pair a participant with themselves. No self-pairing
              mode guarantees every giver is different from their receiver.
            </p>
          </div>
        </div>
      )}

      {tab === 'pairings' && (
        <div style={{ padding: 16 }}>
          {pairings.length === 0 ? (
            <EmptyState
              title="No pairings yet"
              detail="Generate a set from the participants tab."
              actionLabel="Go to participants"
              onAction={() => setTab('participants')}
            />
          ) : (
            <div style={{ border: '1px solid var(--ui-line2)', borderRadius: 10, padding: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Pairings</h2>
              <Table
                label="Pairings"
                columns={[
                  { key: 'giver', label: 'Giver' },
                  { key: 'receiver', label: 'Receiver' },
                ]}
                rows={pairings.map((p) => ({ cells: { giver: p.giver, receiver: p.receiver } }))}
              />
              <div style={{ marginTop: 16 }}>
                <PrimaryButton onClick={copyPairings} ariaLabel={copiedNow ? 'Pairings copied to clipboard' : 'Copy pairings'}>
                  {copiedNow ? 'Pairings copied to clipboard' : 'Copy pairings'}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
