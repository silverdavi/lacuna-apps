// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { openFile, saveJSON } from '@lacuna/file-save-open'
import { fuzzySearch } from '@lacuna/fuzzy-search'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  PrimaryButton,
  Rail,
  Row,
  Tag,
  TextInput,
} from '@lacuna/ui'
import * as vault from './host'
import type { VaultDocument } from './host/mock'

function formatSize(size: number): string {
  if (size === 0) return '0 B'
  if (size < 100) return `${Math.max(1, Math.ceil(size / 1000))} KB`
  if (size < 1000) return `${size} B`
  const kb = size / 1000
  const rounded = Math.round(kb * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text} KB`
}

interface BackupFile {
  version: number
  documents: Array<{ name: string; size: number; content: string }>
}

function browse(onFile: (file: File) => void, accept?: string) {
  const input = document.createElement('input')
  input.type = 'file'
  if (accept) input.accept = accept
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) onFile(file)
  })
  input.click()
}

export function App() {
  const [docs, setDocs] = useState<VaultDocument[]>(() => vault.listDocuments())
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [viewing, setViewing] = useState<VaultDocument | null>(null)

  const matches = useMemo(
    () =>
      query.trim()
        ? fuzzySearch(docs as unknown as Array<Record<string, unknown>>, query, {
            fields: ['name'],
            maxResults: 100,
          })
            .map((m) => docs[m.index])
            .filter((d): d is VaultDocument => d !== undefined)
        : docs,
    [docs, query],
  )

  async function pickDocument(file: File) {
    const result = await openFile(file, 'text')
    if (!result.ok) return setError(`Could not read ${file.name}: ${result.error}`)
    const content = typeof result.data === 'string' ? result.data : String(result.data)
    setDocs([...docs, vault.addDocument(file.name, file.size, content)])
    setError(null)
    setLastEvent(`Added ${file.name} (${formatSize(file.size)})`)
  }

  function exportBackup() {
    const backup: BackupFile = {
      version: 1,
      documents: docs.map(({ name, size, content }) => ({ name, size, content })),
    }
    saveJSON(backup, { filename: 'document-vault-backup.json', mimeType: 'application/json' })
    setLastEvent('Backup exported')
  }

  async function importBackup(file: File) {
    const result = await openFile(file, 'json')
    if (!result.ok) return setError(`Could not read backup: ${result.error}`)
    const parsed = result.data as Partial<BackupFile>
    if (parsed?.version !== 1 || !Array.isArray(parsed.documents)) {
      return setError('Not a Document Vault backup')
    }
    const records = parsed.documents.map((d) => vault.addDocument(d.name, d.size, d.content))
    setDocs([...docs, ...records])
    setError(null)
    setLastEvent(`Imported ${records.length} document${records.length === 1 ? '' : 's'}`)
  }

  const addAction = () => browse((file) => void pickDocument(file))

  const totalBytes = docs.reduce((n, d) => n + d.size, 0)
  const status = error
    ? `Error: ${error}`
    : viewing
      ? `Viewing ${viewing.name}`
      : lastEvent
        ? lastEvent
        : query.trim()
          ? `Searching: ${matches.length} match${matches.length === 1 ? '' : 'es'}`
          : docs.length
            ? `Vault ready: ${docs.length} document${docs.length === 1 ? '' : 's'}`
            : 'Ready: vault is empty'

  return (
    <AppShell
      name="Document Vault"
      icon="docs"
      hue="brown"
      category="Productivity"
      meta={`${docs.length} ${docs.length === 1 ? 'document' : 'documents'}`}
      status={status}
      side={
        <Rail
          title="Vault"
          note={`${formatSize(totalBytes)} total`}
          chips={[
            `${docs.length} stored`,
            `${matches.length} shown`,
            docs.length ? 'Backup ready' : 'Empty vault',
          ]}
        >
          <KpiRow>
            <Kpi value={`${docs.length}`} label="Documents" />
            <Kpi value={formatSize(totalBytes)} label="On disk" />
          </KpiRow>
        </Rail>
      }
    >
      <Card mono="New" title="Add a document">
        <Actions>
          <PrimaryButton onClick={addAction}>Add document</PrimaryButton>
        </Actions>
      </Card>
      <Card mono="Find" title="Search">
        <TextInput label="Search documents" value={query} onChange={setQuery} placeholder="Search by name" />
        {query.trim() ? <MonoLabel>{matches.length} match{matches.length === 1 ? '' : 'es'}</MonoLabel> : null}
      </Card>
      <Card mono={`${matches.length} shown`} title="Documents">
        {matches.length === 0 ? (
          docs.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No documents yet"
              detail="Add the first one above."
              actionLabel="Add a document"
              onAction={addAction}
            />
          ) : (
            <EmptyState
              mono="No match"
              title="No matches"
              detail={`Nothing matches ${query}.`}
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          )
        ) : (
          <List label="Documents">
            {matches.map((doc) => (
              <Row
                key={doc.id}
                title={doc.name}
                meta={
                  <span>
                    <Tag>{formatSize(doc.size)}</Tag>
                  </span>
                }
                hot={viewing?.id === doc.id}
                action={
                  <Actions>
                    <Button kind="secondary" onClick={() => setViewing(doc)}>
                      View {doc.name}
                    </Button>
                    <Button
                      kind="danger"
                      onClick={() => {
                        vault.removeDocument(doc.id)
                        setDocs(docs.filter((d) => d.id !== doc.id))
                        setLastEvent(`Deleted ${doc.name}`)
                      }}
                    >
                      Delete {doc.name}
                    </Button>
                  </Actions>
                }
              />
            ))}
          </List>
        )}
      </Card>
      <Card mono="Backup" title="Import and export">
        <Actions>
          <Button kind="secondary" onClick={() => browse((file) => void importBackup(file), 'application/json')}>
            Import backup
          </Button>
          <Button kind="secondary" onClick={exportBackup}>
            Export backup
          </Button>
        </Actions>
      </Card>
      {viewing ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewing.name}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--dim-veil)',
            zIndex: 40,
          }}
          onClick={() => setViewing(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setViewing(null)
          }}
        >
          <div
            style={{
              background: 'var(--ui-card)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(6px * var(--sf))',
              padding: 'calc(18px * var(--sf))',
              maxWidth: 'min(calc(560px * var(--sf)), 90vw)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MonoLabel>{formatSize(viewing.size)}</MonoLabel>
            <h2 style={{ fontFamily: 'var(--serif)', margin: 'calc(4px * var(--sf)) 0 calc(12px * var(--sf))' }}>
              {viewing.name}
            </h2>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--mono)',
                color: 'var(--ink)',
              }}
            >
              {viewing.content}
            </pre>
            <Actions>
              <Button kind="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
            </Actions>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
