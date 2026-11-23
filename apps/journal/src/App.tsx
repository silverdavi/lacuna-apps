import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { AppShell, Button, Card, Cols, Spread, TextInput } from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { decrypt, encrypt, verifyPassphrase, type EncryptedPayload } from '@lacuna/passphrase-crypto'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { entryStore } from './host'

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

export function App() {
  const [boot] = useState(readDocument)
  const [entry, setEntry] = useState(boot.entry)
  const [locked, setLocked] = useState(boot.locked)
  const [dialog, setDialog] = useState<'none' | 'lock' | 'unlock'>('none')
  const [passphrase, setPassphrase] = useState('')
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  function openImport() {
    setImportError(null)
    setImportOpen(true)
    importInputRef.current?.click()
  }

  const previewHtml = useMemo(
    () => markdownToHtml(locked ? '' : entry, { taskLists: true, tables: true }),
    [entry, locked],
  )
  const previewRef = useRef<HTMLDivElement | null>(null)

  function save() {
    if (locked) return
    entryStore.set({ plaintext: entry, encrypted: null })
  }

  function onEditorChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setEntry(e.target.value)
    entryStore.set({ plaintext: e.target.value, encrypted: null })
  }

  function onEditorKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      save()
    }
  }

  const toggleRef = useRef<(checked: boolean) => void>(() => {})

  function onTaskToggle(checked: boolean) {
    if (locked) return
    const lines = entry.split('\n')
    let idx = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*[-*+]\s+\[[ xX]\]/.test(lines[i] ?? '')) {
        idx = i
        break
      }
    }
    if (idx < 0) return
    lines[idx] = checked
      ? (lines[idx] ?? '').replace(/\[[ xX]\]/, '[x]')
      : (lines[idx] ?? '').replace(/\[[xX]\]/, '[ ]')
    const next = lines.join('\n')
    setEntry(next)
    entryStore.set({ plaintext: next, encrypted: null })
  }
  toggleRef.current = onTaskToggle

  useEffect(() => {
    const root = previewRef.current
    if (!root) return
    root.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const el = input as HTMLInputElement
      if (el.dataset.jwl === '1') return
      el.dataset.jwl = '1'
      el.disabled = false
      el.addEventListener('change', (ev) => toggleRef.current((ev.target as HTMLInputElement).checked))
    })
  })

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
      if (entry === '') {
        entryStore.set({ plaintext: null, encrypted: null, lockMarker: 'locked' })
      } else {
        const payload: EncryptedPayload = await encrypt(entry, passphrase)
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
      const ok = await verifyPassphrase({ salt: doc.lockMarker, iv: '', ciphertext: '', iterations: 0 } as unknown as EncryptedPayload, passphrase)
      if (!ok) {
        setDialogError('Invalid passphrase')
        return
      }
      setEntry('')
      setLocked(false)
      entryStore.set({ plaintext: '', encrypted: null, lockMarker: null })
      closeDialog()
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
        setImportOpen(false)
      } catch {
        setImportError('Could not read this backup.')
        setImportOpen(false)
      }
    })
  }

  return (
    <AppShell
      name="Daily Journal App"
      icon="docs"
      hue="teal"
      category="personal"
      status={locked ? 'Encrypted' : 'Saved'}
    >
      <Card>
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
            </label>
          </div>
          <div>
            <span className="lc-field-label">Preview</span>
            <div
              ref={previewRef}
              className="lc-markdown-view"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </Cols>
        <Spread>
          <Button kind="secondary" onClick={locked ? openUnlock : openLock}>
            {locked ? 'Unlock entry' : 'Lock entry'}
          </Button>
          <Button kind="secondary" onClick={doExport}>
            Export backup
          </Button>
          <Button kind="secondary" onClick={openImport}>
            Import backup
          </Button>
        </Spread>
        <input type="file" accept="application/json" onChange={onImportFile} ref={importInputRef} hidden />
      </Card>
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
      {importOpen && importError ? <p className="lk-field-error">{importError}</p> : null}
    </AppShell>
  )
}
