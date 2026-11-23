// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  PrimaryButton,
  Rail,
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { ALGORITHM_OPTIONS, ENCODING_OPTIONS, hashInput } from './hash'
import { historyStore, type HashAlgorithm, type HashEncoding, type HistoryEntry } from './host'

export function App() {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256')
  const [encoding, setEncoding] = useState<HashEncoding>('hex')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => historyStore.list())
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  useEffect(() => {
    setHistory(historyStore.list())
  }, [])

  const computed = useMemo(() => {
    if (!input) return null
    return { algorithm, encoding, input }
  }, [input, algorithm, encoding])

  useEffect(() => {
    if (!computed) {
      setResult('')
      setError(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const value = await hashInput(computed.algorithm, computed.encoding, computed.input)
        if (!cancelled) {
          setResult(value)
          setError(null)
        }
      } catch {
        if (!cancelled) {
          setResult('')
          setError('Could not compute the hash')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [computed])

  const addHistory = () => {
    if (!result) return
    const entry: HistoryEntry = {
      id: `hash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      input,
      algorithm,
      encoding,
      digest: result,
    }
    historyStore.add(entry)
    setHistory(historyStore.list())
  }

  const clearHistory = () => {
    historyStore.clear()
    setHistory(historyStore.list())
  }

  const copyResult = async () => {
    if (!result) return
    try {
      await copy(result)
    } catch {
      setError('Copy failed')
    }
  }

  return (
    <AppShell
      name="Hash Generator"
      icon="security"
      hue="blue"
      category="Productivity"
      meta={result ? 'Digest ready' : 'Ready'}
      status={copied ? 'Copied to clipboard' : 'Local · no network'}
      side={
        <Rail title="Hash Generator" note="SHA-1 · SHA-256 · SHA-512" chips={['hex', 'base64', 'url']}>
          <Card mono="Output" title="Result">
            {result ? (
              <output aria-label="Result">{result}</output>
            ) : (
              <EmptyState mono="Waiting" title="No result yet" detail="Type text above to hash it." />
            )}
            {result ? (
              <Actions>
                <Button onClick={() => void copyResult()}>{copied ? 'Copied' : 'Copy result'}</Button>
                <Button onClick={addHistory}>Add to history</Button>
              </Actions>
            ) : undefined}
          </Card>
        </Rail>
      }
    >
      <Card mono="Input" title="Hash settings">
        <p style={{ margin: 0 }}>Enter text to hash</p>
        <FormGrid>
          <TextInput label="Input text" value={input} onChange={setInput} placeholder="hello" />
          <Select label="Algorithm" value={algorithm} onChange={(v) => setAlgorithm(v as HashAlgorithm)} options={ALGORITHM_OPTIONS} />
          <Select label="Encoding" value={encoding} onChange={(v) => setEncoding(v as HashEncoding)} options={ENCODING_OPTIONS} />
        </FormGrid>
      </Card>

      <Card
        mono={`${history.length} recent`}
        title="History"
        actions={history.length > 0 ? <Button kind="ghost" onClick={clearHistory}>Clear history</Button> : undefined}
      >
        {history.length === 0 ? (
          <EmptyState mono="Empty" title="No history yet" detail="Added hashes appear here and survive reloads." />
        ) : (
          <Table
            label="History"
            columns={[
              { key: 'input', label: 'Input' },
              { key: 'algorithm', label: 'Algorithm' },
              { key: 'encoding', label: 'Encoding' },
              { key: 'digest', label: 'Digest' },
            ]}
            rows={history.map((entry) => ({
              cells: { input: entry.input, algorithm: entry.algorithm, encoding: entry.encoding, digest: entry.digest },
            }))}
          />
        )}
      </Card>
    </AppShell>
  )
}
