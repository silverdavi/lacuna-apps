// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Kpi,
  KpiRow,
  Stack,
} from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host'
import type { TextDiffRecord } from './host'
import { diffLines, diffStringOf, type DiffRow } from './diff'
import './app.css'

const INITIAL: TextDiffRecord | null = host.loadRecord()

function stripTextareaTextNodes(root: HTMLElement) {
  const tas = root.querySelectorAll('textarea')
  for (const ta of tas) {
    while (ta.firstChild && ta.firstChild.nodeType === 3) {
      ta.removeChild(ta.firstChild)
    }
  }
}

export function App() {
  const [textA, setTextA] = useState(INITIAL?.textA ?? '')
  const [textB, setTextB] = useState(INITIAL?.textB ?? '')
  const [caseSensitive, setCaseSensitive] = useState(INITIAL?.caseSensitive ?? false)
  const [result, setResult] = useState<DiffRow[] | null>(() =>
    INITIAL && (INITIAL.textA !== '' || INITIAL.textB !== '') ? diffLines(INITIAL.textA, INITIAL.textB, INITIAL.caseSensitive) : null,
  )
  const [view, setView] = useState('Diff')
  const [toast, setToast] = useState<string | null>(null)
  const { copy } = useClipboard({ timeoutMs: 2000 })

  useEffect(() => {
    if (textA === '' && textB === '' && result === null) return
    host.saveRecord({ textA, textB, caseSensitive })
  }, [textA, textB, caseSensitive, result])

  useEffect(() => {
    stripTextareaTextNodes(document.body)
  }, [textA, textB])

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const handleCompare = () => {
    if (textA === '' && textB === '') {
      setResult(null)
      return
    }
    setResult(diffLines(textA, textB, caseSensitive))
  }

  const handleToggleCase = (next: boolean) => {
    setCaseSensitive(next)
    host.saveRecord({ textA, textB, caseSensitive: next })
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

  const removed = result?.filter((r) => r.change === 'remove').length ?? 0
  const added = result?.filter((r) => r.change === 'add').length ?? 0

  const tabs =
    result !== null ? (
      <div className="lc-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'Diff'}
          className={`lc-tab${view === 'Diff' ? ' active' : ''}`}
          onClick={() => setView('Diff')}
        >
          Diff
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'Summary'}
          className={`lc-tab${view === 'Summary' ? ' active' : ''}`}
          onClick={() => setView('Summary')}
        >
          Summary
        </button>
      </div>
    ) : null

  return (
    <AppShell
      name="Text Diff Checker"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={result === null ? 'Ready' : 'Compared'}
    >
      <Stack>
        <Card mono="Input" title="Text to compare">
          <div className="td-panes">
              <div className="td-field">
              <span className="td-field-label">Original</span>
              <textarea
                className="td-ta"
                rows={5}
                aria-label="Original"
                placeholder="Paste the original text…"
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
              />
            </div>
            <div className="td-field">
              <span className="td-field-label">Revised</span>
              <textarea
                className="td-ta"
                rows={5}
                aria-label="Revised"
                placeholder="Paste the revised text…"
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
              />
            </div>
          </div>
          <div className="td-options">
            <Checkbox label="Case sensitive" checked={caseSensitive} onChange={handleToggleCase} />
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
          {tabs}

          {result === null ? (
            <EmptyState mono="Empty" title="Nothing compared yet" detail="Enter text in both panes to compare." actionLabel="Press Compare" />
          ) : view === 'Diff' ? (
            result.every((r) => r.change === 'same') ? (
              <EmptyState mono="Same" title="No differences found" actionLabel="Try different text" />
            ) : (
              <div className="td-diff" role="log">
                {result.map((r, idx) =>
                  r.change === 'same' ? (
                    <div key={idx} className="td-line td-line-same">
                      <span className="td-marker" aria-hidden="true">{' '}</span>
                      <span className="td-text">{r.text}</span>
                    </div>
                  ) : (
                    <div key={idx} className={`td-line td-line-${r.change}`}>
                      <span className="td-marker" aria-hidden="true">{r.change === 'add' ? '+' : '-'}</span>
                      <span className="td-text" data-change={r.change}>{r.text}</span>
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
          )}
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
