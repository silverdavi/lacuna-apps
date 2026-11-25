// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, PrimaryButton, Stack, Table, TextInput } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { shuffle } from '@lacuna/random'
import './app.css'

type Participant = { name: string }
type Pairing = { giver: string; receiver: string }
type Tab = 'participants' | 'settings'
type PairingMode = 'standard' | 'no-self'

function generatePairings(names: string[], mode: PairingMode): Pairing[] {
  const n = names.length
  if (n < 2) return []

  const pool = [...names]
  if (mode === 'no-self') {
    // Derangement: each person gives to a different person, no self-pairing.
    for (let attempt = 0; attempt < 500; attempt++) {
      const givers = shuffle(Math.random, pool)
      const receivers = shuffle(Math.random, pool)
      let valid = true
      for (let i = 0; i < n; i++) {
        if (givers[i] === receivers[i]) {
          valid = false
          break
        }
      }
      if (valid) {
        return givers.map((giver, i) => ({ giver, receiver: receivers[i] }))
      }
    }
  } else {
    // Standard: each person gives to a random other person (self-pairing allowed).
    const givers = shuffle(Math.random, pool)
    return givers.map((giver) => {
      const others = pool.filter((p) => p !== giver)
      const receiver = others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : giver
      return { giver, receiver }
    })
  }

  // Fallback
  const order = shuffle(Math.random, pool)
  const pairings: Pairing[] = []
  for (let i = 0; i < n; i++) {
    pairings.push({ giver: order[i], receiver: order[(i + 1) % n] })
  }
  return pairings
}

export function App() {
  const { state, actions } = useCollection<Participant>({
    storageKey: 'secret-santa-participants',
  })

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('participants')
  const [mode, setMode] = useState<PairingMode>('standard')
  const [pairings, setPairings] = useState<Pairing[] | null>(null)
  const [pairingsError, setPairingsError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const participants = state.activeItems.map((item) => item.data.name)
  const { copy, copied } = useClipboard({
    timeoutMs: 2500,
    onSuccess: () => {
      setToast('Pairings copied to clipboard')
      window.setTimeout(() => setToast(null), 3000)
    },
  })

  const addParticipant = useCallback(() => {
    const next = name.trim()
    if (!next) {
      setError('Type a name first')
      return
    }
    if (participants.includes(next)) {
      setError('That participant is already in the list')
      return
    }
    actions.add({ name: next })
    setName('')
    setError(null)
  }, [name, participants, actions])

  const deleteParticipant = useCallback(
    (id: string) => {
      actions.remove(id)
      setPairings(null)
      setPairingsError(null)
    },
    [actions],
  )

  const generate = useCallback(() => {
    if (participants.length < 2) {
      setPairingsError('Need at least 2 participants')
      setPairings(null)
      return
    }
    setPairings(generatePairings(participants, mode))
    setPairingsError(null)
  }, [participants, mode])

  const copyPairings = useCallback(async () => {
    if (!pairings) return
    const text = pairings.map((p) => `${p.giver} → ${p.receiver}`).join('\n')
    try {
      await copy(text)
    } catch {
      setToast('Copy failed')
      window.setTimeout(() => setToast(null), 3000)
    }
  }, [pairings, copy])

  const count = participants.length

  return (
    <AppShell
      name="Secret Santa"
      icon="people"
      hue="gold"
      category="Apps"
      meta={count === 0 ? '' : `${count} participant${count === 1 ? '' : 's'}`}
    >
      <div role="tablist" aria-label="App sections" className="ss-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'participants'}
          className={`ss-tab${tab === 'participants' ? ' active' : ''}`}
          onClick={() => setTab('participants')}
        >
          Participants
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settings'}
          className={`ss-tab${tab === 'settings' ? ' active' : ''}`}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
      </div>

      {tab === 'participants' && (
        <Stack lg>
          <Card mono="New" title="Add a participant">
            <FormGrid>
              <TextInput label="Name" value={name} onChange={setName} error={error} placeholder="Alice" />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={addParticipant}>Add participant</PrimaryButton>
            </Actions>
          </Card>

          <Card mono={`${count} saved`} title="Participants">
            {count === 0 ? (
              <EmptyState
                mono="Empty"
                title="No participants yet"
                detail="Add the first one above."
                actionLabel="Add a participant"
                onAction={addParticipant}
              />
            ) : (
              <Table
                label="Participants"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'actions', label: '' },
                ]}
                rows={state.activeItems.map((item) => ({
                  cells: {
                    name: item.data.name,
                    actions: (
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${item.data.name}`}
                        onClick={() => deleteParticipant(item.id)}
                      >
                        Delete
                      </Button>
                    ),
                  },
                }))}
              />
            )}
          </Card>

          <Card mono="Draw" title="Pairings">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button kind="secondary" onClick={generate}>Generate pairings</Button>
            </div>
            {pairingsError ? (
              <div role="alert">{pairingsError}</div>
            ) : pairings ? (
              <Stack>
                <Table
                  label="Pairings"
                  columns={[
                    { key: 'giver', label: 'Giver' },
                    { key: 'receiver', label: 'Receiver' },
                  ]}
                  rows={pairings.map((p) => ({
                    cells: { giver: p.giver, receiver: p.receiver },
                  }))}
                />
                <Actions>
                  <Button kind="secondary" onClick={() => void copyPairings()}>
                    {copied ? 'Copied' : 'Copy pairings'}
                  </Button>
                </Actions>
              </Stack>
            ) : (
              <div className="lc-body-sm" style={{ color: 'var(--ink-60)' }}>
                No pairings yet. Generate a draw to see who gives to whom.
              </div>
            )}
          </Card>
        </Stack>
      )}

      {tab === 'settings' && (
        <Stack lg>
          <Card mono="Options" title="Pairing settings">
            <FormGrid>
              <label className="lc-field">
                <span className="lc-field-label">Pairing mode</span>
                <select
                  className="lc-input"
                  aria-label="Pairing mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PairingMode)}
                >
                  <option value="standard">Standard (allow self-pairing)</option>
                  <option value="no-self">No self-pairing</option>
                </select>
              </label>
            </FormGrid>
            <p className="lc-body-sm">
              {mode === 'no-self'
                ? 'No participant is paired with themselves.'
                : 'A participant may be paired with themselves by chance.'}
            </p>
          </Card>
        </Stack>
      )}

      {toast && <div role="status">{toast}</div>}
    </AppShell>
  )
}
