import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
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
  const [nameError, setNameError] = useState<string | null>(null)
  const [doseError, setDoseError] = useState<string | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
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

  function clearFieldErrors() {
    if (nameError) setNameError(null)
    if (doseError) setDoseError(null)
    if (timeError) setTimeError(null)
  }

  function addMedication() {
    const name = newName.trim()
    const dose = newDose.trim()
    const time = newTime.trim()
    let ok = true
    if (!name) {
      setNameError('Enter a medication name.')
      ok = false
    }
    if (!dose) {
      setDoseError('Enter a dose.')
      ok = false
    }
    if (!time) {
      setTimeError('Enter a scheduled time.')
      ok = false
    }
    if (!ok) return
    clearFieldErrors()
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
    setDoses((current) => [...current, created])
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

  useEffect(() => {
    setMeds(medStore.list())
    setDoses(doseStore.list())
  }, [])

  const lastDose = doses.length > 0 ? doses[doses.length - 1] : null
  const statusParts: string[] = [
    `${meds.length} ${meds.length === 1 ? 'medication' : 'medications'}`,
    `${doses.length} ${doses.length === 1 ? 'dose' : 'doses'} logged`,
  ]
  if (lastDose) {
    statusParts.push(`last dose: ${lastDose.medicationName} ${lastDose.dose} at ${lastDose.time}`)
  }

  return (
    <AppShell
      name="Medication Reminder"
      icon="clinic"
      hue="rust"
      category="Healthcare"
      meta={meds.length === 1 ? '1 medication' : `${meds.length} medications`}
      status={statusParts.join(' · ')}
      side={<Rail title="Doses" note={`${doses.length} logged`} chips={['Add a medication', 'Log a dose', 'Search the list', 'Export CSV', 'Dose history']} />}
    >
      <div className="lc-tabs" role="tablist" aria-label="Medication Reminder views">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'lc-tab mr-tab active' : 'lc-tab mr-tab'}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Medications' ? (
        <Card mono="Input" title="New medication">
          <FormGrid>
            <TextInput
              label="Medication name"
              value={newName}
              onChange={(v) => {
                setNewName(v)
                if (nameError) setNameError(null)
              }}
              error={nameError}
              placeholder="e.g. Lisinopril"
            />
            <TextInput
              label="Dose"
              value={newDose}
              onChange={(v) => {
                setNewDose(v)
                if (doseError) setDoseError(null)
              }}
              error={doseError}
              placeholder="e.g. 10 mg"
            />
            <TextInput
              label="Time"
              type="time"
              value={newTime}
              onChange={(v) => {
                setNewTime(v)
                if (timeError) setTimeError(null)
              }}
              error={timeError}
            />
            <TextInput
              label="Search"
              type="search"
              value={search}
              onChange={setSearch}
              placeholder="Filter medications"
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={addMedication}>
              Add medication
            </Button>
          </Actions>
        </Card>
      ) : null}

      {tab === 'Medications' ? (
        <Card
          mono="List"
          title="Medications"
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
            <div role="list" aria-label="Medications" className="mr-meds-list">
              <div role="listitem" className="mr-med-items">
                {filtered.map((m) => (
                  <div key={m.id} className="mr-med-item">
                    <div>
                      <div className="mr-med-name">{m.name}</div>
                      <div className="mr-med-meta">{m.dose} at {m.time}</div>
                    </div>
                    <div className="mr-med-actions">
                      <Button kind="secondary" onClick={() => logDose(m)}>
                        Log dose
                      </Button>
                      <Button kind="ghost" onClick={() => deleteMedication(m)}>
                        Delete {m.name}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'Medications' ? (
        <Card mono="Log" title="Dose log">
          <section className="mr-dose-log" aria-label="Dose log">
            {doses.length === 0 ? (
              <EmptyState
                title="No doses logged"
                detail="Use the Log dose button next to a medication to record a dose."
                actionLabel="Log a dose"
              />
            ) : (
              <>
                <KpiRow>
                  <Kpi value={String(doses.length)} label="Doses logged" accent />
                </KpiRow>
                {doses.map((d) => (
                  <div key={d.id}>
                    {d.medicationName} {d.dose} taken at {d.time}
                  </div>
                ))}
              </>
            )}
          </section>
        </Card>
      ) : null}

      {tab === 'History' ? (
        <Card mono="History" title="Dose history">
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
