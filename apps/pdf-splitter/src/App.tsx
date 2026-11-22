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
  Row,
  Stack,
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

function toDocument(file: File): PdfDocument {
  return { bytes: new Uint8Array(file.size), pageCount: Math.max(1, Math.ceil(file.size / 9)) }
}

export function App() {
  const store = useMemo(() => operationsStore(), [])
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [tab, setTab] = useState<Tab>('Split')
  const [pageRange, setPageRange] = useState('')
  const [history, setHistory] = useState<PdfOperation[]>(() => store.list())
  const [result, setResult] = useState<PdfDocument | null>(null)
  const [resultName, setResultName] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const nextKey = useRef(0)

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
    if (event.target.files && event.target.files.length > 0) {
      const added: QueuedFile[] = Array.from(event.target.files).map((file) => ({
        key: `q${nextKey.current++}`,
        name: file.name,
        doc: toDocument(file),
      }))
      setFiles(added)
    }
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
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
    const rangeMatch = pageRange.match(/^(\d+)-(\d+)$/)
    const start = rangeMatch ? parseInt(rangeMatch[1], 10) - 1 : 0
    const end = rangeMatch ? parseInt(rangeMatch[2], 10) - 1 : files[0].doc.pageCount - 1
    const doc = extractPages(files[0].doc, start, Math.max(start, end))
    setResult(doc)
    setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_split.pdf`)
    recordOperation(files[0].name, 'Split', 'Split complete')
    triggerDownload(doc, `${files[0].name.replace(/\.pdf$/i, '')}_split.pdf`)
  }

  const processMerge = () => {
    if (files.length === 0) return
    const doc = mergePdfs(files.map((f) => f.doc))
    setResult(doc)
    setResultName('merged.pdf')
    recordOperation(files.map((f) => f.name).join(', '), 'Merge', 'Merge complete')
    triggerDownload(doc, 'merged.pdf')
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

  return (
    <AppShell
      name="PDF Splitter"
      icon="pdf"
      hue="green"
      category="Productivity"
    >
      <div className="ps-wrap">
        {tab !== 'History' && <Tabs tab={tab} onTab={setTab} />}

        {tab === 'History' ? (
          <Card mono="Recent operations" title="History">
            {history.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No operations yet"
                detail="Run a split or merge to see it here."
                actionLabel="Run an operation"
              />
            ) : (
              <>
                <List label="History">
                  {history.map((op) => (
                    <Row
                      key={op.id}
                      title={op.file}
                      meta={<Tag>{op.operation}</Tag>}
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
        ) : (
          <Stack>
            <Card mono="Files" title="Drop PDF files">
              <label
                className={`ps-drop${dragOver ? ' is-over' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={onInputChange}
                  className="ps-file-input"
                  tabIndex={-1}
                />
                Drop PDF here
              </label>

              {files.length > 0 && (
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
              )}
            </Card>

            {tab === 'Split' && (
              <Card mono="Split" title="Split pages">
                <FormGrid>
                  <TextInput
                    label="Page range"
                    value={pageRange}
                    onChange={setPageRange}
                    placeholder="e.g. 1-3"
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
          </Stack>
        )}
      </div>
    </AppShell>
  )
}

function Tabs({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <div className="ps-tabs" role="tablist">
      {(['Split', 'Merge', 'History'] as Tab[]).map((t) => (
        <button
          type="button"
          key={t}
          role="tab"
          aria-selected={tab === t}
          className={`ps-tab${tab === t ? ' active' : ''}`}
          onClick={() => onTab(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
