import { useState } from 'react'
import { Button, Card, Stack, Title, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveJSON, openFile } from '@lacuna/file-save-open'
import { decodeJwt, InvalidJwtError } from './jwt'
import { history } from './host'

interface DecodedResult {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

export function App() {
  const [token, setToken] = useState('')
  const [result, setResult] = useState<DecodedResult | null>(null)
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const runDecode = (value: string) => {
    try {
      const decoded = decodeJwt(value)
      setResult(decoded)
      setError('')
      const payload = decoded.payload as Record<string, unknown>
      const label =
        typeof payload.name === 'string'
          ? payload.name
          : typeof payload.sub === 'string'
            ? payload.sub
            : 'Anonymous'
      history.add({
        token: value,
        headerJson: JSON.stringify(decoded.header),
        payloadJson: JSON.stringify(decoded.payload),
        signature: decoded.signature,
        label,
        decodedAt: Date.now(),
      })
    } catch (e) {
      setResult(null)
      setError(e instanceof InvalidJwtError ? e.message : 'Invalid JWT')
    }
  }

  const onFile = async (file: File) => {
    const res = await openFile(file, 'text')
    if (res.ok && typeof res.data === 'string') {
      setToken(res.data)
      runDecode(res.data)
    }
  }

  const handleExport = () => {
    if (!result) return
    saveJSON(
      { header: result.header, payload: result.payload, signature: result.signature },
      { filename: `jwt-decode-${Date.now()}.json`, mimeType: 'application/json' },
    )
  }

  const historyItems = history.list()

  return (
    <main>
      <Card title="JWT Decoder">
        <Stack>
          <Title size="md">Decode a JSON Web Token</Title>

          <TextInput
            label="Token"
            value={token}
            onChange={(v) => setToken(v)}
          />

          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <Button kind="primary" onClick={() => runDecode(token)}>
              Decode
            </Button>
            {result ? (
              <Button kind="secondary" onClick={handleExport}>
                Export JSON
              </Button>
            ) : null}
          </div>

          {error ? (
            <div role="alert" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          ) : null}

          {result ? (
            <Stack>
              <Card title="Header">
                <pre
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(result.header)}
                </pre>
                <button
                  type="button"
                  className="lc-btn secondary"
                  aria-label="Copy Header"
                  onClick={() => void copy(JSON.stringify(result.header)).catch(() => undefined)}
                >
                  {copied ? 'Copied' : 'Copy Header'}
                </button>
              </Card>

              <Card title="Payload">
                <pre
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(result.payload)}
                </pre>
                <button
                  type="button"
                  className="lc-btn secondary"
                  aria-label="Copy Payload"
                  onClick={() => void copy(JSON.stringify(result.payload)).catch(() => undefined)}
                >
                  {copied ? 'Copied' : 'Copy Payload'}
                </button>
              </Card>

              <Card title="Signature">
                <pre
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                  }}
                >
                  {result.signature}
                </pre>
                <button
                  type="button"
                  className="lc-btn secondary"
                  aria-label="Copy Signature"
                  onClick={() => void copy(result.signature).catch(() => undefined)}
                >
                  {copied ? 'Copied' : 'Copy Signature'}
                </button>
              </Card>
            </Stack>
          ) : null}

          <label role="region" title="Drop token file">
            <input
              type="file"
              accept=".txt,.json,.jwk,.jwt"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onFile(file)
              }}
            />
          </label>

          <section aria-label="History">
            <Title size="md">History</Title>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {historyItems.map((item) => (
                <li key={item.decodedAt} style={{ padding: 'calc(4px * var(--sf)) 0' }}>
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setToken(item.token)
                      runDecode(item.token)
                    }}
                  >
                    {item.label}
                  </Button>
                  <span
                    style={{
                      marginLeft: 'calc(8px * var(--sf))',
                      color: 'var(--ink)',
                    }}
                  >
                    {new Date(item.decodedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Stack>
      </Card>
    </main>
  )
}
