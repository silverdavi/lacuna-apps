import { useState, useId } from 'react'
import { useCollection } from '@lacuna/use-collection'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'

function LabeledSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  const id = useId()
  return (
    <div className="lc-field">
      <label htmlFor={id} className="lc-field-label">{label}</label>
      <select id={id} className="lc-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

type Customer = {
  name: string
  email: string
  company: string
  status: string
}

type Interaction = {
  customerId: string
  date: string
  type: string
  notes: string
}

const STATUSES = ['Lead', 'Customer', 'Prospect', 'Churned']
const INTERACTION_TYPES = ['Call', 'Email', 'Meeting', 'Note']

export function App() {
  const { state: custState, actions: custActions } = useCollection<Customer>({ storageKey: 'crm-lite-customers' })
  const { state: interState, actions: interActions } = useCollection<Interaction>({ storageKey: 'crm-lite-interactions' })

  const [tab, setTab] = useState('Customers')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [fName, setFName] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fCompany, setFCompany] = useState('')
  const [fStatus, setFStatus] = useState('Customer')
  const [fError, setFError] = useState<string | null>(null)

  const [interFor, setInterFor] = useState<string | null>(null)
  const [iType, setIType] = useState('Call')
  const [iNotes, setINotes] = useState('')

  const customers = custState.activeItems
  const interactions = interState.activeItems

  const openAdd = () => {
    setEditId(null)
    setFName('')
    setFEmail('')
    setFCompany('')
    setFStatus('Customer')
    setFError(null)
    setFormOpen(true)
  }

  const openEdit = (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return
    setEditId(id)
    setFName(c.data.name)
    setFEmail(c.data.email)
    setFCompany(c.data.company)
    setFStatus(c.data.status)
    setFError(null)
    setFormOpen(true)
  }

  const saveCustomer = () => {
    const n = fName.trim()
    if (n === '') {
      setFError('Enter a name')
      return
    }
    const data: Customer = { name: n, email: fEmail.trim(), company: fCompany.trim(), status: fStatus }
    if (editId) {
      custActions.update(editId, data)
    } else {
      custActions.add(data)
    }
    setFormOpen(false)
    setEditId(null)
  }

  const deleteCustomer = (id: string) => {
    custActions.remove(id)
    for (const i of interactions) {
      if (i.data.customerId === id) interActions.remove(i.id)
    }
  }

  const openInteraction = (id: string) => {
    setInterFor(id)
    setIType('Call')
    setINotes('')
  }

  const saveInteraction = () => {
    if (!interFor) return
    const cust = customers.find((c) => c.id === interFor)
    if (!cust) return
    interActions.add({
      customerId: interFor,
      date: new Date().toISOString().slice(0, 10),
      type: iType,
      notes: iNotes.trim(),
    })
    setInterFor(null)
    setINotes('')
  }

  const q = search.trim().toLowerCase()
  const visible = customers.filter((c) => {
    const matchesSearch = q === '' || c.data.name.toLowerCase().includes(q) || c.data.email.toLowerCase().includes(q) || c.data.company.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || c.data.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const customerName = (id: string) => customers.find((c) => c.id === id)?.data.name ?? 'Unknown'

  const interRows = interactions.map((i) => ({
    cells: {
      date: i.data.date,
      customer: customerName(i.data.customerId),
      type: i.data.type,
      notes: i.data.notes,
    },
  }))

  return (
    <AppShell
      name="Simple CRM"
      icon="crm"
      hue="gold"
      category="Business"
      meta={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}
      status="Stored on this device"
    >
      <div role="tablist" className="lc-tabs">
        <button type="button" role="tab" aria-selected={tab === 'Customers'} className={`lc-tab${tab === 'Customers' ? ' active' : ''}`} style={tab === 'Customers' ? undefined : { color: 'var(--ink-60)' }} onClick={() => setTab('Customers')}>
          Customers
        </button>
        <button type="button" role="tab" aria-selected={tab === 'Interactions'} className={`lc-tab${tab === 'Interactions' ? ' active' : ''}`} style={tab === 'Interactions' ? undefined : { color: 'var(--ink-60)' }} onClick={() => setTab('Interactions')}>
          Interactions
        </button>
      </div>

      {tab === 'Customers' ? (
        <Stack>
          <Card mono={formOpen ? 'Customer' : 'New'} title={formOpen ? (editId ? 'Edit customer' : 'Add customer') : 'Add a customer'}>
            {formOpen ? (
              <>
                <FormGrid>
                  <TextInput label="Name" value={fName} onChange={(v) => { setFName(v); if (fError) setFError(null) }} error={fError} placeholder="Full name" />
                  <TextInput label="Email" value={fEmail} onChange={setFEmail} type="email" placeholder="name@example.com" />
                  <TextInput label="Company" value={fCompany} onChange={setFCompany} placeholder="Company name" />
                  <LabeledSelect label="Status" value={fStatus} onChange={setFStatus} options={STATUSES} />
                </FormGrid>
                <div className="lk-actions">
                  <Button kind="primary" ariaLabel="Save" onClick={saveCustomer}>Save</Button>
                  <Button kind="ghost" ariaLabel="Cancel" onClick={() => { setFormOpen(false); setEditId(null) }}>Cancel</Button>
                </div>
              </>
            ) : (
              <div className="lk-actions">
                <Button kind="primary" ariaLabel="Add customer" onClick={openAdd}>Add customer</Button>
              </div>
            )}
          </Card>

          <Card mono={`${visible.length} shown`} title="Customers">
            <FormGrid>
              <TextInput label="Search customers" value={search} onChange={setSearch} type="search" placeholder="Name, email, or company" />
              <LabeledSelect label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={['All', ...STATUSES]} />
            </FormGrid>
            {visible.length === 0 ? (
              customers.length === 0 ? (
                <EmptyState mono="Empty" title="No customers yet" detail="Use the button above to add your first customer." actionLabel="Add first customer" onAction={() => openAdd()} />
              ) : (
                <EmptyState mono="No match" title="No customers match" detail="Try a different search or status filter." actionLabel="Clear filters" onAction={() => { setSearch(''); setStatusFilter('All') }} />
              )
            ) : (
              <div role="list" aria-label="Customers">
                {visible.map((c) => {
                  const custInteractions = interactions.filter((i) => i.data.customerId === c.id)
                  return (
                    <div key={c.id} role="listitem" aria-label={c.data.name} className="lk-row">
                      <div role="row" aria-label={`${c.data.name}, ${c.data.company}, ${c.data.status}`} className="lk-row-inner">
                        <span className="lk-row-title">{c.data.name}</span>
                        <span className="lk-row-meta">{c.data.company} · {c.data.email}</span>
                        {custInteractions.map((i) => (
                          <span key={i.id} className="lk-row-meta">{i.data.type}: {i.data.notes}</span>
                        ))}
                        <span className="lk-row-value">{c.data.status}</span>
                        <Stack style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                          <Button kind="ghost" ariaLabel="Log interaction" onClick={() => openInteraction(c.id)}>Log interaction</Button>
                          <Button kind="ghost" ariaLabel="Edit" onClick={() => openEdit(c.id)}>Edit</Button>
                          <Button kind="ghost" ariaLabel="Delete" onClick={() => deleteCustomer(c.id)}>Delete</Button>
                        </Stack>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {interFor !== null && (
            <Card mono="Log" title="Log interaction">
              <FormGrid>
                <LabeledSelect label="Type" value={iType} onChange={setIType} options={INTERACTION_TYPES} />
                <TextInput label="Notes" value={iNotes} onChange={setINotes} placeholder="What was discussed?" />
              </FormGrid>
              <div className="lk-actions">
                <Button kind="primary" ariaLabel="Save" onClick={saveInteraction}>Save</Button>
                <Button kind="ghost" ariaLabel="Cancel" onClick={() => setInterFor(null)}>Cancel</Button>
              </div>
            </Card>
          )}
        </Stack>
      ) : (
        <Card mono={`${interactions.length} logged`} title="Interactions">
          {interactions.length === 0 ? (
            <EmptyState mono="Empty" title="No interactions yet" detail="Log one from a customer row." actionLabel="Go to Customers" onAction={() => setTab('customers')} />
          ) : (
            <Table
              label="Interactions"
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'customer', label: 'Customer' },
                { key: 'type', label: 'Type' },
                { key: 'notes', label: 'Notes' },
              ]}
              rows={interRows}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
