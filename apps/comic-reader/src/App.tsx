// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent as ReactDragEvent, ReactNode } from 'react'
import { AppShell, Button, Card, EmptyState, List, Rail, Row, Select } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import { isComicFileName, openComic, type ComicPages } from './comic'
import type { ComicSession } from './host'
import { loadSession } from './host'
import './app.css'

type Tab = 'Reader' | 'Bookmarks'

export function App() {
  const { value: session, set: setSession } = useLocalRecord<ComicSession>({
    key: 'comic-reader.session',
    version: 1,
    defaultValue: loadSession(),
  })

  const [pages, setPages] = useState<ComicPages | null>(null)
  const [pageUrl, setPageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<Tab>('Reader')
  const fileRef = useRef<HTMLInputElement>(null)

  const fileName = session.fileName
  const page = session.page
  const total = pages?.count ?? 0
  const bookmarks = session.bookmarks
  const currentBookmarked = bookmarks.includes(page + 1)

  // Decode the visible page whenever the position or the open comic changes.
  useEffect(() => {
    if (!pages) return
    let active = true
    pages.page(page).then(
      (url) => {
        if (active) {
          setPageUrl(url)
          setError(null)
        }
      },
      () => {
        if (active) setError('Could not read that page. Try another file.')
      },
    )
    return () => {
      active = false
    }
  }, [pages, page])

  const applyFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (!isComicFileName(file.name)) {
        setError('That is not a CBZ or CBR file. Pick a comic archive to open.')
        return
      }
      openComic(file).then(
        (comic) => {
          setPages(comic)
          setError(null)
          setSession({ ...comicDefaultSession, fileName: file.name })
        },
        () => setError('Could not open that file. Make sure it is a valid CBZ or CRB.'),
      )
    },
    [setSession],
  )

  const onPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      applyFile(e.target.files?.[0])
      e.currentTarget.value = ''
    },
    [applyFile],
  )

  const onDrop = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault()
      setDragOver(false)
      applyFile(e.dataTransfer.files?.[0])
    },
    [applyFile],
  )

  const openBrowse = useCallback(() => fileRef.current?.click(), [])

  const next = () => setSession((s) => ({ ...s, page: Math.min(s.page + 1, total - 1) }))
  const prev = () => setSession((s) => ({ ...s, page: Math.max(s.page - 1, 0) }))

  const toggleBookmark = () => {
    setSession((s) => ({
      ...s,
      bookmarks: currentBookmarked
        ? s.bookmarks.filter((n) => n !== page + 1)
        : [...s.bookmarks, page + 1].sort((a, b) => a - b),
    }))
  }

  const gotoBookmark = (n: number) => setSession((s) => ({ ...s, page: n - 1 }))

  const exportPage = () => {
    if (!pageUrl) return
    const comma = pageUrl.indexOf(',')
    const head = pageUrl.slice(0, comma)
    const data = pageUrl.slice(comma + 1)
    const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/png'
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    const base = (fileName ?? 'comic').replace(/\.(cbz|cbr)$/i, '')
    saveBlob(new Blob([bytes], { type: mime }), { filename: `${base}-page-${page + 1}.png` })
  }

  const status = total ? `${total} pages` : 'Local · no network'

  return (
    <AppShell
      name="Comic Book Reader"
      icon="files"
      hue="rust"
      category="Personal"
      meta={total ? `${page + 1} of ${total}` : undefined}
      status={status}
      side={
        <Rail title="Reader" note="Stays on this device" chips={['CBZ', 'CRB', 'Bookmarks']}>
          {tab === 'Reader' && bookmarks.length > 0 ? (
            <List label="Bookmarks">
              {bookmarks.map((n) => (
                <Row key={n} title={`Page ${n}`} hot={n === page + 1} onClick={() => gotoBookmark(n)} />
              ))}
            </List>
          ) : (
            <div className="cr-rail-empty">No bookmarks yet.</div>
          )}
        </Rail>
      }
    >
      <div className="cr-tabs" role="tablist" aria-label="Views">
        {(['Reader', 'Bookmarks'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`cr-tab${tab === t ? ' on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Reader' ? (
        <Stack>
          <Card mono={fileName ?? 'Empty'} title="Open a comic">
            {error ? <div className="cr-error">{error}</div> : null}
            <label
              className={`cr-drop${dragOver ? ' cr-drop-hot' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              Drop a CBZ or CBR file here
              <input
                ref={fileRef}
                type="file"
                accept=".cbz,.cbr,application/zip"
                className="cr-drop-file"
                onChange={onPick}
              />
            </label>
          </Card>

          <Card
            mono="PagedReader"
            actions={
              total ? (
                <div className="cr-progress" aria-label={`Page ${page + 1} of ${total}`}>
                  {`${page + 1}/${total}`}
                </div>
              ) : undefined
            }
          >
            <h2 className="cr-reader-heading">PagedReader</h2>
            {total ? (
              <div className="cr-stage">
                <img
                  className={`cr-page${session.pageSize === 'Fit width' ? ' fit-width' : ' fit-page'}`}
                  src={pageUrl ?? undefined}
                  alt={`Page ${page + 1} of ${total}`}
                />
                <div className="cr-controls">
                  <Button disabled={page === 0} onClick={prev}>
                    Previous page
                  </Button>
                  <Button
                    kind={page < total - 1 ? 'primary' : 'secondary'}
                    disabled={page >= total - 1}
                    onClick={next}
                  >
                    Next page
                  </Button>
                  <Button onClick={toggleBookmark}>
                    {currentBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  </Button>
                  <Button onClick={exportPage}>Export page</Button>
                </div>
                <div className="cr-setting">
                  <Select
                    label="Page size"
                    value={session.pageSize}
                    onChange={(v) => setSession((s) => ({ ...s, pageSize: v as ComicSession['pageSize'] }))}
                    options={[
                      { value: 'Fit width', label: 'Fit width' },
                      { value: 'Fit page', label: 'Fit page' },
                    ]}
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                mono="Waiting"
                title="No comic open"
                detail="Open a CBZ or CRB to start reading."
                actionLabel="Browse files"
                onAction={openBrowse}
              />
            )}
          </Card>
        </Stack>
      ) : (
        <Card mono={String(bookmarks.length)} title="Bookmarks">
          {bookmarks.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No bookmarks yet"
              detail="Mark a page from the reader to keep it here."
              actionLabel="Go to reader"
              onAction={() => setTab('Reader')}
            />
          ) : (
            <List label="Bookmarked pages">
              {bookmarks.map((n) => (
                <Row key={n} title={`Page ${n}`} hot={n === page + 1} onClick={() => gotoBookmark(n)} />
              ))}
            </List>
          )}
        </Card>
      )}
    </AppShell>
  )
}

const comicDefaultSession: ComicSession = {
  dataUrl: null,
  fileName: null,
  page: 0,
  bookmarks: [],
  pageSize: 'Fit width',
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="cr-stack">{children}</div>
}
