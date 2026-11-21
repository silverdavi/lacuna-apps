// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { saveBlob } from '@lacuna/file-save-open'
import { toCsv } from '@lacuna/csv-parse'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { host, type Application } from './host'
import './app.css'

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Hired']
const STATUS_RANK: Record<string, number> = {
  Applied: 0,
  Interview: 1,
  Offer: 2,
  Rejected: 3,
  Hired: 4,
}

export function App() {
  const [applications, setApplications] = useState<Application[]>(() => host.loadApplications())
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('Applied')
  const [interviewDate, setInterviewDate] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = applications.filter((a) => {
      const matchesSearch = !q || `${a.company} ${a.role} ${a.status}`.toLowerCase().includes(q)
      const matchesStatus = !statusFilter || a.status === statusFilter
      return matchesSearch && matchesStatus
    })
    const sorted = [...rows].sort((a, b) => {
      const ra = STATUS_RANK[a.status] ?? 99
      const rb = STATUS_RANK[b.status] ?? 99
      if (ra !== rb) return ra - rb
      return a.company.localeCompare(b.company)
    })
    return sortAsc ? sorted : sorted.reverse()
  }, [applications, search, statusFilter, sortAsc])

  function resetForm() {
    setCompany('')
    setRole('')
    setStatus('Applied')
    setInterviewDate('')
    setError('')
  }

  function onAdd() {
    if (!company.trim() || !role.trim()) {
      setError('Enter a company and a role')
      return
    }
    setError('')
    setApplications(host.addApplication(company.trim(), role.trim(), status, interviewDate))
    resetForm()
  }

  function startEdit(a: Application) {
    setEditingId(a.id)
    setCompany(a.company)
    setRole(a.role)
    setStatus(a.status)
    setInterviewDate(a.interviewDate)
    setError('')
  }

  function onSave() {
    if (!editingId) return
    if (!company.trim() || !role.trim()) {
      setError('Enter a company and a role')
      return
    }
    setError('')
    setApplications(host.updateApplication(editingId, company.trim(), role.trim(), status, interviewDate))
    setEditingId(null)
    resetForm()
  }

  function onCancel() {
    setEditingId(null)
    resetForm()
  }

  function onDelete(id: string) {
    setApplications(host.deleteApplication(id))
  }

  function onToggleFilter(s: string) {
    setStatusFilter((prev) => (prev === s ? null : s))
  }

  function onSort() {
    setSortAsc((prev) => !prev)
  }

  function onExport() {
    const rows: string[][] = [
      ['Company', 'Role', 'Status', 'Interview Date'],
      ...visible.map((a) => [a.company, a.role, a.status, a.interviewDate]),
    ]
    saveBlob(new Blob([toCsv(rows)], { type: 'text/csv' }), {
      filename: 'applications.csv',
      mimeType: 'text/csv',
    })
  }

  const sortArrow = sortAsc ? ' \u2191' : ' \u2193'

  return (
    <AppShell
      name="Job Application Tracker"
      icon="briefcase"
      hue="gold"
      category="Productivity"
      meta={`${applications.length} ${applications.length === 1 ? 'application' : 'applications'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Job Application Tracker"
          note="Every application · local"
          chips={['Track', 'Export CSV', 'Works offline']}
        />
      }
    >
      <Stack lg>
        <Card mono={editingId ? 'Edit' : 'New'} title={editingId ? 'Edit application' : 'Add an application'}>
          <FormGrid>
            <TextInput label="Company" value={company} onChange={setCompany} error={error || null} />
            <TextInput label="Role" value={role} onChange={setRole} />
            <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
            <TextInput label="Interview Date" type="date" value={interviewDate} onChange={setInterviewDate} />
          </FormGrid>
          <Actions>
            {editingId ? (
              <>
                <Button kind="primary" onClick={onSave}>Save</Button>
                <Button kind="ghost" onClick={onCancel}>Cancel</Button>
              </>
            ) : (
              <Button kind="primary" onClick={onAdd}>Add application</Button>
            )}
          </Actions>
        </Card>

        <Card mono={`${applications.length} ${applications.length === 1 ? 'application' : 'applications'}`} title="Applications">
          <div className="job-controls">
            <div className="job-search">
              <TextInput label="Search" type="search" value={search} onChange={setSearch} />
            </div>
            <div className="job-chips">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={statusFilter === s ? 'job-chip on' : 'job-chip'}
                  onClick={() => onToggleFilter(s)}
                  aria-pressed={statusFilter === s}
                >
                  {s}
                </button>
              ))}
            </div>
            <Actions>
              <Button kind="secondary" onClick={onExport}>Export CSV</Button>
            </Actions>
          </div>
          {applications.length === 0 ? (
            <EmptyState mono="Empty" title="No applications yet" detail="Add the first one above." />
          ) : (
            <Table
              label="Applications"
              columns={[
                { key: 'company', label: 'Company' },
                { key: 'role', label: 'Role' },
                {
                  key: 'status',
                  label: (
                    <button type="button" className="job-sort" onClick={onSort}>
                      Status{statusFilter ? sortArrow : ''}
                    </button>
                  ),
                },
                { key: 'interviewDate', label: 'Interview Date' },
                { key: 'actions', label: '' },
              ]}
              rows={visible.map((a) => ({
                cells: {
                  company: a.company,
                  role: a.role,
                  status: a.status,
                  interviewDate: a.interviewDate,
                  actions: (
                    <>
                      <Button kind="ghost" ariaLabel={`Edit ${a.company}`} onClick={() => startEdit(a)}>Edit</Button>
                      <Button kind="ghost" ariaLabel={`Delete ${a.company}`} onClick={() => onDelete(a.id)}>Delete</Button>
                    </>
                  ),
                },
              }))}
              empty="No matching applications"
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
