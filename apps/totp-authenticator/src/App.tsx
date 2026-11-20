import { useCallback, useEffect, useRef, useState } from 'react'
import { Body, Button, Card, EmptyState, MonoLabel, Stack, TextInput } from '@lacuna/ui'
import {
  addAccount,
  deleteAccount,
  isValidBase32,
  listAccounts,
  nextLabel,
  parseOtpauth,
  remaining,
  totp,
  type Account,
} from './host'

interface Row {
  account: Account
  code: string
}

export function App() {
  const [accounts, setAccounts] = useState<Account[]>(() => listAccounts())
  const [rows, setRows] = useState<Record<string, string>>({})
  const [secretInput, setSecretInput] = useState('')
  const [uriInput, setUriInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const toastTimer = useRef<number | undefined>(undefined)

  const refresh = useCallback(() => setAccounts(listAccounts()), [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (accounts.length === 0) {
      setRows({})
      return
    }
    let cancelled = false
    void (async () => {
      for (const account of accounts) {
        const code = await totp(account.secret, now)
        if (!cancelled) setRows((prev) => ({ ...prev, [account.id]: code }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accounts, now])

  useEffect(() => {
    if (!toast) return
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(toastTimer.current)
  }, [toast])

  const handleSecretChange = (value: string) => setSecretInput(value.toUpperCase().replace(/\s/g, ''))

  const handleAdd = () => {
    const secret = secretInput.trim()
    if (secret) {
      if (!isValidBase32(secret)) {
        setToast('Invalid base32 secret')
        return
      }
      const label = nextLabel('Account', accounts)
      addAccount(label, secret)
      refresh()
      setSecretInput('')
      return
    }
    const uri = uriInput.trim()
    if (!uri) return
    const parsed = parseOtpauth(uri)
    if (!parsed || !isValidBase32(parsed.secret)) {
      setToast('Invalid base32 secret')
      return
    }
    const label = nextLabel(parsed.label, accounts)
    addAccount(label, parsed.secret)
    refresh()
    setUriInput('')
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setToast('Code copied')
    } catch {
      setToast('Copy failed')
    }
  }

  const handleDelete = (account: Account) => {
    deleteAccount(account.id)
    refresh()
  }

  const listItems = accounts.map((account) => (
    <li key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--sf))' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MonoLabel>{account.label}</MonoLabel>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 'calc(22px * var(--tf))',
            letterSpacing: '0.2em',
            color: 'var(--ink)',
          }}
        >
          {rows[account.id] ?? '······'}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--faint, var(--ink))', opacity: 0.6 }}>
          {account.secret}
        </div>
      </div>
      <MonoLabel faint>{remaining(now)}s</MonoLabel>
      <Button onClick={() => void handleCopy(rows[account.id] ?? '')}>Copy code</Button>
      <Button onClick={() => handleDelete(account)}>Delete {account.label}</Button>
    </li>
  ))

  return (
    <main style={{ padding: 'calc(16px * var(--sf))', display: 'grid', gap: 'calc(16px * var(--sf))' }}>
      <h1 style={{ fontFamily: 'var(--serif)', margin: 0 }}>TOTP Authenticator</h1>
      <Card mono="Accounts" title={`Current codes${accounts.length ? ` (${accounts.length})` : ''}`}>
        <Stack>
          {accounts.length === 0 ? (
            <EmptyState title="No accounts yet" detail="Add a base32 secret or an otpauth URI below." />
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              {listItems}
            </ul>
          )}
          <TextInput label="Base32 Secret" value={secretInput} onChange={handleSecretChange} />
          <TextInput label="otpauth URI" value={uriInput} onChange={setUriInput} />
          <Button kind="primary" onClick={handleAdd}>
            Add account
          </Button>
        </Stack>
      </Card>
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(16px * var(--sf))',
            left: 'calc(16px * var(--sf))',
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: 'calc(1px * var(--sf)) solid var(--ink)',
            boxShadow: 'var(--shadow)',
            padding: 'calc(8px * var(--sf))',
          }}
        >
          <Body sm>{toast}</Body>
        </div>
      )}
    </main>
  )
}
