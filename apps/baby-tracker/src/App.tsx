// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { host } from './host/mock'
import { makeId, type Activity, type ActivityType } from './host/index'

type Filter = 'All' | ActivityType

const FILTER_BUTTONS: { value: Filter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Feeding', label: 'Feeding' },
  { value: 'Sleep', label: 'Naps' },
  { value: 'Diaper', label: 'Wipes' },
]

function formatDuration(min: number | null): string {
  if (min == null) return '\u2014'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function rowTitle(entry: Activity): string {
  const parts: string[] = [entry.type]
  if (entry.notes) parts.push(entry.notes)
  parts.push(formatDuration(entry.durationMin))
  return parts.join(' \u00b7 ')
}

function csvField(value: string | number | null): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function App() {
  const [entries, setEntries] = useState<Activity[]>(() => host.read())
  const [type, setType] = useState<ActivityType>('Feeding')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<Filter>('All')

  const visible = useMemo(
    () => (filter === 'All' ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter],
  )

  function add() {
    const raw = duration.trim()
    const parsed = raw === '' ? null : Number(raw)
    const entry: Activity = {
      id: makeId(),
      type,
      timestamp: new Date().toISOString(),
      durationMin: parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
      notes: notes.trim(),
    }
    host.add(entry)
    setEntries(host.read())
    setDuration('')
    setNotes('')
  }

  function remove(id: string) {
    host.remove(id)
    setEntries(host.read())
  }

  function exportCsv() {
    const lines = ['type,timestamp,duration,notes']
    for (const e of entries) {
      lines.push(
        [e.type, e.timestamp, e.durationMin == null ? '' : String(e.durationMin), e.notes]
          .map(csvField)
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'baby-activities.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      name="Baby Activity Log"
      icon="calendar"
      hue="teal"
      category="Personal"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      actions={<Button kind="secondary" onClick={exportCsv} ariaLabel="Export CSV">Export CSV</Button>}
    >
      <Card mono="New" title="Add an activity">
        <FormGrid>
          <Select
            label="Type"
            value={type}
            onChange={(v) => setType(v as ActivityType)}
            options={[
              { value: 'Feeding', label: 'Feed' },
              { value: 'Sleep', label: 'Nap' },
              { value: 'Diaper', label: 'Wipe' },
            ]}
          />
          <TextInput
            label="Duration (min)"
            value={duration}
            onChange={setDuration}
            type="number"
            inputMode="numeric"
            placeholder="e.g. 45"
          />
          <TextInput label="Notes" value={notes} onChange={setNotes} placeholder="e.g. Bottle, nap, wet" />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={add}>Add activity</PrimaryButton>
        </Actions>
      </Card>

      <Card mono={`${visible.length} shown`} title="Log">
        <div role="group" aria-label="Filters" style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap', marginBottom: 'calc(12px * var(--sf))' }}>
          {FILTER_BUTTONS.filter((f) => f.value === 'All' || entries.some((e) => e.type === f.value)).map((f) => (
            <Button
              key={f.value}
              kind={filter === f.value ? 'primary' : 'secondary'}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        {visible.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No activities yet"
            detail={filter === 'All' ? 'Add the first one above.' : 'Nothing matches this filter.'}
            actionLabel="Add an activity"
            onAction={add}
          />
        ) : (
          <List label="Activities">
            {visible.map((entry) => (
              <Row
                key={entry.id}
                title={rowTitle(entry)}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Delete ${entry.type}`}
                    onClick={() => remove(entry.id)}
                  >
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
