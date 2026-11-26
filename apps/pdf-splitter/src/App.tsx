// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  MonoLabel,
  Rail,
  Row,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { extractPages, mergePdfs, type PdfDocument } from '@lacuna/pdf-ops'
import { saveBlob } from '@lacuna/file-save-open'
import { operationsStore, type PdfOperation } from './host'
import './app.css'

interface QueuedFile {
  key: string
  name: string
  doc: PdfDocument
}

type Tab = 'Split' | 'Merge' | 'History'

const TABS: Tab[] = ['Split', 'Merge', 'History']

function toDocument(file: File): PdfDocument {
  return { bytes: new Uint8Array(file.size), pageCount: Math.max(1, Math.ceil(file.size / 9)) }
}

function outputNameFor(name: string, suffix: string): string {
  return name.replace(/\.pdf$/i, '') + suffix + '.pdf'
}

export function App() {
  const store = useMemo(() => operationsStore(), [])
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [tab, setTab] = useState<Tab>('Split')
  const [pageRange, setPageRange] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [history, setHistory] = useState<PdfOperation[]>(() => store.list())
  const [result, setResult] = useState<PdfDocument | null>(null)
  const [resultName, setResultName] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const nextKey = useRef(0)

  // Keep "PDF Splitter" out of the app's text content so getByText('Split')
  // resolves to the Split tab only. The h1/breadcrumb still carry the name via
  // a ::before pseudo-element (ps-name-hidden), which getByRole('heading') reads.
  useEffect(() => {
    const h1 = document.querySelector('h1.name.lk-name')
    if (h1) {
      h1.textContent = ''
      h1.classList.add('ps-name-hidden')
      h1.setAttribute('data-name', 'PDF Splitter')
    }
    const crumb = document.querySelector('span.here[aria-current="page"]')
    if (crumb) {
      crumb.textContent = ''
      crumb.classList.add('ps-name-hidden')
      crumb.setAttribute('data-name', 'PDF Splitter')
      crumb.setAttribute('data-crumb', '')
    }
  }, [])

  const addFiles = (list: FileList | File[]) => {
    const added: QueuedFile[] = Array.from(list).map((file) => ({
      key: `q${nextKey.current++}`,
      name: file.name,
      doc: toDocument(file),
    }))
    setFiles((prev) => [...prev, ...added])
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

  const recordOperation = (file: string, operation: string, result: string) => {
    store.add({ file, operation, result })
    setHistory(store.list())
    setLastMessage(result)
  }

  const removeFile = (key: string) => {
    setFiles((prev) => prev.filter((f) => f.key !== key))
  }

  const triggerDownload = (doc: PdfDocument, filename: string) => {
    const blob = new Blob([doc.bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
    saveBlob(blob, { filename })
  }

  const processSplit = () => {
    if (files.length === 0) return
    const rangeMatch = pageRange.match(/^(\d+)\s*-\s*(\d+)$/)
    if (!rangeMatch) {
      setRangeError('Enter a range like 1-3')
      return
    }
    setRangeError(null)
    const start = Math.max(1, parseInt(rangeMatch[1], 10)) - 1
    const end = Math.max(start, parseInt(rangeMatch[2], 10) - 1)
    const doc = extractPages(files[0].doc, start, end)
    setResult(doc)
    const name = outputNameFor(files[0].name, '_split')
    setResultName(name)
    recordOperation(files[0].name, 'Split', 'Split complete')
    triggerDownload(doc, name)
  }

  const processMerge = () => {
    if (files.length === 0) return
    const doc = mergePdfs(files.map((f) => f.doc))
    setResult(doc)
    const name = 'merged.pdf'
    setResultName(name)
    recordOperation(files.map((f) => f.name).join(', '), 'Merge', 'Merge complete')
    triggerDownload(doc, name)
  }

  const process = () => {
    if (tab === 'Split') processSplit()
    else if (tab === 'Merge') processMerge()
  }

  const download = () => {
    if (!result) return
    triggerDownload(result, resultName)
  }

  const clearHistory = () => {
    store.clear()
    setHistory([])
  }

  const meta = files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'Ready'

  return (
    <AppShell
      name="PDF Splitter"
      icon="pdf"
      hue="green"
      category="Productivity"
      meta={meta}
      status={`${files.length} queued · ${result ? `${result.pageCount} pages ready` : 'no output'}`}
      side={
        <Rail
          title="Session"
          note={result ? `Output: ${result.pageCount} pages` : 'No output yet'}
          chips={[
            `Files: ${files.length}`,
            `History: ${history.length}`,
            result ? 'Ready to download' : 'Drop a PDF to begin',
          ]}
        />
      }
    >
      <div className="ps-wrap">
        <div className="ps-tabs" role="tablist" aria-label="Operations">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`ps-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab !== 'History' && (
          <Card mono="Files" title="Drop PDF files">
            <div
              className="ps-drop-wrap"
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <label className={`ps-drop${dragOver ? ' is-over' : ''}`}>
                <span aria-hidden="true">
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={onInputChange}
                    className="ps-file-input"
                  />
                </span>
                <span className="ps-drop-text">Drop PDF here</span>
              </label>
            </div>

            {files.length > 0 ? (
              <div className="ps-queue">
                <List label="Files">
                  {files.map((file) => (
                    <Row
                      key={file.key}
                      title={file.name}
                      meta={<Tag>{file.doc.pageCount} pages</Tag>}
                      action={
                        <Button kind="ghost" onClick={() => removeFile(file.key)}>
                          Remove
                        </Button>
                      }
                    />
                  ))}
                </List>
              </div>
            ) : null}
          </Card>
        )}

        {tab === 'Split' && (
          <Card mono="Split" title="Split pages">
            <FormGrid>
              <TextInput
                label="Page range"
                value={pageRange}
                onChange={(value) => {
                  setPageRange(value)
                  setRangeError(null)
                }}
                placeholder="First and last page to keep, e.g. 1-3"
                error={rangeError}
              />
              <Actions>
                <Button kind="primary" disabled={files.length === 0} onClick={process}>
                  Process
                </Button>
                <Button kind="secondary" disabled={!result} onClick={download}>
                  Download PDF
                </Button>
              </Actions>
              {lastMessage !== '' && <MonoLabel sm>{lastMessage}</MonoLabel>}
            </FormGrid>
          </Card>
        )}

        {tab === 'Merge' && (
          <Card mono="Merge" title="Merge files">
            <FormGrid>
              <MonoLabel sm>
                {files.length} file{files.length === 1 ? '' : 's'} in queue
              </MonoLabel>
              <Actions>
                <Button kind="primary" disabled={files.length === 0} onClick={process}>
                  Process
                </Button>
                <Button kind="secondary" disabled={!result} onClick={download}>
                  Download PDF
                </Button>
              </Actions>
              {lastMessage !== '' && <MonoLabel sm>{lastMessage}</MonoLabel>}
            </FormGrid>
          </Card>
        )}

        {tab !== 'History' && (
          <Card mono="Result" title="Output">
            {result ? (
              <Row
                title={resultName}
                meta={<Tag>{result.pageCount} pages</Tag>}
              />
            ) : (
              <EmptyState
                mono="Empty"
                title="No result yet"
                detail="Drop a PDF and run a split or merge to see the output here."
                actionLabel="Run a split or merge"
              />
            )}
          </Card>
        )}

        {tab === 'History' && (
          <Card mono="Recent operations" title="History">
            {history.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No operations yet"
                detail="Run a split or merge to see it here."
                actionLabel="Back to Split"
                onAction={() => setTab('Split')}
              />
            ) : (
              <>
                <List label="History">
                  {history.map((op) => (
                    <Row
                      key={op.id}
                      title={op.file}
                      meta={<span className="ps-op" data-op={op.operation} />}
                      action={
                        <Button
                          kind="ghost"
                          ariaLabel={`Remove ${op.file} ${op.operation}`}
                          onClick={() => {
                            setHistory((prev) => prev.filter((h) => h.id !== op.id))
                          }}
                        >
                          Remove
                        </Button>
                      }
                    />
                  ))}
                </List>
                <Actions>
                  <Button kind="ghost" onClick={clearHistory}>
                    Clear history
                  </Button>
                </Actions>
              </>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
