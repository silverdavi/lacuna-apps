import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  Cols,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  SectionLabel,
  Tag,
  TextInput,
} from '@lacuna/ui'
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

const CODE_PERIOD = 30

type Toast = { kind: 'ok' | 'error'; text: string } | null

export function App() {
  const [accounts, setAccounts] = useState<Account[]>(() => listAccounts())
  const [rows, setRows] = useState<Record<string, string>>({})
  const [secretInput, setSecretInput] = useState('')
  const [uriInput, setUriInput] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const toastTimer = useRef<number | undefined>(undefined)
  const copyTimer = useRef<number | undefined>(undefined)

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

  const handleSecretChange = (value: string) => {
    setSecretInput(value.toUpperCase().replace(/\s/g, ''))
    setFieldError(null)
  }

  const handleUriChange = (value: string) => {
    setUriInput(value)
    setFieldError(null)
  }

  const handleAdd = () => {
    const secret = secretInput.trim()
    if (secret) {
      if (!isValidBase32(secret)) {
        setFieldError('Invalid base32 secret')
        return
      }
      const label = nextLabel('Account', accounts)
      addAccount(label, secret)
      refresh()
      setSecretInput('')
      setFieldError(null)
      setToast({ kind: 'ok', text: `Added ${label}` })
      return
    }
    const uri = uriInput.trim()
    if (!uri) {
      setFieldError('Enter a base32 secret or an otpauth URI.')
      return
    }
    const parsed = parseOtpauth(uri)
    if (!parsed || !isValidBase32(parsed.secret)) {
      setFieldError('Invalid base32 secret')
      return
    }
    const label = nextLabel(parsed.label, accounts)
    addAccount(label, parsed.secret)
    refresh()
    setUriInput('')
    setFieldError(null)
    setToast({ kind: 'ok', text: `Added ${label}` })
  }

  const handleCopy = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(label)
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 2000)
      setToast({ kind: 'ok', text: 'Code copied' })
    } catch {
      setToast({ kind: 'error', text: 'Copy failed' })
    }
  }

  const handleDelete = (account: Account) => {
    deleteAccount(account.id)
    refresh()
    setToast({ kind: 'ok', text: `Deleted ${account.label}` })
  }

  const secondsLeft = remaining(now, CODE_PERIOD)
  const fractionLeft = secondsLeft / CODE_PERIOD

  const accountsCard = accounts.length === 0 ? (
    <EmptyState
      mono="Empty"
      title="No accounts yet"
      detail="Add a base32 secret or an otpauth URI below. Codes refresh every 30 seconds and never leave this device."
    />
  ) : (
    <List label="Accounts">
      {accounts.map((account) => (
        <Row
          key={account.id}
          title={account.label}
          meta={account.secret}
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.12em',
                  fontSize: 'calc(15px * var(--tf))',
                }}
              >
                {rows[account.id] ?? '······'}
              </span>
              <span
                aria-hidden
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: 'calc(44px * var(--sf))',
                  height: 'calc(4px * var(--sf))',
                  borderRadius: 'calc(2px * var(--sf))',
                  background: 'var(--ui-line2)',
                  overflow: 'hidden',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${Math.round(fractionLeft * 100)}%`,
                    background: secondsLeft <= 5 ? 'var(--accent)' : 'var(--hair-strong)',
                  }}
                />
              </span>
            </span>
          }
          hot={secondsLeft <= 5}
          action={
            <Actions>
              <Button
                kind="ghost"
                ariaLabel="Copy code"
                onClick={() => void handleCopy(rows[account.id] ?? '', account.label)}
              >
                {copiedId === account.label ? 'Copied' : 'Copy code'}
              </Button>
              <Button
                kind="ghost"
                ariaLabel={`Delete ${account.label}`}
                onClick={() => handleDelete(account)}
              >
                Delete
              </Button>
            </Actions>
          }
        />
      ))}
    </List>
  )

  return (
    <AppShell
      name="TOTP Authenticator"
      icon="security"
      hue="green"
      category="Productivity"
      meta={`${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}
      status={`codes refresh every ${CODE_PERIOD}s · saved on this device`}
      side={
        <>
          <Rail
            title="At a glance"
            note={`code refreshes in ${secondsLeft}s`}
            chips={['Local only', 'Works offline']}
          >
            <KpiRow>
              <Kpi value={String(accounts.length)} label="Accounts" />
              <Kpi
                value={`${secondsLeft}s`}
                label={`of ${CODE_PERIOD}s period`}
                accent={secondsLeft <= 5}
              />
            </KpiRow>
            <KpiRow>
              <Kpi value="6" label="Digits" />
              <Kpi value="SHA-1" label="HMAC" />
            </KpiRow>
          </Rail>
          <Rail title="How it works" note="RFC 6238">
            <Body sm>
              Six-digit codes rotate every 30 seconds from your base32 secret, computed entirely in this
              browser. Nothing is sent anywhere.
            </Body>
            <div style={{ marginTop: 'calc(12px * var(--sf))', display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
              <Tag>base32 secret</Tag>
              <Tag>otpauth URI</Tag>
              <Tag>no network</Tag>
            </div>
          </Rail>
        </>
      }
    >
      <Cols kind="2">
        <div style={{ minWidth: 0 }}>
          <SectionLabel>Accounts</SectionLabel>
          <Card mono={`Current codes · refresh ${secondsLeft}s`} title="Accounts">
            {accountsCard}
          </Card>
        </div>
        <div style={{ minWidth: 0 }}>
          <SectionLabel>Add account</SectionLabel>
          <Card mono="New" title="Add an account">
            <FormGrid>
              <TextInput
                label="Base32 Secret"
                value={secretInput}
                onChange={handleSecretChange}
                placeholder="JBSWY3DPEHPK3PXP"
                error={fieldError}
              />
              <TextInput
                label="otpauth URI"
                value={uriInput}
                onChange={handleUriChange}
                placeholder="otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP"
              />
            </FormGrid>
            <Body sm>
              Fill either field: a raw base32 secret (A–Z and 2–7) or a full otpauth://totp/ URI. The
              secret wins when both are present.
            </Body>
            <Actions>
              <Button kind="primary" onClick={handleAdd}>
                Add account
              </Button>
            </Actions>
          </Card>
        </div>
      </Cols>

      {toast !== null && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(16px * var(--sf))',
            left: 'calc(16px * var(--sf))',
            background: 'var(--paper)',
            color: toast.kind === 'ok' ? 'var(--ink)' : 'var(--danger)',
            border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
            boxShadow: 'var(--shadow)',
            padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(13px * var(--tf))',
            zIndex: 10,
          }}
        >
          {toast.text}
        </div>
      )}
    </AppShell>
  )
}
