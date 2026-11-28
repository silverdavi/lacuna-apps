import { useState } from 'react'
import { Actions, Body, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, Stack, TextInput } from '@lacuna/ui'
import { host, type DeckRecord } from '../host'
import { parseEntries } from '../lib/game'

type Draft = { id: string | null; name: string; category: string; text: string }
const BLANK: Draft = { id: null, name: '', category: '', text: '' }

export function Decks({ decks, setDecks }: { decks: DeckRecord[]; setDecks: (d: DeckRecord[]) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<{ name?: string; text?: string }>({})
  const [removed, setRemoved] = useState<{ deck: DeckRecord; index: number } | null>(null)

  function save() {
    if (!draft) return
    const name = draft.name.trim()
    const entries = parseEntries(draft.text)
    const next: { name?: string; text?: string } = {}
    if (!name) next.name = 'Give the deck a name'
    else if (decks.some((d) => d.id !== draft.id && d.name.toLowerCase() === name.toLowerCase())) next.name = 'A deck with that name already exists'
    if (entries.length === 0) next.text = 'Add at least one entry, one per line'
    setError(next)
    if (next.name || next.text) return
    setDecks(host.saveDeck({ id: draft.id ?? host.newDeckId(), name, category: draft.category.trim(), entries }))
    setDraft(null)
  }

  function remove(deck: DeckRecord) {
    const index = decks.findIndex((d) => d.id === deck.id)
    setDecks(host.deleteDeck(deck.id))
    setRemoved({ deck, index })
    if (draft?.id === deck.id) setDraft(null)
  }

  function undo() {
    if (!removed) return
    setDecks(host.restoreDeck(removed.deck, removed.index))
    setRemoved(null)
  }

  return (
    <Stack lg>
      <Card mono={`${decks.length} saved`} title="Custom decks" actions={<Button onClick={() => { setError({}); setDraft({ ...BLANK }) }}>New deck</Button>}>
        {removed && (
          <div className="fc-undo" role="status">
            <span>Deleted {removed.deck.name}.</span>
            <Button kind="ghost" onClick={undo}>Undo</Button>
          </div>
        )}
        {decks.length === 0 ? (
          <EmptyState mono="Empty" title="No custom decks yet" detail="Write your own names, one per line, and mix them into a round." actionLabel="New deck" onAction={() => { setError({}); setDraft({ ...BLANK }) }} />
        ) : (
          <List label="Custom decks">
            {decks.map((d) => (
              <Row
                key={d.id}
                title={d.name}
                meta={`${d.entries.length} ${d.entries.length === 1 ? 'entry' : 'entries'}${d.category ? ` · ${d.category}` : ''}`}
                action={
                  <Actions>
                    <Button kind="ghost" ariaLabel={`Edit ${d.name}`} onClick={() => { setError({}); setDraft({ id: d.id, name: d.name, category: d.category, text: d.entries.join('\n') }) }}>Edit</Button>
                    <Button kind="ghost" ariaLabel={`Delete ${d.name}`} onClick={() => remove(d)}>Delete</Button>
                  </Actions>
                }
              />
            ))}
          </List>
        )}
      </Card>

      {draft && (
        <Card mono={draft.id ? 'Edit' : 'New'} title={draft.id ? 'Edit deck' : 'New deck'}>
          <FormGrid>
            <TextInput label="Deck name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} error={error.name} />
            <TextInput label="Category label (optional)" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} hint="Shown on each card. Defaults to the deck name." />
            <TextInput label="Entries, one per line" value={draft.text} onChange={(v) => setDraft({ ...draft, text: v })} rows={8} error={error.text} />
          </FormGrid>
          <Body sm>{parseEntries(draft.text).length} entries. Blank lines and repeats are skipped. Use public figures, characters and everyday things.</Body>
          <Actions>
            <PrimaryButton onClick={save}>Save deck</PrimaryButton>
            <Button onClick={() => setDraft(null)}>Cancel</Button>
          </Actions>
        </Card>
      )}
    </Stack>
  )
}
