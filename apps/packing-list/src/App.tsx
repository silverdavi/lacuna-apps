// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
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
  PrimaryButton,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { tripStore } from './host'

type PackData = { name: string; checked: boolean }

export function App() {
  const { state, actions } = useCollection<PackData>({ storageKey: 'packing-list' })
  const items = state.activeItems
  const [tab, setTab] = useState('Items')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [destination, setDestination] = useState(() => tripStore.get().destination)
  const [departure, setDeparture] = useState(() => tripStore.get().departureDate)

  const { copied, copy } = useClipboard()

  const total = items.length
  const packed = items.filter((i) => i.data.checked).length

  const add = () => {
    const n = name.trim()
    if (n === '') {
      setError('Enter an item name')
      return
    }
    actions.add({ name: n, checked: false })
    setName('')
    setError(null)
  }

  const commitEdit = () => {
    if (editingId === null) return
    const n = editValue.trim()
    if (n === '') {
      setEditingId(null)
      return
    }
    actions.update(editingId, { name: n })
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveTrip = () => {
    tripStore.set({ destination: destination.trim(), departureDate: departure.trim() })
  }

  const copySummary = () => {
    const packedNames = items.filter((i) => i.data.checked).map((i) => i.data.name)
    const remainingNames = items.filter((i) => !i.data.checked).map((i) => i.data.name)
    void copy(`Packed: ${packedNames.join(', ')}\nRemaining: ${remainingNames.join(', ')}`)
  }

  // Alt+ArrowUp on the focused list row moves that item above the previous one.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.key !== 'ArrowUp') return
      const row = (event.target as HTMLElement | null)?.closest?.('li.lk-row')
      if (!row) return
      const nameEl = row.querySelector('.pl-row-name')
      const label = nameEl?.textContent?.trim()
      if (!label) return
      const idx = items.findIndex((i) => i.data.name === label)
      if (idx > 0) {
        event.preventDefault()
        actions.reorder(idx, idx - 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [items, actions])

  // Make each list row programmatically focusable so the Alt+ArrowUp shortcut can target it.
  useEffect(() => {
    const rows = Array.from(document.querySelectorAll('li.lk-row'))
    for (const row of rows) {
      if (row.getAttribute('tabindex') === null) row.setAttribute('tabindex', '-1')
    }
  }, [total])

  const trip = tripStore.get()

  const tabs = ['Items', 'Trip details'] as const

  return (
    <AppShell
      name="Packing List"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={total === 1 ? '1 item' : `${total} items`}
      status={copied ? 'Copied to clipboard' : undefined}
      actions={
        total > 0 ? (
          <Button ariaLabel="Copy summary" onClick={copySummary}>
            Copy summary
          </Button>
        ) : undefined
      }
      side={
        <Rail
          title="Trip"
          chips={[
            `Progress: ${packed} of ${total} packed`,
            `Items: ${total}`,
            trip.destination ? `Destination: ${trip.destination}` : 'No destination set',
            trip.departureDate ? `Departs ${trip.departureDate}` : 'No departure date',
            'Alt+ArrowUp moves an item up',
          ]}
        />
      }
    >
      <Stack>
        <div role="tablist" aria-label="Sections" className="pl-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={`${t.toLowerCase().replace(/\s+/g, '-')}-panel`}
              id={`${t.toLowerCase().replace(/\s+/g, '-')}-tab`}
              className={`pl-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Items' ? (
          <div role="tabpanel" id="items-panel" aria-labelledby="items-tab">
            <Stack>
              <Card mono="New" title="Add an item">
                <FormGrid>
                  <TextInput
                    label="Item name"
                    value={name}
                    onChange={(v) => {
                      setName(v)
                      if (error !== null) setError(null)
                    }}
                    placeholder="What to pack?"
                    error={error}
                  />
                </FormGrid>
                <Actions>
                  <PrimaryButton onClick={add}>Add item</PrimaryButton>
                </Actions>
              </Card>

              <Card mono="Progress" title="Items">
                {total === 0 ? (
                  <EmptyState
                    mono="Empty"
                    title="No items yet"
                    detail="Add the first one above."
                    actionLabel="Add an item"
                    onAction={add}
                  />
                ) : (
                  <Stack>
                    <KpiRow>
                      <Kpi value={`${packed} of ${total}`} label="packed" accent />
                      <Kpi value={total} label="total items" />
                      <Kpi value={`${total - packed}`} label="to pack" />
                    </KpiRow>
                    <List label="Items">
                      {items.map((item) => {
                        const isEditing = editingId === item.id
                        return (
                          <Row
                            key={item.id}
                          title={
                            isEditing ? (
                              <>
                                <span className="pl-row-name">{item.data.name}</span>
                                <input
                                    type="text"
                                    aria-label="Edit item name"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') commitEdit()
                                      if (e.key === 'Escape') cancelEdit()
                                    }}
                                    autoFocus
                                    className="lc-input pl-item-edit"
                                  />
                                </>
                              ) : (
                                <>
                                  <input
                                    type="checkbox"
                                    aria-label={item.data.name}
                                    checked={item.data.checked}
                                    onChange={(e) => actions.update(item.id, { checked: e.target.checked })}
                                    className="pl-item-check"
                                  />
                                  <span className="pl-row-name">{item.data.name}</span>
                                </>
                              )
                            }
                            action={
                              isEditing ? (
                                <span className="pl-item-actions">
                                  <Button kind="ghost" ariaLabel="Save" onClick={commitEdit}>
                                    Save
                                  </Button>
                                  <Button kind="ghost" ariaLabel="Cancel" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                </span>
                              ) : (
                                <span className="pl-item-actions">
                                  <Button
                                    kind="ghost"
                                    ariaLabel="Edit"
                                    onClick={() => {
                                      setEditingId(item.id)
                                      setEditValue(item.data.name)
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                                      <path d="M9.5 2.5l2 2L5 11H3v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" />
                                    </svg>
                                  </Button>
                                  <Button kind="ghost" ariaLabel="Delete" onClick={() => actions.remove(item.id)}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.2" />
                                    </svg>
                                  </Button>
                                </span>
                              )
                            }
                          />
                        )
                      })}
                    </List>
                  </Stack>
                )}
              </Card>
            </Stack>
          </div>
        ) : (
          <div role="tabpanel" id="trip-details-panel" aria-labelledby="trip-details-tab">
            <Card mono="Trip" title="Trip details">
              <FormGrid>
                <TextInput label="Destination" value={destination} onChange={setDestination} placeholder="Where to?" />
                <TextInput label="Departure date" type="date" value={departure} onChange={setDeparture} placeholder="Pick a date" />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={saveTrip}>Save</PrimaryButton>
              </Actions>
            </Card>
          </div>
        )}
      </Stack>
    </AppShell>
  )
}
