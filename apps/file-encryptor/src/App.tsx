import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Row,
  Select,
  Stack,
} from '@lacuna/ui'
import { decrypt, encrypt } from '@lacuna/passphrase-crypto'
import type { EncryptedPayload } from '@lacuna/passphrase-crypto'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import type { Operation, SessionState } from './host'
import { saveSession } from './host'

type Mode = 'Encrypt' | 'Decrypt'
type Message = { kind: 'success' | 'error'; text: string } | null

interface LoadedFile {
  name: string
  size: number
  text: string
}

interface TransformResult {
  text: string
  filename: string
}

const DEFAULT_STATE: SessionState = {
  defaultPassphrase: '',
  operations: [],
}

function payloadFromJSON(raw: string): EncryptedPayload {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('corrupted file')
  }
  const p = data as Record<string, unknown>
  if (
    typeof p.salt !== 'string' ||
    typeof p.iv !== 'string' ||
    typeof p.ciphertext !== 'string' ||
    typeof p.iterations !== 'number'
  ) {
    throw new Error('corrupted file')
  }
  return {
    salt: p.salt,
    iv: p.iv,
    ciphertext: p.ciphertext,
    iterations: p.iterations,
    hash: p.hash as EncryptedPayload['hash'],
  }
}

function looksLikePayload(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>
    return typeof data.salt === 'string' && typeof data.ciphertext === 'string'
  } catch {
    return false
  }
}

