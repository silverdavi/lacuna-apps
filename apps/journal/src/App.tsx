import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  Cols,
  EmptyState,
  ErrorState,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Spread,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { MarkdownView } from '@lacuna/markdown-view'
import { decrypt, encrypt, type EncryptedPayload } from '@lacuna/passphrase-crypto'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { entryStore, historyStore } from './host'

interface BackupData {
  entry: string
  locked: boolean
}

const APP_ID = 'lacuna.journal'

function readDocument(): { entry: string; locked: boolean } {
  const doc = entryStore.get()
  if (doc.encrypted !== null) return { entry: '', locked: true }
  return { entry: doc.plaintext ?? '', locked: false }
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function App() {
  const [boot] = useState(readDocument)
  const [entry, setEntry] = useState(boot.entry)
  const [locked, setLocked] = useState(boot.locked)
  const [dialog, setDialog] = useState<'none' | 'lock' | 'unlock'>('none')
  const [passphrase, setPassphrase] = useState('')
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [history, setHistory] = useState(() => historyStore.list())
  const importInputRef = useRef<HTMLInputElement | null>(null)

  function openImport() {
    setImportError(null)
    importInputRef.current?.click()
  }

  const wordCount = useMemo(() => {
    if (locked || entry.trim() === '') return 0
    return entry.trim().split(/\s+/).length
  }, [entry, locked])

  const taskCount = useMemo(() => {
    if (locked) return { total: 0, done: 0 }
    const matches = entry.match(/^\s*[-*+]\s+\[[ xX]\]/gm) ?? []
    const done = matches.filter((m) => /\[[xX]\]/.test(m)).length
    return { total: matches.length, done }
  }, [entry, locked])

  function refreshHistory() {
    setHistory(historyStore.list())
  }

  function onEditorChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setEntry(e.target.value)
    entryStore.set({ plaintext: e.target.value, encrypted: null })
  }

  function onEditorKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      entryStore.set({ plaintext: entry, encrypted: null })
    }
  }

  function onTaskToggle(index: number, checked: boolean) {
    if (locked) return
    const lines = entry.split('\n')
    let seen = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*[-*+]\s+\[[ xX]\]/.test(lines[i] ?? '')) {
        seen += 1
        if (seen === index) {
          lines[i] = checked
            ? (lines[i] ?? '').replace(/\[[ xX]\]/, '[x]')
            : (lines[i] ?? '').replace(/\[[xX]\]/, '[ ]')
          const next = lines.join('\n')
          setEntry(next)
          entryStore.set({ plaintext: next, encrypted: null })
          return
        }
      }
    }
  }

  function openLock() {
    setPassphrase('')
    setDialogError(null)
    setDialog('lock')
  }

  function openUnlock() {
    setPassphrase('')
    setDialogError(null)
    setDialog('unlock')
  }

  function closeDialog() {
    setDialog('none')
    setPassphrase('')
    setDialogError(null)
  }

  async function doEncrypt() {
    if (passphrase.trim() === '') {
      setDialogError('Enter a passphrase.')
      return
    }
    try {
      const textToStore = entry
      if (textToStore.trim() !== '') {
        const snapshot = {
          id: `snap-${Date.now()}`,
          date: todayLabel(),
          text: textToStore,
          savedAt: Date.now(),
        }
        historyStore.add(snapshot)
        refreshHistory()
      }
      if (textToStore === '') {
        const marker: EncryptedPayload = await encrypt('__lock__', passphrase)
        entryStore.set({ plaintext: null, encrypted: null, lockMarker: marker })
      } else {
        const payload: EncryptedPayload = await encrypt(textToStore, passphrase)
        entryStore.set({ plaintext: null, encrypted: payload })
      }
      setEntry('')
      setLocked(true)
      closeDialog()
    } catch {
      setDialogError('Could not encrypt the entry.')
    }
  }

  async function doDecrypt() {
    const doc = entryStore.get()
    if (doc.encrypted !== null) {
      try {
        const text = await decrypt(doc.encrypted, passphrase)
        setEntry(text)
        setLocked(false)
        entryStore.set({ plaintext: text, encrypted: null })
        closeDialog()
      } catch {
        setDialogError('Invalid passphrase')
      }
      return
    }
    if (doc.lockMarker !== undefined && doc.lockMarker !== null) {
      try {
        await decrypt(doc.lockMarker, passphrase)
        setEntry('')
        setLocked(false)
        entryStore.set({ plaintext: '', encrypted: null, lockMarker: null })
        closeDialog()
      } catch {
        setDialogError('Invalid passphrase')
      }
      return
    }
  }

  function doExport() {
    const json = exportBackup<BackupData>({
      appId: APP_ID,
      version: 1,
      filename: 'journal-backup',
      records: [{ id: 'entry', data: { entry, locked }, createdAt: 0, updatedAt: Date.now() }],
    })
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'journal-backup.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    void file.text().then((text) => {
      try {
        const result = importBackup<BackupData>(text, { currentVersion: 1 })
        const record = result.records[result.records.length - 1]
        if (record === undefined) {
          setImportError('No records in this backup.')
          return
        }
        setEntry(record.data.entry)
        setLocked(false)
        entryStore.set({ plaintext: record.data.entry, encrypted: null, lockMarker: null })
        setImportError(null)
      } catch {
        setImportError('Could not read this backup.')
      }
    })
  }

  function restoreSnapshot(text: string) {
    setEntry(text)
    setLocked(false)
    entryStore.set({ plaintext: text, encrypted: null, lockMarker: null })
  }

  const statusText = locked ? 'Encrypted' : 'Saved'

  return (
    <AppShell
      name="Daily Journal App"
      icon="docs"
      hue="teal"
      category="Personal"
      meta={todayLabel()}
      status={statusText}
      side={
        <Stack lg>
          <Rail title="Today" note="Live entry stats">
            <KpiRow>
              <Kpi value={String(wordCount)} label="Words" />
              <Kpi value={String(taskCount.total)} label="Tasks" />
              <Kpi value={String(taskCount.done)} label="Done" accent={taskCount.total > 0} />
            </KpiRow>
          </Rail>
          <Rail title="Backup" note="JSON, versioned">
            <Stack>
              <Button kind="secondary" onClick={doExport}>
                Export backup
              </Button>
              <Button kind="secondary" onClick={openImport}>
                Import backup
              </Button>
              {importError != null && <ErrorState title={importError} mono="Import" />}
            </Stack>
          </Rail>
          <Rail title="Security" note="AES-GCM, local">
            <Button kind="secondary" onClick={locked ? openUnlock : openLock}>
              {locked ? 'Unlock entry' : 'Lock entry'}
            </Button>
          </Rail>
        </Stack>
      }
    >
      <Stack lg>
        <Card mono="Editor" title="Daily Journal">
          <Cols kind="2">
            <div>
              <label className="lc-field">
                <span className="lc-field-label">Entry</span>
                <textarea
                  className="lc-input"
                  rows={10}
                  value={locked ? 'Locked' : entry}
                  readOnly={locked}
                  placeholder={locked ? undefined : 'Write your entry…'}
                  onChange={onEditorChange}
                  onKeyDown={onEditorKeyDown}
                />
                <span className="journal-field-hint">Markdown supported. Ctrl+S to save.</span>
              </label>
            </div>
            <div>
              <div className="lc-field">
                <span className="lc-field-label">Preview</span>
                {locked ? (
                  <EmptyState
                    mono="Preview"
                    title="Entry is locked"
                    detail="Unlock to view the rendered entry."
                    actionLabel="Unlock to view"
                    onAction={() => setDialog('unlock')}
                  />
                ) : entry.trim() === '' ? (
                  <EmptyState
                    mono="Preview"
                    title="Nothing to preview"
                    detail="Start writing to see markdown render here."
                    actionLabel="Write your entry"
                  />
                ) : (
                  <MarkdownView
                    source={entry}
                    label="Preview"
                    className="journal-preview"
                    onTaskToggle={(index, checked) => onTaskToggle(index, checked)}
                  />
                )}
              </div>
            </div>
          </Cols>
        </Card>

        <Card mono="History" title="Previous Entries">
          {history.length === 0 ? (
            <EmptyState
              mono="History"
              title="No previous entries"
              detail="Entries are snapshotted when you lock the journal. They will appear here."
              actionLabel="Lock to snapshot"
              onAction={() => setDialog('lock')}
            />
          ) : (
            <List label="Previous entries">
              {history.map((snap) => (
                <Row
                  key={snap.id}
                  title={snap.date}
                  meta={new Date(snap.savedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  value={`${snap.text.trim().split(/\s+/).length} words`}
                  hot={snap.id === history[0]?.id}
                  action={
                    <Button kind="ghost" onClick={() => restoreSnapshot(snap.text)} ariaLabel={`Restore ${snap.date}`}>
                      Restore
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      </Stack>

      <Dialog open={dialog !== 'none'} onClose={closeDialog} title={dialog === 'lock' ? 'Lock entry' : 'Unlock entry'}>
        <TextInput
          label="Passphrase"
          type="password"
          value={passphrase}
          onChange={(v) => {
            setPassphrase(v)
            setDialogError(null)
          }}
          error={dialogError}
        />
        <Spread>
          <Button kind="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={() => {
              if (dialog === 'lock') void doEncrypt()
              else void doDecrypt()
            }}
          >
            {dialog === 'lock' ? 'Encrypt' : 'Decrypt'}
          </Button>
        </Spread>
      </Dialog>
      <input type="file" accept="application/json" onChange={onImportFile} ref={importInputRef} hidden />
    </AppShell>
  )
}
