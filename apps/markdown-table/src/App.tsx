// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Parse markdown pipe tables into rows and columns, and render them as a
// readable table. The source text and saved snapshots are kept in the space
// so a session survives a reload.

import { useEffect, useMemo, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  Cols,
  EmptyState,
  FormGrid,
  Rail,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Snapshot } from './host'

type ParsedRow = { cells: string[] }

function parseMarkdownTable(text: string): ParsedRow[] {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''))
  const rows: ParsedRow[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '')
    const cells = inner.split('|').map((c) => c.trim())
    const isSeparator = cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c) && c.length >= 3)
    if (isSeparator) continue
    rows.push({ cells })
  }
  return rows
}

type TableRecord = {
  text: string
  snapshots: Snapshot[]
}

const STORAGE_KEY = 'lacuna.markdown-table.v1'

function readRecord(): TableRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { text: '', snapshots: [] }
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { text: '', snapshots: [] }
    const data = parsed.data ?? parsed
    if (typeof data !== 'object' || data === null) return { text: '', snapshots: [] }
    return {
      text: typeof data.text === 'string' ? data.text : '',
      snapshots: Array.isArray(data.snapshots) ? data.snapshots : [],
    }
  } catch {
    return { text: '', snapshots: [] }
  }
}

function writeRecord(rec: TableRecord): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: rec }))
  } catch {
    // ignore quota / privacy-mode failures
  }
}

export function App() {
  const [record, setRecord] = useState<TableRecord>(readRecord)
  const [snapshots, setSnapshots] = useState<Snapshot[]>(record.snapshots)
  const clipboard = useClipboard()
  const [copied, setCopied] = useState(false)

  // Persist on every record change.
  useEffect(() => {
    writeRecord(record)
  }, [record])

  // Hydrate from host storage once on mount.
  useEffect(() => {
    const text = host.read()
    const snaps = host.snapshots()
    if (text || snaps.length > 0) {
      setRecord((r) => ({
        text: text || r.text,
        snapshots: snaps.length ? snaps : r.snapshots,
      }))
      setSnapshots(snaps.length ? snaps : record.snapshots)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parsed = useMemo(() => parseMarkdownTable(record.text), [record.text])
  const columnCount = parsed.length > 0 ? Math.max(...parsed.map((r) => r.cells.length)) : 0
  const dataRows = parsed.filter((r) => r.cells.length > 0 && r.cells.some((c) => c !== ''))

  const snapshotColumns = useMemo(
    () => [
      { key: 'at', label: 'When' },
      { key: 'rows', label: 'Rows', num: true },
      { key: 'cols', label: 'Columns', num: true },
      { key: 'preview', label: 'Preview' },
    ],
    [],
  )

  const snapshotRows = useMemo(
    () =>
      snapshots.map((s) => ({
        cells: {
          at: new Date(s.at).toLocaleTimeString(),
          rows: s.rows,
          cols: s.columns,
          preview: s.text.split('\n')[0]?.slice(0, 40) || '',
        } as Record<string, React.ReactNode>,
      })),
    [snapshots],
  )

  const onUpdate = (text: string) => {
    setRecord((r) => ({ ...r, text }))
    host.write(text)
  }

  const onCopy = () => {
    if (record.text.length === 0) return
    void clipboard.copy(record.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const onSaveSnapshot = () => {
    if (record.text.length === 0) return
    const rows = dataRows.length
    const cols = columnCount
    const next = host.save(record.text, rows, cols)
    setSnapshots(next)
    setRecord((r) => ({ ...r, snapshots: next }))
  }

  const onLoadSnapshot = (id: string) => {
    const snap = snapshots.find((s) => s.id === id)
    if (!snap) return
    onUpdate(snap.text)
  }

  const onClear = () => {
    setRecord((r) => ({ ...r, text: '', snapshots: [] }))
    setSnapshots([])
    host.clear()
    host.clearSnapshots()
  }

  const hasOutput = dataRows.length > 0
  const isEmpty = record.text.length === 0

  return (
    <AppShell
      name="Markdown table"
      hue="blue"
      icon="grid"
      category="Text"
      meta={
        record.text.length > 0
          ? `${dataRows.length} rows · ${columnCount} cols`
          : undefined
      }
      side={
        <Rail
          title="Shortcuts"
          note={`${record.text.length} chars · ${hasOutput ? dataRows.length : 0} rows shown`}
          chips={['Ctrl+S save snapshot', 'Ctrl+C copy source']}
        >
          <Stack>
            <Button kind="ghost" onClick={onSaveSnapshot} disabled={isEmpty}>
              Save snapshot
            </Button>
            <Button kind="ghost" onClick={onCopy} disabled={isEmpty}>
              {copied ? 'Copied' : 'Copy source'}
            </Button>
            <Button kind="ghost" onClick={onClear}>
              Clear all
            </Button>
          </Stack>
        </Rail>
      }
    >
      <Cols kind="main-side">
        <Card title="Source" mono={record.text.length > 0 ? `${record.text.length} chars` : undefined}>
          <FormGrid>
            <TextInput
              label="Markdown table"
              value={record.text}
              onChange={onUpdate}
              rows={14}
              placeholder={'|Name|Role|\n|---|---|\n|Ada|Engineer|'}
            />
          </FormGrid>
        </Card>

        <Card
          title="Output"
          mono={hasOutput ? `${dataRows.length} rows × ${columnCount} cols` : 'No rows'}
        >
          {isEmpty ? (
            <EmptyState
              title="No table yet"
              detail="Enter a pipe table in the source box; the rows appear here with the separator skipped."
              actionLabel="Enter a table"
            />
          ) : hasOutput ? (
            <table className="lc-table" aria-label="Output">
              <tbody>
                {dataRows.map((r, i) => (
                  <tr key={i}>
                    {Array.from({ length: columnCount }, (_, j) => (
                      <td key={j}>{j > 0 ? ', ' : ''}{r.cells[j] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No data rows"
              detail="The source text has lines but none of them is a pipe table row."
              actionLabel="Add pipe rows"
            />
          )}
        </Card>

        {snapshots.length > 0 && (
          <Card
            title="Snapshots"
            mono={`${snapshots.length} saved`}
            actions={
              <Button kind="ghost" onClick={onClear}>
                Clear
              </Button>
            }
          >
            <table className="lc-table" aria-label="Snapshots">
              <thead>
                <tr>{snapshotColumns.map((c) => <th key={c.key} className={c.num ? 'num' : undefined}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {snapshotRows.map((r, i) => (
                  <tr key={i}>
                    {snapshotColumns.map((c) => (
                      <td key={c.key} className={c.num ? 'num' : undefined}>{r.cells[c.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Stack style={{ marginTop: 'calc(10px * var(--sf))' }}>
              {snapshots.map((s) => (
                <Button key={s.id} kind="ghost" onClick={() => onLoadSnapshot(s.id)}>
                  Load {new Date(s.at).toLocaleTimeString()}
                </Button>
              ))}
            </Stack>
          </Card>
        )}
      </Cols>
    </AppShell>
  )
}
