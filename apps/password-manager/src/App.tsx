// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { generatePassword, generatePassphrase } from '@lacuna/password-generate'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Select,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { passwordStore, type PasswordRecord } from './host/mock'

function now(): string {
  return new Date().toISOString()
}

function generateWebsite(): string {
  return generatePassword(12, { upper: true, lower: true, digits: true, symbols: true, excludeAmbiguous: false }).value
}

function generatePassphraseValue(): string {
  return generatePassphrase({ wordCount: 4, separator: '-', capitalize: false, appendNumber: false }).value
}

const DOTS = '••••••••••'

export function App() {
  const [records, setRecords] = useState<PasswordRecord[]>(() => passwordStore.list())
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [entryType, setEntryType] = useState('Standard')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const refresh = () => setRecords(passwordStore.list())

  const openNew = () => {
    setEditingId(null)
    setName('')
    setUsername('')
    setPassword(generateWebsite())
    setEntryType('Standard')
    setFormOpen(true)
  }

  const openEdit = (record: PasswordRecord) => {
    setEditingId(record.id)
    setName(record.name)
    setUsername(record.username)
    setPassword(record.password)
    setEntryType('Standard')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setName('')
    setUsername('')
    setPassword('')
    setEntryType('Standard')
  }

  const handleGenerate = () => {
    setPassword(entryType === 'Passphrase' ? generatePassphraseValue() : generateWebsite())
  }

  const handleSave = () => {
    const trimmedName = name.trim()
    if (!trimmedName || !password) return
    const trimmedUsername = username.trim()
    if (editingId) {
      passwordStore.update(editingId, { name: trimmedName, username: trimmedUsername, password, updatedAt: now() })
    } else {
      passwordStore.add({ name: trimmedName, username: trimmedUsername, password, createdAt: now(), updatedAt: now() })
    }
    closeForm()
    refresh()
  }

  const handleDelete = (id: string) => {
    passwordStore.delete(id)
    refresh()
  }

  const handleRegenerate = (id: string) => {
    passwordStore.update(id, { password: generateWebsite(), updatedAt: now() })
    refresh()
  }

  const handleCopy = (value: string) => {
    void copy(value)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) => r.name.toLowerCase().includes(q) || r.username.toLowerCase().includes(q))
  }, [records, query])

  return (
    <AppShell
      name="Password Manager"
      icon="vault"
      category="Tools"
      hue="blue"
      meta={`${records.length} stored`}
      status={copied ? 'Copied to clipboard' : undefined}
    >
      <Card mono="Find" title="Search">
        <TextInput label="Search" value={query} onChange={setQuery} type="search" placeholder="Account, user" />
      </Card>

      <Card
        mono="Store"
        title="Entries"
        actions={records.length > 0 ? <Button kind="secondary" onClick={openNew}>New entry</Button> : null}
      >
        {records.length === 0 ? (
          <EmptyState
            title="No entries yet"
            detail="Generate a strong password and store the login before you need it."
            actionLabel="New entry"
            onAction={openNew}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No entries match"
            detail="Try a different account name or user."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        ) : (
          <List label="Stored entries">
            {filtered.map((r) => {
              const isRevealed = Boolean(revealed[r.id])
              return (
                <Row
                  key={r.id}
                  title={r.name}
                  meta={r.username || null}
                    value={
                      <>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>
                          {isRevealed ? r.password : DOTS}
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={isRevealed ? r.password : DOTS}
                          aria-label={`Secret for ${r.name}`}
                          style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
                        />
                      </>
                    }
                  action={
                    <>
                      <Button kind="secondary" onClick={() => setRevealed((m) => ({ ...m, [r.id]: !m[r.id] }))}>
                        Reveal
                      </Button>
                      <Button kind="secondary" onClick={() => handleRegenerate(r.id)}>Generate</Button>
                      <Button kind="secondary" onClick={() => handleCopy(r.password)}>Copy</Button>
                      <Button kind="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
                    </>
                  }
                />
              )
            })}
          </List>
        )}
      </Card>

      {formOpen ? (
        <Card mono={editingId ? 'Edit entry' : 'New entry'} title="Entry">
          <FormGrid>
            <TextInput label="Name" value={name} onChange={setName} placeholder="e.g. GitHub" />
            {name.trim() ? <TextInput label="Username" value={username} onChange={setUsername} placeholder="you@example.com" /> : null}
            <TextInput label="Password" value={password} onChange={setPassword} placeholder="Generated for you" />
            <Select
              label="Type"
              value={entryType}
              onChange={setEntryType}
              options={[
                { value: 'Standard', label: 'Standard' },
                { value: 'Passphrase', label: 'Passphrase' },
              ]}
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
            <Button kind="secondary" onClick={handleGenerate}>Generate</Button>
            <Button kind="ghost" onClick={closeForm}>Cancel</Button>
            {password ? <Tag>{password.length} chars</Tag> : null}
          </div>
        </Card>
      ) : null}
    </AppShell>
  )
}
