// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host'
import { diffLines, diffStringOf, type DiffRow } from './diff'
import './app.css'

type Prompt = 'empty' | 'no-change'

function computeRows(a: string, b: string, caseSensitive: boolean): DiffRow[] | null {
  if (a === '' && b === '') return null
  return diffLines(a, b, caseSensitive)
}

export function App() {
  const [record] = useState(() => host.loadRecord())
  // Panes mount empty and are restored after mount (see the restore effect
  // below). A textarea that mounts with a value gets a child text node in the
  // DOM; a value set after mount is a property write only.
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(record?.caseSensitive ?? false)
  const [result, setResult] = useState<DiffRow[] | null>(() =>
    computeRows(record?.textA ?? '', record?.textB ?? '', record?.caseSensitive ?? false),
  )
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [view, setView] = useState<'Diff' | 'Summary'>('Diff')
  const [toast, setToast] = useState<string | null>(null)
  const { copy } = useClipboard({ timeoutMs: 2000 })
  useEffect(() => {
    host.saveRecord({ textA, textB, caseSensitive })
  }, [textA, textB, caseSensitive])

  // Restore the saved comparison once, after the panes have mounted empty.
  useEffect(() => {
    if (record) {
      setTextA(record.textA)
      setTextB(record.textB)
    }
  }, [record])

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const handleCompare = () => {
    const rows = computeRows(textA, textB, caseSensitive)
    if (rows === null) {
      setResult(null)
      setPrompt('empty')
      return
    }
    setResult(rows)
    setPrompt(rows.every((r) => r.change === 'same') ? 'no-change' : null)
  }

  const handleCopy = () => {
    if (result === null) return
    const s = diffStringOf(result)
    if (s === '') return
    void copy(s)
    setToast('Diff copied to clipboard')
  }

  const handleDownload = () => {
    if (result === null) return
    const s = diffStringOf(result)
    if (s === '') return
    saveText(s, { filename: 'diff.txt', mimeType: 'text/plain' })
  }

  const removed = result?.filter((r) => r.change === 'remove' || r.change === 'changed').length ?? 0
  const added = result?.filter((r) => r.change === 'add' || r.change === 'changed').length ?? 0

  const body =
    result === null ? (
      prompt === 'empty' ? (
        <p className="td-message" role="status">Enter text in both panes to compare</p>
      ) : (
        <EmptyState
          mono="Empty"
          title="Nothing compared yet"
          detail="Enter text in both panes to compare."
          actionLabel="Compare"
        />
      )
    ) : view === 'Diff' ? (
      prompt === 'no-change' ? (
        <p className="td-message" role="status">No differences found</p>
      ) : (
        <div className="td-diff" role="log">
          {result.map((r, idx) =>
            r.change === 'same' ? (
              <div key={idx} className="td-line td-line-same">
                <span className="td-marker" aria-hidden="true">
                  {' '}
                </span>
                <span className="td-text">{r.text}</span>
              </div>
            ) : r.change === 'changed' ? (
              <div key={idx} className="td-line td-line-changed">
                <span className="td-marker td-marker-changed" aria-hidden="true">
                  ±
                </span>
                <span className="td-text" data-change="remove add">
                  {`${r.from} → ${r.to}`}
                </span>
              </div>
            ) : (
              <div key={idx} className={`td-line td-line-${r.change}`}>
                <span className={`td-marker td-marker-${r.change}`} aria-hidden="true">
                  {r.change === 'add' ? '+' : '-'}
                </span>
                <span className="td-text" data-change={r.change}>
                  {r.text}
                </span>
              </div>
            ),
          )}
        </div>
      )
    ) : (
      <div className="td-summary">
        <KpiRow>
          <Kpi value={String(removed)} label="Lines removed" />
          <Kpi value={String(added)} label="Lines added" />
        </KpiRow>
        <div className="td-summary-text">
          {removed} line{removed === 1 ? '' : 's'} removed, {added} line{added === 1 ? '' : 's'} added
        </div>
      </div>
    )

  return (
    <AppShell
      name="Text Diff Checker"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={result === null ? 'Ready' : `${removed} removed / ${added} added`}
      side={
        <Rail
          title="Diff"
          note="Line-level changes"
          chips={['Compare two texts', 'Copy the diff', 'Download diff.txt', 'Case option']}
        />
      }
    >
      <Stack>
        <Card mono="Input" title="Text to compare">
          <div className="td-panes">
            <TextInput
              label="Original"
              rows={5}
              placeholder="Paste the original text…"
              value={textA}
              onChange={setTextA}
            />
            <TextInput
              label="Revised"
              rows={5}
              placeholder="Paste the revised text…"
              value={textB}
              onChange={setTextB}
            />
          </div>
          <div className="td-options">
            <Checkbox label="Case sensitive" checked={caseSensitive} onChange={setCaseSensitive} />
            <Actions>
              <Button kind="primary" onClick={handleCompare}>
                Compare
              </Button>
            </Actions>
          </div>
        </Card>

        <Card
          mono="Output"
          title="Diff"
          actions={
            result !== null ? (
              <div className="td-card-actions">
                <Button kind="secondary" onClick={handleCopy}>
                  Copy diff
                </Button>
                <Button kind="ghost" onClick={handleDownload}>
                  Download diff
                </Button>
              </div>
            ) : undefined
          }
        >
          {result !== null && (
            <div className="lc-tabs td-tabs" role="tablist" aria-label="Diff views">
              {(['Diff', 'Summary'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={view === item}
                  className={`lc-tab${view === item ? ' active' : ''}`}
                  style={view === item ? undefined : { color: 'var(--ink-60)' }}
                  onClick={() => setView(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {body}
        </Card>
      </Stack>

      {toast !== null && (
        <div className="td-toast" role="status">
          <span>{toast}</span>
        </div>
      )}
    </AppShell>
  )
}
