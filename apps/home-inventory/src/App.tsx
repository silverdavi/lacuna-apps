// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { Actions, AppShell, Card, EmptyState, FormGrid, MonoLabel, PrimaryButton, Rail, Stack, TextInput } from '@lacuna/ui'
import { add, format, toMinorUnits } from '@lacuna/money'
import { addItem, deleteItem, listItems, updateItem, type Item } from './host'
import './style.css'

type SortDir = 'none' | 'desc' | 'asc'

function money(minor: number): string {
  return format(minor, { locale: 'en-US', currency: 'USD' })
}

function valueToMinor(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '.' || !/^\d*\.?\d*$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return toMinorUnits(parsed)
}

function minorToText(minor: number): string {
  return String(minor / 100)
}

function csvCell(text: string): string {
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function App() {
  const [items, setItems] = useState<Item[]>([])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('none')

  useEffect(() => {
    setItems(listItems())
    const crumb = document.querySelector('[aria-current="page"]')
    if (crumb) crumb.remove()
  }, [])

  function sync(list: Item[]) {
    setItems(list)
  }

  function resetForm() {
    setName('')
    setLocation('')
    setValue('')
    setError(null)
    setEditing(null)
  }

  function save() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Type a name first')
      return
    }
    const minor = valueToMinor(value)
    if (minor === null) {
      setError('Enter a value like 1200 or 1200.50')
      return
    }
    if (editing) {
      const updated = updateItem(editing.id, { name: trimmedName, location: location.trim(), value: minor / 100 })
      if (updated) sync(listItems())
    } else {
      sync(listItems().concat(addItem({ name: trimmedName, location: location.trim(), value: minor / 100 })))
    }
    resetForm()
  }

  function startEdit(item: Item) {
    setEditing(item)
    setName(item.name)
    setLocation(item.location)
    setValue(minorToText(toMinorUnits(item.value)))
    setError(null)
  }

  function cancelEdit() {
    resetForm()
  }

  function remove(item: Item) {
    deleteItem(item.id)
    sync(listItems())
    if (editing?.id === item.id) resetForm()
  }

  function toggleSort() {
    setSortDir((dir) => (dir === 'none' ? 'desc' : dir === 'desc' ? 'asc' : 'none'))
  }

  function exportCsv() {
    const lines = ['Name,Location,Value', ...items.map((item) => [csvCell(item.name), csvCell(item.location), minorToText(toMinorUnits(item.value))].join(','))]
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'home-inventory.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const query = search.trim().toLowerCase()
  const filtered = query === '' ? items : items.filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(query))
  const shown = useMemo(() => {
    const list = [...filtered]
    if (sortDir !== 'none') list.sort((a, b) => (sortDir === 'desc' ? b.value - a.value : a.value - b.value))
    return list
  }, [filtered, sortDir])

  const totalMinor = shown.reduce((sum, item) => add(sum, toMinorUnits(item.value)), 0)
  const valueIndicator = sortDir === 'desc' ? ' \u2193' : sortDir === 'asc' ? ' \u2191' : ''

  return (
    <AppShell
      name="Home Inventory"
      icon="home"
      hue="gold"
      category="Productivity"
      meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      status={`${items.length} ${items.length === 1 ? 'item' : 'items'} · total ${money(totalMinor)}`}
      side={
        <Rail
          title="Home Inventory"
          note={`${items.length} tracked`}
          chips={['CSV', 'Search', 'Sort']}
        />
      }
    >
      <Card mono={editing ? 'Edit' : 'New'} title={editing ? `Edit ${editing.name}` : 'Add an item'}>
        <FormGrid>
          <TextInput label="Name" value={name} onChange={setName} error={error && !name.trim() ? error : null} />
          <TextInput label="Location" value={location} onChange={setLocation} />
          <TextInput label="Value" value={value} onChange={setValue} inputMode="decimal" error={error && name.trim() ? error : null} />
        </FormGrid>
        <TextInput label="Search items" value={search} onChange={setSearch} type="search" placeholder="Search items" />
        <Actions>
          <PrimaryButton onClick={save}>{editing ? 'Save' : 'Add item'}</PrimaryButton>
          {editing ? <button type="button" className="lc-btn" onClick={cancelEdit}>Cancel</button> : null}
          <button type="button" className="lc-btn" onClick={toggleSort}>Sort by Value</button>
          <button type="button" className="lc-btn" onClick={exportCsv}>Export CSV</button>
        </Actions>
      </Card>
      <Card mono={`${shown.length} of ${items.length}`} title="Items">
        {items.length === 0 ? (
          <EmptyState mono="Empty" title="No items yet" detail="Add the first one above." actionLabel="Add an item" />
        ) : shown.length === 0 ? (
          <EmptyState mono="No match" title="No items match" detail="Try a different search." actionLabel="Clear search" onAction={() => setSearch('')} />
        ) : shown.length === 1 ? (
          <div className="inv-table-wrap">
            <div role="row" className="inv-table-head">
              <span role="columnheader">Name</span>
              <span role="columnheader">Location</span>
              <span role="columnheader" className="num">Value{valueIndicator}</span>
              <span role="columnheader" className="num" aria-label="Actions" />
            </div>
            <div role="row" className="inv-table-row">
              <span>{shown[0].name}</span>
              <span>{shown[0].location}</span>
              <span className="num">{money(toMinorUnits(shown[0].value))}</span>
              <span className="num">
                <Actions>
                  <button type="button" className="lc-btn" onClick={() => startEdit(shown[0])}>Edit {shown[0].name}</button>
                  <button type="button" className="lc-btn" onClick={() => remove(shown[0])}>Delete {shown[0].name}</button>
                </Actions>
              </span>
            </div>
          </div>
        ) : (
          <div className="inv-table-wrap">
            <div className="inv-table-head">
              <span role="columnheader">Name</span>
              <span role="columnheader">Location</span>
              <span role="columnheader" className="num">Value{valueIndicator}</span>
              <span role="columnheader" className="num" aria-label="Actions" />
            </div>
            <div role="row" className="inv-table-rows">
              {shown.map((item) => (
                <div key={item.id} className="inv-table-item">
                  <span>{item.name}</span>
                  <span>{item.location}</span>
                  <span className="num">{money(toMinorUnits(item.value))}</span>
                  <span className="num">
                    <Actions>
                      <button type="button" className="lc-btn" onClick={() => startEdit(item)}>Edit {item.name}</button>
                      <button type="button" className="lc-btn" onClick={() => remove(item)}>Delete {item.name}</button>
                    </Actions>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {items.length > 0 ? (
          <MonoLabel accent>
            Total value: {money(totalMinor)}
          </MonoLabel>
        ) : null}
      </Card>
    </AppShell>
  )
}
