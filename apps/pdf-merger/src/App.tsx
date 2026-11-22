import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  Rail,
  Row,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { mergePdfs, type PdfDocument } from '@lacuna/pdf-ops'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { operationsStore, type PdfOperation } from './host'
import './app.css'

interface QueuedFile {
  key: string
  name: string
  doc: PdfDocument
}

type OperationType = 'Merge' | 'Split' | 'Reorder'
type Tool = 'merge' | 'split' | 'reorder'
type Tab = 'Tool' | 'History'

interface LastRecord {
  version: number
  type: OperationType | ''
}

const OP_STORE_KEY = 'lacuna.pdf-merger.last-op-record'

const TOOL_LABELS: Record<Tool, string> = { merge: 'Merge', split: 'Split', reorder: 'Reorder' }

function toDocument(file: File): PdfDocument {
  return { bytes: new Uint8Array(file.size), pageCount: Math.max(1, Math.ceil(file.size / 1000)) }
}

export function App() {
  const store = useMemo(() => operationsStore(), [])
  const { value: lastRecord, set: setLastRecord } = useLocalRecord<LastRecord>({
    key: OP_STORE_KEY,
    version: 1,
    defaultValue: { version: 1, type: '' },
  })
  const lastType = lastRecord.type

  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState<Tab>('Tool')
  const [tool, setTool] = useState<Tool>('merge')
  const [startPage, setStartPage] = useState('1')
  const [endPage, setEndPage] = useState('100')
  const [reorderIndex, setReorderIndex] = useState(0)
  const [history, setHistory] = useState<PdfOperation[]>([])
  const [merged, setMerged] = useState<PdfDocument | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const nextKey = useRef(0)
  const clipboard = useClipboard()

  const addFiles = (files: FileList | File[]) => {
    const added: QueuedFile[] = Array.from(files).map((file) => ({
      key: `q${nextKey.current++}`,
      name: file.name,
      doc: toDocument(file),
    }))
    setQueue((q) => [...q, ...added])
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) addFiles(event.target.files)
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files)
  }

  const recordOperation = (file: string, operation: OperationType, result: string) => {
    store.add({ file, operation, result })
    setHistory(store.list())
    setLastRecord({ version: 1, type: operation })
    setStatus(result)
  }

  const removeFile = (key: string) => {
    setQueue((q) => q.filter((f) => f.key !== key))
  }

  const runMerge = () => {
    if (queue.length === 0) return
    const doc = mergePdfs(queue.map((f) => f.doc))
    setMerged(doc)
    const names = queue.map((f) => f.name).join(', ')
    const count = queue.length
    recordOperation(names, 'Merge', `Merged ${count} file${count === 1 ? '' : 's'} into merged.pdf`)
  }

  const applySplit = () => {
    if (queue.length === 0) return
    const start = Math.max(1, parseInt(startPage, 10) || 1)
    const end = Math.max(start, parseInt(endPage, 10) || start)
    recordOperation(queue[0].name, 'Split', `Split pages ${start}-${end}`)
  }

  const runReorder = () => {
    if (queue.length === 0) return
    recordOperation(queue[0].name, 'Reorder', `Page ${reorderIndex + 1} moved`)
  }

  const download = () => {
    if (!merged) return
    const blob = new Blob([merged.bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
    saveBlob(blob, { filename: 'merged.pdf' })
  }

  const movePage = (delta: -1 | 1) => {
    setReorderIndex((i) => Math.min(Math.max(i + delta, 0), 99))
  }

  const pageCount = queue.length > 0 ? Math.max(queue[0].doc.pageCount, 1) : 0

  const meta = queue.length > 0 ? `${queue.length} file${queue.length === 1 ? '' : 's'}` : 'Ready'

  return (
    <AppShell
      name="PDF Toolkit"
      icon="folder"
      hue="rust"
      category="Productivity"
      meta={meta}
      status={status ? `Last operation: ${lastType}` : undefined}
      side={
        <Rail
          title="PDF Toolkit"
          note={lastType ? `Last: ${lastType}` : 'No operations yet'}
          chips={[
            'Merge files',
            'Split pages',
            'Reorder pages',
            `Queue: ${queue.length}`,
            `History: ${history.length}`,
          ]}
        />
      }
    >
      <div className="pm-wrap">
        <div className="pm-tabs" role="tablist" aria-label="Sections">
          {(['Tool', 'History'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`pm-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'History' ? (
          <Card mono="Recent operations" title="History">
            {history.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No operations yet"
                detail="Run an operation to see it here."
                actionLabel="Back to tool"
                onAction={() => setTab('Tool')}
              />
            ) : (
              <>
                <Table
                  label="Recent operations"
                  columns={[
                    { key: 'file', label: 'File' },
                    { key: 'operation', label: 'Operation' },
                    { key: 'result', label: 'Result' },
                  ]}
                  rows={history.map((op) => ({ cells: { file: op.file, operation: op.operation, result: op.result } }))}
                />
                <Actions>
                  <Button kind="ghost" onClick={() => void clipboard.copy(history.map((h) => `${h.file} ${h.operation} ${h.result}`).join('\n'))}>
                    Copy history
                  </Button>
                </Actions>
              </>
            )}
          </Card>
        ) : (
          <Stack>
            <Card mono="Files" title="Drop PDF files">
              <div
                className="pm-drop-wrap"
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <label className={`pm-drop${dragOver ? ' is-over' : ''}`}>
                  <span aria-hidden="true">
                    <input type="file" accept="application/pdf" multiple onChange={onInputChange} className="pm-file-input" />
                  </span>
                  <span className="pm-drop-text">Drop a PDF file or click to browse</span>
                </label>
              </div>

              {queue.length > 0 && (
                <div className="pm-queue">
                  <List label="Merge queue">
                    {queue.map((file) => (
                      <Row
                        key={file.key}
                        title={file.name}
                        meta={<Tag>{file.doc.pageCount}p</Tag>}
                        action={
                          <Button kind="ghost" onClick={() => removeFile(file.key)}>
                            Remove {file.name}
                          </Button>
                        }
                      />
                    ))}
                  </List>
                </div>
              )}
            </Card>

            <Card mono="Tool" title={TOOL_LABELS[tool]}>
              <FormGrid>
                {lastType !== '' && <MonoLabel sm>Last operation: {lastType}</MonoLabel>}

                <div className="pm-tools" role="group" aria-label="Tools">
                  {(['merge', 'split', 'reorder'] as Tool[]).map((t) => {
                    const isLast = lastType !== '' && lastType.toLowerCase() === t
                    const handleClick = () => {
                      setTool(t)
                      if (t === 'merge') runMerge()
                      else if (t === 'reorder') runReorder()
                    }
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`pm-tool${tool === t ? ' active' : ''}`}
                        aria-pressed={isLast}
                        disabled={queue.length === 0}
                        onClick={handleClick}
                      >
                        {TOOL_LABELS[t]}
                      </button>
                    )
                  })}
                </div>

                {tool === 'split' && (
                  <>
                    <TextInput label="Start page" type="number" value={startPage} onChange={setStartPage} />
                    <TextInput label="End page" type="number" value={endPage} onChange={setEndPage} />
                  </>
                )}

                {tool === 'reorder' && queue.length > 0 && (
                  <div className="pm-queue">
                    <List label="Page order">
                      {Array.from({ length: pageCount }, (_, i) => (
                        <Row
                          key={i}
                          hot={i === reorderIndex}
                          title={`Page ${i + 1}`}
                          action={
                            <span className="pm-row-actions">
                              <Button kind="ghost" disabled={i === 0} onClick={() => movePage(-1)}>
                                Move up
                              </Button>
                              <Button kind="ghost" onClick={() => movePage(1)}>
                                Move down
                              </Button>
                            </span>
                          }
                        />
                      ))}
                    </List>
                  </div>
                )}

                <div className="pm-actions">
                  {tool === 'split' && (
                    <Button kind="primary" disabled={queue.length === 0} onClick={applySplit}>
                      Apply
                    </Button>
                  )}
                  {merged && (
                    <Button kind="secondary" onClick={download}>
                      Download
                    </Button>
                  )}
                  {status !== '' && (
                    <Button kind="ghost" onClick={() => void clipboard.copy(status)}>
                      Copy status
                    </Button>
                  )}
                </div>

                {status !== '' && <MonoLabel sm>{status}</MonoLabel>}
              </FormGrid>
            </Card>

            <Card mono="Result" title="Output">
              {merged ? (
                <KpiRow>
                  <Kpi value={merged.pageCount} label="Pages in output" accent />
                  <Kpi value="merged.pdf" label="File name" />
                </KpiRow>
              ) : (
                <EmptyState
                  mono="Empty"
                  title="No result yet"
                  detail="Drop a PDF file and run an operation to see the result here."
                  actionLabel="Back to tool"
                  onAction={() => setTab('Tool')}
                />
              )}
            </Card>
          </Stack>
        )}
      </div>
    </AppShell>
  )
}
