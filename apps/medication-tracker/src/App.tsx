import { useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Row,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { doseStore, medStore, type DoseLog, type Medication } from './host/mock'

const TABS = ['Medications', 'History'] as const
type Tab = (typeof TABS)[number]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function App() {
  const [tab, setTab] = useState<Tab>('Medications')
  const [meds, setMeds] = useState<Medication[]>(() => medStore.list())
  const [doses, setDoses] = useState<DoseLog[]>(() => doseStore.list())
  const [newName, setNewName] = useState('')
  const [newDose, setNewDose] = useState('')
  const [newTime, setNewTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const clipboard = useClipboard()

  function persistMeds(next: Medication[]) {
    setMeds(next)
    medStore.replaceAll(next)
  }

  function persistDoses(next: DoseLog[]) {
    setDoses(next)
    doseStore.replaceAll(next)
  }

  function addMedication() {
    const name = newName.trim()
    const dose = newDose.trim()
    const time = newTime.trim()
    if (!name) {
      setError('Enter a medication name.')
      return
    }
    if (!dose) {
      setError('Enter a dose.')
      return
    }
    if (!time) {
      setError('Enter a time.')
      return
    }
    setError(null)
    const created = medStore.add({ name, dose, time })
    setMeds([...meds, created])
    setNewName('')
    setNewDose('')
    setNewTime('')
  }

  function logDose(med: Medication) {
    const entry: Omit<DoseLog, 'id'> = {
      medicationId: med.id,
      medicationName: med.name,
      dose: med.dose,
      time: med.time,
      loggedAt: new Date().toISOString(),
    }
    const created = doseStore.add(entry)
    setDoses([...doses, created])
  }

  function deleteMedication(med: Medication) {
    persistMeds(meds.filter((m) => m.id !== med.id))
    persistDoses(doses.filter((d) => d.medicationId !== med.id))
  }

  function exportCsv() {
    const lines = ['Medication,Dose,Time']
    for (const m of meds) {
      lines.push([m.name, m.dose, m.time].map(csvEscape).join(','))
    }
    void clipboard.copy(lines.join('\n'))
  }

  const query = search.trim().toLowerCase()
  const filtered = query ? meds.filter((m) => m.name.toLowerCase().includes(query)) : meds

  return (
    <AppShell name="Medication Reminder" icon="calendar" hue="teal" category="Health">
      <div className="lc-tabs" role="tablist" aria-label="Medication Reminder views">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="mr-tab"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Medications' ? (
        <Card title="Medications">
          <FormGrid>
            <TextInput
              label="Medication name"
              value={newName}
              onChange={(v) => {
                setNewName(v)
                if (error) setError(null)
              }}
              error={error}
              placeholder="e.g. Lisinopril"
            />
            <TextInput
              label="Dose"
              value={newDose}
              onChange={(v) => {
                setNewDose(v)
                if (error) setError(null)
              }}
              placeholder="e.g. 10 mg"
            />
            <TextInput
              label="Time"
              type="time"
              value={newTime}
              onChange={(v) => {
                setNewTime(v)
                if (error) setError(null)
              }}
            />
            <TextInput
              label="Search"
              type="search"
              value={search}
              onChange={setSearch}
              placeholder="Filter medications"
            />
          </FormGrid>
          <Button kind="primary" onClick={addMedication}>
            Add medication
          </Button>
        </Card>
      ) : null}

      {tab === 'Medications' ? (
        <Card
          title="List"
          actions={
            meds.length > 0 ? (
              <span>
                <Button kind="secondary" onClick={exportCsv}>
                  Export CSV
                </Button>
                {clipboard.copied ? <Tag accent>copied</Tag> : null}
              </span>
            ) : undefined
          }
        >
          {filtered.length === 0 ? (
            meds.length === 0 ? (
              <EmptyState
                title="No medications yet"
                detail="Add a medication above with its name, dose, and scheduled time."
                actionLabel="Add your first medication"
              />
            ) : (
              <EmptyState
                title="No matches"
                detail="No medications match your search."
                actionLabel="Clear search"
                onAction={() => setSearch('')}
              />
            )
          ) : (
            <List label="Medications">
              {filtered.map((m) => (
                <Row
                  key={m.id}
                  title={m.name}
                  meta={`${m.dose} at ${m.time}`}
                  action={
                    <span>
                      <Button kind="secondary" onClick={() => logDose(m)}>
                        Log dose
                      </Button>
                      <Button kind="ghost" onClick={() => deleteMedication(m)}>
                        Delete {m.name}
                      </Button>
                    </span>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      ) : null}

      {tab === 'Medications' ? (
        <Card title="Dose log">
          {doses.length === 0 ? (
            <EmptyState
              title="No doses logged"
              detail="Use the Log dose button next to a medication to record a dose."
              actionLabel="Log a dose"
            />
          ) : (
            <div className="mr-dose-log" aria-label="Dose log">
              {doses.map((d) => (
                <div key={d.id}>
                  {d.medicationName} {d.dose} taken at {d.time}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'History' ? (
        <Card title="Dose history">
          <Table
            label="Dose history"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'medication', label: 'Medication' },
              { key: 'dose', label: 'Dose' },
              { key: 'time', label: 'Time' },
            ]}
            rows={doses.map((d) => ({
              cells: {
                date: formatDate(d.loggedAt),
                medication: d.medicationName,
                dose: d.dose,
                time: d.time,
              },
            }))}
            empty="No doses logged"
          />
        </Card>
      ) : null}
    </AppShell>
  )
}