export function App() {
  const { value: session, set: setSession } = useLocalRecord<SessionState>({
    key: 'file-encryptor.session',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  useEffect(() => {
    saveSession(session)
  }, [session])

  const fileRef = useRef<HTMLInputElement>(null)
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [mode, setMode] = useState<Mode>('Encrypt')
  const [message, setMessage] = useState<Message>(null)
  const [result, setResult] = useState<TransformResult | null>(null)
  const clipboard = useClipboard()

  useEffect(() => {
    if (message === null) return
    const t = window.setTimeout(() => setMessage(null), 4000)
    return () => window.clearTimeout(t)
  }, [message])

  function pickFile() {
    fileRef.current?.click()
  }

  async function acceptFile(file: File) {
    setMessage(null)
    setResult(null)
    try {
      const text = await file.text()
      setLoaded({ name: file.name, size: file.size, text })
    } catch {
      setMessage({ kind: 'error', text: 'Could not read that file' })
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void acceptFile(file)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void acceptFile(file)
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function addOperation(filename: string, opMode: string) {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    const op: Operation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      filename,
      mode: opMode,
      timestamp,
    }
    setSession((prev) => ({
      ...prev,
      operations: [op, ...prev.operations].slice(0, 20),
    }))
  }

  async function transform() {
    if (!loaded) {
      setMessage({ kind: 'error', text: 'Load a file first' })
      return
    }
    const pass = passphrase.trim()
    if (pass.length === 0) {
      setMessage({ kind: 'error', text: 'Enter a passphrase' })
      return
    }
    setMessage(null)
    if (mode === 'Encrypt') {
      try {
        const payload = await encrypt(loaded.text, pass)
        const out = JSON.stringify(payload)
        const filename = `${loaded.name}.enc`
        setResult({ text: out, filename })
        setMessage({ kind: 'success', text: `Encrypted ${loaded.name}` })
        addOperation(loaded.name, 'Encrypt')
      } catch {
        setMessage({ kind: 'error', text: 'Encryption failed' })
      }
    } else {
      try {
        const payload = payloadFromJSON(loaded.text)
        const out = await decrypt(payload, pass)
        const base = loaded.name.endsWith('.enc') ? loaded.name.slice(0, -4) : loaded.name
        setResult({ text: out, filename: base })
        setMessage({ kind: 'success', text: `Decrypted ${loaded.name}` })
        addOperation(loaded.name, 'Decrypt')
      } catch {
        setMessage({ kind: 'error', text: 'Decryption failed: invalid passphrase or corrupted file' })
      }
    }
  }

  function downloadResult() {
    if (!result) return
    saveBlob(new Blob([result.text]), { filename: result.filename, mimeType: 'application/octet-stream' })
  }

  function copyResult() {
    if (!result) return
    void clipboard.copy(result.text)
  }

  function clearList() {
    setSession((prev) => ({ ...prev, operations: [] }))
  }

  function saveDefault() {
    setMessage({ kind: 'success', text: 'Default passphrase saved' })
  }

  return (
    <AppShell
      name="File Encryptor"
      icon="vault"
      hue="rust"
      category="Productivity"
      meta={loaded ? 'ready' : 'no file'}
      status={message ? message.text : 'Local · no network'}
    >
      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Stack lg>
        <Card mono="SOURCE" title="File">
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop a file or click to browse"
            onClick={pickFile}
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{
              cursor: 'pointer',
              border: 'calc(1px * var(--sf)) dashed var(--ui-line2)',
              padding: 'calc(12px * var(--sf)) calc(16px * var(--sf))',
              background: 'var(--paper-deep)',
              fontFamily: 'var(--sans)',
              fontSize: 'calc(13px * var(--tf))',
              color: 'var(--ink)',
              display: 'block',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Drop a file or click to browse
          </div>
          {loaded && (
            <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(10px * var(--sf))',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{loaded.name}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-60)' }}>
                  {loaded.size} bytes
                </span>
              </div>
              <div
                style={{
              marginTop: 'calc(10px * var(--sf))',
              padding: 'calc(10px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              background: 'var(--paper-deep)',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 'calc(200px * var(--sf))',
              overflow: 'auto',
                }}
              >
                {loaded.text}
              </div>
            </div>
          )}
        </Card>

        <Card mono="TRANSFORM" title="Passphrase and mode">
          <FormGrid>
            <label className="lc-field">
              <span className="lc-field-label">Passphrase</span>
              <input
                className="lc-input"
                type="password"
                value={passphrase}
                placeholder="Enter a passphrase"
                aria-label="Passphrase"
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </label>
            <Select
              label="Mode"
              value={mode}
              onChange={(v) => setMode(v as Mode)}
              options={[
                { value: 'Encrypt', label: 'Encrypt' },
                { value: 'Decrypt', label: 'Decrypt' },
              ]}
            />
            <div>
              <Button kind="primary" onClick={() => void transform()}>
                Transform
              </Button>
            </div>
          </FormGrid>
        </Card>

        {message && message.kind === 'error' ? (
          <div
            role="alert"
            style={{
              padding: 'calc(10px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--rust)',
              background: 'var(--paper-deep)',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              color: 'var(--ink)',
            }}
          >
            {message.text}
          </div>
        ) : null}

        {result ? (
          <Card mono="RESULT" title="Result">
            <div
              style={{
                padding: 'calc(10px * var(--sf))',
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                background: 'var(--paper-deep)',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(13px * var(--tf))',
                color: 'var(--ink)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 'calc(240px * var(--sf))',
                overflow: 'auto',
              }}
            >
              {result.text}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'calc(10px * var(--sf))',
                marginTop: 'calc(10px * var(--sf))',
                alignItems: 'center',
              }}
            >
              <Button kind="primary" onClick={downloadResult} disabled={!result}>
                Download result
              </Button>
              <Button kind="secondary" onClick={copyResult} disabled={!result}>
                Copy to clipboard
              </Button>
              {clipboard.copied ? (
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                    color: 'var(--ink-60)',
                  }}
                >
                  Copied
                </span>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card mono="RESULT" title="Result">
            <EmptyState
              mono="EMPTY"
              title="No result yet"
              detail="Load a file and run Transform."
            />
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'calc(10px * var(--sf))',
                marginTop: 'calc(10px * var(--sf))',
                alignItems: 'center',
              }}
            >
              <Button kind="primary" onClick={downloadResult} disabled>
                Download result
              </Button>
              <Button kind="secondary" onClick={copyResult} disabled>
                Copy to clipboard
              </Button>
            </div>
          </Card>
        )}

        <Card
          mono="HISTORY"
          title="Recent operations"
          actions={
            <Button kind="secondary" onClick={clearList} disabled={session.operations.length === 0}>
              Clear list
            </Button>
          }
        >
          {session.operations.length === 0 ? (
            <EmptyState
              mono="EMPTY"
              title="No operations yet"
              detail="Encrypted and decrypted files will be listed here."
            />
          ) : (
            <List label="Recent operations">
              {session.operations.map((op) => (
                <Row
                  key={op.id}
                  title={op.filename}
                  meta={op.mode}
                  value={op.timestamp}
                />
              ))}
            </List>
          )}
        </Card>

        <Card mono="DEFAULTS" title="Default passphrase">
          <FormGrid>
            <label className="lc-field">
              <span className="lc-field-label">Default passphrase</span>
              <input
                className="lc-input"
                type="text"
                value={session.defaultPassphrase}
                placeholder="Saved and pre-filled on load"
                aria-label="Default passphrase"
                onChange={(event) => setSession((prev) => ({ ...prev, defaultPassphrase: event.target.value }))}
              />
            </label>
            <div>
              <Button kind="secondary" onClick={saveDefault}>
                Save default
              </Button>
            </div>
          </FormGrid>
        </Card>
      </Stack>
    </AppShell>
  )
}
