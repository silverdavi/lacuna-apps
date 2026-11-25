// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Keys, Rail, Select } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { isEpubFileName, openEpub, type EpubBook } from './book'
import { EMPTY_SESSION, type EpubSession, type FontSize } from './host'
import type { ChangeEvent } from 'react'
import './app.css'

const FONT_SIZES: FontSize[] = ['Small', 'Normal', 'Large']

export function App() {
  const { value: session, set: setSession } = useLocalRecord<EpubSession>({
    key: 'epub-reader.session',
    version: 1,
    defaultValue: EMPTY_SESSION,
  })

  const [book, setBook] = useState<EpubBook | null>(null)
  const [pageText, setPageText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useClipboard()

  const fileName = session.fileName
  const page = session.page
  const bookmarks = session.bookmarks

  const dataUrl = session.dataUrl
  useEffect(() => {
    if (dataUrl === null || fileName === null) {
      setBook(null)
      setPageText(null)
      return
    }
    let active = true
    openEpub(decodeDataUrl(dataUrl)).then(
      (loaded) => {
        if (!active) return
        setBook(loaded)
        const target = Math.min(session.page, loaded.count - 1)
        loaded.page(target).then(
          (text) => {
            if (active) setPageText(text)
          },
          () => active && setError('Could not read that page. Try another file.'),
        )
      },
      () => active && setError('Could not open that book. Pick another file.'),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl, fileName])

  const total = book?.count ?? 0

  const applyFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (!isEpubFileName(file.name)) {
        setError('That is not an EPUB file. Pick a book to open.')
        return
      }
      setError(null)
      readAsDataUrl(file).then(
        (dataUrl) => setSession((s) => ({ ...s, dataUrl, fileName: file.name, page: 0, bookmarks: [] })),
        () => setError('Could not open that file. Make sure it is a valid EPUB.'),
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

  const openBrowse = useCallback(() => fileRef.current?.click(), [])

  const goTo = useCallback(
    (target: number) => {
      if (!book || target < 0 || target >= book.count) return
      setSession((s) => ({ ...s, page: target }))
      book.page(target).then(
        (text) => {
          setPageText(text)
        },
        () => setError('Could not read that page. Try another file.'),
      )
    },
    [book, setSession],
  )

  const next = useCallback(() => goTo(session.page + 1), [goTo, session.page])
  const prev = useCallback(() => goTo(session.page - 1), [goTo, session.page])

  const toggleBookmark = useCallback(() => {
    setSession((s) => {
      const n = s.page + 1
      return {
        ...s,
        bookmarks: s.bookmarks.includes(n)
          ? s.bookmarks.filter((b) => b !== n)
          : [...s.bookmarks, n].sort((a, b) => a - b),
      }
    })
  }, [setSession])

  const deleteBookmark = useCallback(
    (n: number) => {
      setSession((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b !== n) }))
    },
    [setSession],
  )

  const gotoBookmark = useCallback((n: number) => goTo(n - 1), [goTo])

  const exportPage = useCallback(() => {
    if (pageText === null) return
    void copy(pageText)
  }, [copy, pageText])

  const status =
    error ??
    (copied
      ? 'Exported page'
      : total
        ? `${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'} · ${total} pages`
        : `${FONT_SIZES.indexOf(session.fontSize) + 1} of 3 type sizes`)

  return (
    <AppShell
      name="EPUB Reader"
      icon="docs"
      hue="rust"
      category="Productivity"
      meta={total ? `${total} pages` : undefined}
      status={status}
      side={
        <Rail title="Bookmarks" note={bookmarks.length ? `${bookmarks.length} marked page${bookmarks.length === 1 ? '' : 's'}` : 'Mark pages to keep'}>
          <div role="list" aria-label="Bookmarks">
            {bookmarks.length === 0 ? (
              <p role="listitem" className="er-rail-empty">No bookmarks</p>
            ) : (
              <div className="er-rail-list">
                {bookmarks.map((n) => (
                  <div key={n} role="listitem" className="er-rail-row">
                    <Button kind="ghost" ariaLabel={`Go to Page ${n}`} onClick={() => gotoBookmark(n)}>
                      Page {n}
                    </Button>
                    <Button kind="ghost" ariaLabel={`Delete Page ${n}`} onClick={() => deleteBookmark(n)}>
                      <span aria-hidden="true">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Select
            label="Font size"
            value={session.fontSize}
            onChange={(v) => setSession((s) => ({ ...s, fontSize: v as FontSize }))}
            options={FONT_SIZES}
          />
          <Keys items={[['←', 'Previous page'], ['→', 'Next page']]} />
        </Rail>
      }
    >
      <div className="er-stack">
        <input ref={fileRef} type="file" accept=".epub,application/epub+zip" className="er-file" onChange={onPick} />

        {book && total > 0 ? (
          <Card mono="Reader" title={fileName ?? ''} accent>
            <div className="er-progress">
              <span aria-hidden="true">Page {page + 1} of {total}</span>
            </div>
            <div
              className={`er-page${session.fontSize === 'Small' ? ' small' : session.fontSize === 'Large' ? ' large' : ''}`}
              role="region"
              aria-label="Reader"
            >
              <p className="er-pageline">{pageText}</p>
            </div>
            <div className="er-controls">
              <Button ariaLabel="Previous page" disabled={page === 0} onClick={prev}>
                Previous page
              </Button>
              <Button kind="primary" ariaLabel="Next page" disabled={page >= total - 1} onClick={next}>
                Next page
              </Button>
              <Button ariaLabel="Add bookmark" onClick={toggleBookmark}>
                Add bookmark
              </Button>
              <Button ariaLabel="Export page" onClick={exportPage}>
                Export page
              </Button>
            </div>
          </Card>
        ) : (
          <EmptyState
            mono="Waiting"
            title="No book loaded"
            detail="Open an EPUB to start reading."
            actionLabel="Choose file"
            onAction={openBrowse}
          />
        )}

        {copied ? <div className="er-copied">Copied page text</div> : null}
        {error ? <div className="er-error" role="alert">{error}</div> : null}
      </div>
    </AppShell>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function decodeDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  const data = dataUrl.slice(comma + 1)
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
}
