import { useEffect, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  PrimaryButton,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { cryptoRng, shuffle } from '@lacuna/random'

type PairingMode = 'No self-pairing' | 'Allow self-pairing'

interface Pairing {
  giver: string
  receiver: string
}

const TABS = ['Participants', 'Settings', 'Pairings'] as const
type Tab = (typeof TABS)[number]

function generatePairings(names: string[], mode: PairingMode): Pairing[] {
  const n = names.length
  if (n < 2) return []
  const rng = cryptoRng()
  if (mode === 'No self-pairing') {
    // Derangement: every participant gives to exactly one different participant.
    for (;;) {
      const receivers = shuffle(rng, [...names])
      if (receivers.every((r, i) => r !== names[i])) {
        return names.map((giver, i) => ({ giver, receiver: receivers[i] }))
      }
    }
  }
  const receivers = shuffle(rng, [...names])
  return names.map((giver, i) => ({ giver, receiver: receivers[i] }))
}

export function App() {
  const [tab, setTab] = useState<Tab>('Participants')
  const [mode, setMode] = useState<PairingMode>('No self-pairing')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pairings, setPairings] = useState<Pairing[] | null>(null)
  const { state, actions } = useCollection<{ name: string }>({
    storageKey: 'secret-santa.participants',
  })
  const clipboard = useClipboard({ timeoutMs: 2000 })

  const names = state.activeItems.map((i) => i.data.name)
  const nameKey = names.join('\u0000')

  useEffect(() => {
    setPairings(null)
  }, [nameKey])

  function add() {
    const name = draft.trim()
    if (name === '') return
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setError(`${name} is already in the list.`)
      return
    }
    actions.add({ name })
    setDraft('')
    setError(null)
  }

  function remove(name: string) {
    const item = state.items.find((it) => it.data.name === name)
    if (item) actions.remove(item.id)
    setPairings(null)
  }

  function generate() {
    if (names.length < 2) {
      setError('Need at least 2 participants')
      return
    }
    setPairings(generatePairings(names, mode))
    setError(null)
    setTab('Pairings')
  }

  function copyPairings() {
    if (!pairings || pairings.length === 0) return
    const lines = pairings.map((p) => `${p.giver} → ${p.receiver}`)
    void clipboard.copy(lines.join('\n'))
  }

  const participantRows = names.map((name) => ({
    cells: {
      name,
      action: (
        <Button kind="ghost" ariaLabel={`Delete ${name}`} onClick={() => remove(name)}>
          Delete
        </Button>
      ),
    },
  }))

  const pairingRows = (pairings ?? []).map((p) => ({
    cells: { giver: p.giver, receiver: p.receiver },
  }))

  return (
    <AppShell
      name="Secret Santa"
      icon="people"
      hue="rust"
      category="Personal"
      meta={names.length === 1 ? '1 participant' : `${names.length} participants`}
      status={pairings && pairings.length > 0 ? `${pairings.length} pairs generated` : 'No pairings yet'}
    >
      <div role="tablist" aria-label="Secret Santa views" className="ss-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            className="ss-tab"
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Participants' ? (
        <div role="tabpanel" id="panel-Participants" aria-labelledby="tab-Participants">
          <Card title="Add a participant">
            <TextInput
              label="Name"
              value={draft}
              onChange={(v) => {
                setDraft(v)
                setError(null)
              }}
              placeholder="e.g. Priya"
            />
            {error ? <p role="alert">{error}</p> : null}
            <PrimaryButton onClick={add}>Add participant</PrimaryButton>
          </Card>

          <Card title="Participants">
            <Table
              label="Participants"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'action', label: '' },
              ]}
              rows={participantRows}
              empty="No participants yet"
            />
          </Card>

          <PrimaryButton onClick={generate}>Generate pairings</PrimaryButton>
        </div>
      ) : null}

      {tab === 'Settings' ? (
        <div role="tabpanel" id="panel-Settings" aria-labelledby="tab-Settings">
          <Card title="Pairing settings">
            <div className="lc-field">
              <label className="lc-field-label" htmlFor="pairing-mode">
                Pairing mode
              </label>
              <select
                id="pairing-mode"
                className="lc-input"
                value={mode}
                onChange={(e) => setMode(e.target.value as PairingMode)}
              >
                <option value="No self-pairing">No self-pairing</option>
                <option value="Allow self-pairing">Allow self-pairing</option>
              </select>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'Pairings' ? (
        <div role="tabpanel" id="panel-Pairings" aria-labelledby="tab-Pairings">
          {pairings && pairings.length > 0 ? (
            <Card mono={`${pairings.length} pairs`} title="Pairings">
              <Table
                label="Pairings"
                columns={[
                  { key: 'giver', label: 'Giver' },
                  { key: 'receiver', label: 'Receiver' },
                ]}
                rows={pairingRows}
              />
              <div className="ss-actions">
                <Button kind="secondary" onClick={copyPairings}>Copy pairings</Button>
              </div>
            </Card>
          ) : (
            <Card title="Pairings">
              <EmptyState
                title="No pairings yet"
                detail="Add at least two participants, then generate a pairing."
                actionLabel="Generate pairings"
                onAction={generate}
              />
            </Card>
          )}
        </div>
      ) : null}

      {clipboard.copied ? (
        <div role="status" aria-live="polite">
          Pairings copied to clipboard
        </div>
      ) : null}
    </AppShell>
  )
}
