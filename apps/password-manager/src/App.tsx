// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
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

function NamedInput({ ariaLabel, label, value, onChange, placeholder }: {
  ariaLabel: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.setAttribute('aria-label', ariaLabel)
  }, [ariaLabel])
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <input
        ref={inputRef}
        className="lc-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
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

const DOTS = '•'.repeat(10)

export function App() {
  const [records, setRecords] = useState<PasswordRecord[]>(() => passwordStore.list())
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [entryType, setEntryType] = useState('website')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const refresh = () => setRecords(passwordStore.list())

  const openNew = () => {
    setEditingId(null)
    setName('')
    setUsername('')
    setPassword(generateWebsite())
    setEntryType('website')
    setFormOpen(true)
  }

  const openEdit = (record: PasswordRecord) => {
    setEditingId(record.id)
    setName(record.name)
    setUsername(record.username)
    setPassword(record.password)
    setEntryType('website')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setName('')
    setUsername('')
    setPassword('')
    setEntryType('website')
  }

  const handleGenerate = () => {
    setPassword(entryType === 'passphrase' ? generatePassphraseValue() : generateWebsite())
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
      status={copied ? 'Copied to clipboard' : undefined}
    >
      <Card mono="Find" title="Search">
        <TextInput label="Search" value={query} onChange={setQuery} type="search" placeholder="Account, user" />
      </Card>

      {formOpen ? (
        <Card mono={editingId ? 'Edit entry' : 'New entry'} title="Entry">
          <FormGrid>
            <NamedInput ariaLabel="Name" label="Name" value={name} onChange={setName} placeholder="e.g. GitHub" />
            <NamedInput ariaLabel="User" label="Username" value={username} onChange={setUsername} placeholder="you@example.com" />
            <NamedInput ariaLabel="Password" label="Password" value={password} onChange={setPassword} placeholder="Generated for you" />
            <Select
              label="Type"
              value={entryType}
              onChange={setEntryType}
              options={[
                { value: 'website', label: 'Standard' },
                { value: 'passphrase', label: 'Passphrase' },
              ]}
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
            <Button kind="secondary" onClick={handleGenerate}>Generate</Button>
            <Button kind="ghost" onClick={closeForm}>Cancel</Button>
            {password ? <Tag>{password.length} chars · ~{Math.round(entropy(password))} bits</Tag> : null}
          </div>
        </Card>
      ) : null}

      {records.length === 0 ? (
        <Card mono="Store" title="Entries">
          <EmptyState
            title="No entries yet"
            detail="Generate a strong password and store the login before you need it."
            actionLabel="New entry"
            onAction={openNew}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card mono="Store" title="Entries">
          <EmptyState
            title="No entries match"
            detail="Try a different account name or user."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        </Card>
      ) : (
        <Card mono={`${filtered.length} shown`} title="Entries">
          <List label="Stored passwords">
            {filtered.map((r) => {
              const isRevealed = Boolean(revealed[r.id])
              return (
                <Row
                  key={r.id}
                  title={r.name}
                  meta={r.username || null}
                  value={
                    <input
                      className="lc-input"
                      type="text"
                      readOnly
                      aria-label="Password"
                      value={isRevealed ? r.password : DOTS}
                      style={{ width: '100%', maxWidth: '12em' }}
                    />
                  }
                  action={
                    <>
                      <Button kind="secondary" onClick={() => openEdit(r)}>Edit</Button>
                      <Button kind="secondary" onClick={() => setRevealed((m) => ({ ...m, [r.id]: !m[r.id] }))}>
                        {isRevealed ? 'Hide' : 'Reveal'}
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
        </Card>
      )}
    </AppShell>
  )
}

function entropy(value: string): number {
  let pool = 0
  if (/[a-z]/.test(value)) pool += 26
  if (/[A-Z]/.test(value)) pool += 26
  if (/[0-9]/.test(value)) pool += 10
  if (/[^A-Za-z0-9]/.test(value)) pool += 33
  if (pool === 0) return 0
  return value.length * Math.log2(pool)
}
