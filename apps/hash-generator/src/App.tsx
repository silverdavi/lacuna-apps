// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Select,
  Table,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { ALGORITHM_OPTIONS, ENCODING_OPTIONS, hashInput } from './hash'
import { historyStore, type HashAlgorithm, type HashEncoding, type HistoryEntry } from './host'

export function App() {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256')
  const [encoding, setEncoding] = useState<HashEncoding>('hex')
  const [history, setHistory] = useState<HistoryEntry[]>(() => historyStore.list())
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const result = useMemo(() => {
    if (!input) return null
    try {
      return hashInput(algorithm, encoding, input)
    } catch {
      return null
    }
  }, [input, algorithm, encoding])

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
      // Clipboard unavailable: the button label simply does not flip.
    }
  }

  return (
    <AppShell
      name="Hash Generator"
      icon="security"
      hue="blue"
      category="Productivity"
      meta={result ? 'Digest ready' : 'Ready'}
      status={copied ? 'Copied' : 'Ready'}
      side={
        <Rail title="Hash Generator" note="SHA-1 · SHA-256 · SHA-512" chips={['hex', 'base64', 'url']}>
          <Card mono="Output" title="Digest">
            <label className="lc-field">
              <span className="lc-field-label">Result</span>
              <input
                className={`lc-input${result ? ' filled' : ''}`}
                type="text"
                readOnly
                aria-readonly="true"
                value={result ?? ''}
                aria-label="Result"
                tabIndex={-1}
              />
            </label>
            {result ? (
              <Actions>
                <Button kind="primary" onClick={() => void copyResult()}>
                  {copied ? 'Copied' : 'Copy result'}
                </Button>
                <Button kind="secondary" onClick={addHistory}>Add to history</Button>
              </Actions>
            ) : (
              <EmptyState mono="Waiting" title="No digest yet" detail="Type in the input field and the digest appears here." actionLabel="Type to hash" />
            )}
          </Card>
        </Rail>
      }
    >
      <Card mono="Input" title="Hash settings">
        {input ? null : (
          <div className="lc-body-sm lc-faint" style={{ marginBottom: 'calc(10px * var(--sf))' }}>
            Enter text to hash
          </div>
        )}
        <FormGrid>
          <label className="lc-field">
            <span className="lc-field-label">Input text</span>
            <textarea
              className={`lc-input${input ? ' filled' : ''}`}
              rows={4}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </label>
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
          <EmptyState mono="Empty" title="No history yet" detail="Added hashes appear here and survive reloads." actionLabel="Add to history" />
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
