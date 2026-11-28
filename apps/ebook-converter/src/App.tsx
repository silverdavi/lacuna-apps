// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  buildEpubBlob,
  buildStandaloneHtml,
  SAMPLE_BOOK_MD,
  splitMarkdownChapters,
} from './engine/epub'

interface BookState {
  title: string
  author: string
  language: string
  markdown: string
}

const DEFAULT_STATE: BookState = {
  title: 'Field Guide to Offline Tools',
  author: 'Lacuna Press',
  language: 'en',
  markdown: SAMPLE_BOOK_MD,
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<BookState>({
    key: 'ebook-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const fileRef = useRef<HTMLInputElement | null>(null)
  const chapters = useMemo(() => splitMarkdownChapters(state.markdown), [state.markdown])
  const slug = (state.title.trim() || 'book').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'book'

  function downloadEpub() {
    if (chapters.length === 0) return
    const blob = buildEpubBlob({
      title: state.title,
      author: state.author,
      language: state.language,
      chapters,
    })
    saveBlob(blob, { filename: `${slug}.epub`, mimeType: 'application/epub+zip' })
  }

  function downloadHtml() {
    if (chapters.length === 0) return
    const blob = buildStandaloneHtml(state.title, state.author, chapters)
    saveBlob(blob, { filename: `${slug}.html`, mimeType: 'text/html;charset=utf-8' })
  }

  const side = (
    <Stack>
      <Rail title="Book" note={state.author || 'Unknown author'}>
        <KpiRow>
          <Kpi value={String(chapters.length)} label="Chapters" accent />
          <Kpi value={String(state.markdown.trim().split(/\s+/).filter(Boolean).length)} label="Words" />
        </KpiRow>
      </Rail>
      <Rail title="Packaging">
        <Keys
          items={[
            ['EPUB 3', 'OCF + OPF + nav.xhtml'],
            ['Split rule', 'Each # Heading = chapter'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="EPUB Converter"
      icon="wiki"
      hue="blue"
      category="Productivity"
      meta="Markdown → EPUB 3"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              void f.text().then((t) =>
                setState((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, ''), markdown: t })),
              )
            }
            e.target.value = ''
          }}
        />

        <Card mono="Metadata" title="Book details">
          <FormGrid>
            <TextInput
              label="Book title"
              value={state.title}
              onChange={(v) => setState((p) => ({ ...p, title: v }))}
            />
            <TextInput
              label="Author"
              value={state.author}
              onChange={(v) => setState((p) => ({ ...p, author: v }))}
            />
            <Select
              label="Language"
              value={state.language}
              onChange={(v) => setState((p) => ({ ...p, language: v }))}
              options={[
                { value: 'en', label: 'English (en)' },
                { value: 'es', label: 'Spanish (es)' },
                { value: 'fr', label: 'French (fr)' },
                { value: 'de', label: 'German (de)' },
                { value: 'he', label: 'Hebrew (he)' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={downloadEpub} disabled={chapters.length === 0}>
              Download {slug}.epub
            </PrimaryButton>
            <Button kind="secondary" onClick={downloadHtml} disabled={chapters.length === 0}>
              Export HTML
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open Markdown
            </Button>
          </Actions>
        </Card>

        <Card mono="Manuscript" title="Markdown chapters">
          <TextInput
            label="Manuscript source"
            value={state.markdown}
            onChange={(v) => setState((p) => ({ ...p, markdown: v }))}
            rows={12}
          />
        </Card>

        <Card mono="TOC" title="Detected chapters">
          <List label="Table of contents">
            {chapters.map((ch, i) => (
              <Row
                key={ch.id}
                title={ch.title}
                meta={`${ch.markdown.split(/\s+/).filter(Boolean).length} words`}
                value={<Tag>Ch {i + 1}</Tag>}
              />
            ))}
          </List>
        </Card>
      </Stack>
    </AppShell>
  )
}
