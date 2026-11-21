import { useCallback, useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, Rail, Row, TextInput } from '@lacuna/ui'
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

  return (
    <AppShell
      name="TOTP Authenticator"
      icon="security"
      hue="green"
      category="Productivity"
      meta={`${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}
      status="Saved on this device"
      side={<Rail title="TOTP Authenticator" note="Codes refresh every second" chips={['Local only', 'Works offline']} />}
    >
      <Card mono="Current codes" title={`Accounts${accounts.length ? ` (${accounts.length})` : ''}`}>
        {accounts.length === 0 ? (
          <EmptyState mono="Empty" title="No accounts yet" detail="Add a base32 secret or an otpauth URI below." />
        ) : (
          <List label="Accounts">
            {accounts.map((account) => (
              <Row
                key={account.id}
                title={account.label}
                meta={account.secret}
                value={`${rows[account.id] ?? '······'} · ${remaining(now)}s`}
                action={
                  <span>
                    <Button kind="ghost" onClick={() => void handleCopy(rows[account.id] ?? '')}>
                      Copy code
                    </Button>
                    <Button kind="ghost" onClick={() => handleDelete(account)}>
                      Delete {account.label}
                    </Button>
                  </span>
                }
              />
            ))}
          </List>
        )}
      </Card>
      <Card mono="New" title="Add an account">
        <FormGrid>
          <TextInput label="Base32 Secret" value={secretInput} onChange={handleSecretChange} />
          <TextInput label="otpauth URI" value={uriInput} onChange={setUriInput} />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={handleAdd}>
            Add account
          </Button>
        </Actions>
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
            border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
            boxShadow: 'var(--shadow)',
            padding: 'calc(8px * var(--sf))',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(13px * var(--tf))',
            zIndex: 10,
          }}
        >
          {toast}
        </div>
      )}
    </AppShell>
  )
}
