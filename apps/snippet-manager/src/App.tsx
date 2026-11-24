import { useCallback, useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { FilterBar, type SortDef } from '@lacuna/filter-bar'
import { TagInput } from '@lacuna/tag-input'
import { useClipboard } from '@lacuna/use-clipboard'
import { addSnippet, listSnippets, removeSnippet, type Snippet } from './host'
import './app.css'

const SORTS: SortDef[] = [
  { field: 'title', direction: 'asc', label: 'Title A-Z' },
  { field: 'title', direction: 'desc', label: 'Title Z-A' },
]

function languageForCodeArea(language: string) {
  const l = language.toLowerCase()
  if (l === 'typescript' || l === 'ts') return 'ts'
  if (l === 'javascript' || l === 'js') return 'js'
  if (l === 'json') return 'json'
  if (l === 'html' || l === 'xml') return 'html'
  if (l === 'css' || l === 'scss') return 'css'
  if (l === 'markdown' || l === 'md') return 'md'
  return 'plain'
}

export function App() {
  const [snippets, setSnippets] = useState<Snippet[]>(() => listSnippets())
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('')
  const [code, setCode] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeChips, setActiveChips] = useState<string[]>([])
  const [sort, setSort] = useState<SortDef>(SORTS[0])

  const { copy, copied } = useClipboard()

  const refresh = useCallback(() => {
    setSnippets(listSnippets())
  }, [])

  const saveSnippet = () => {
    const t = title.trim()
    if (!t) {
      setFormError('Title is required')
      return
    }
    if (!code.trim()) {
      setFormError('Code is required')
      return
    }
    addSnippet({ title: t, language: language.trim(), code: code.trim(), tags })
    setTitle('')
    setLanguage('')
    setCode('')
    setTags([])
    setFormError(null)
    refresh()
  }

  const allTags = useMemo(() => {
    const seen = new Set<string>()
    for (const s of snippets) for (const t of s.tags) seen.add(t)
    return Array.from(seen).sort()
  }, [snippets])

  const tagChips = useMemo(
    () => allTags.map((t) => ({ key: t, label: t, field: 'tags', value: t })),
    [allTags],
  )

  const searchResults = useMemo(() => {
    if (!query.trim()) return snippets
    const q = query.toLowerCase()
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [snippets, query])

  const visible = useMemo(() => {
    let list = searchResults
    if (activeChips.length > 0) {
      const set = new Set(activeChips)
      list = list.filter((s) => s.tags.some((t) => set.has(t)))
    }
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...list].sort((a, b) => a.title.localeCompare(b.title) * dir)
  }, [searchResults, activeChips, sort])

  const hasData = snippets.length > 0

  return (
    <AppShell
      name="Code Snippet Manager"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${snippets.length} ${snippets.length === 1 ? 'snippet' : 'snippets'}`}
      status={copied ? 'Copied to clipboard' : undefined}
    >
      {hasData && (
        <Card mono={`${visible.length} shown`} title="Snippets">
          <div className="sm-toolbar">
            <input
              type="text"
              role="searchbox"
              aria-label="Search snippets"
              placeholder="Search snippets"
              className="sm-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <FilterBar
              chips={tagChips}
              activeChips={activeChips}
              onChipsChange={setActiveChips}
              sortOptions={SORTS}
              sort={sort}
              onSortChange={setSort}
            />
          </div>
          {visible.length === 0 ? (
            <EmptyState
              mono="No match"
              title="No snippets match"
              detail="Try a different search or clear the filters."
              actionLabel="Clear search"
              onAction={() => {
                setQuery('')
                setActiveChips([])
              }}
            />
          ) : (
            <List label="Snippets">
              {visible.map((s) => (
                <Row
                  key={s.id}
                  title={s.title}
                  meta={
                    <>
                      {s.language && <Tag>{s.language}</Tag>}
                      {s.tags.map((t) => (
                        <Tag key={t} accent>
                          {t}
                        </Tag>
                      ))}
                    </>
                  }
                  action={
                    <div className="sm-row-actions">
                      <Button kind="ghost" ariaLabel="Copy code" onClick={() => void copy(s.code)}>
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                      <Button kind="ghost" ariaLabel={`Delete ${s.title}`} onClick={() => { removeSnippet(s.id); refresh() }}>
                        Delete
                      </Button>
                    </div>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      )}

      {!hasData && (
        <Card mono="Empty" title="Snippets">
          <EmptyState
            mono="Empty"
            title="No snippets yet"
            detail="Save your first snippet above."
            actionLabel="Save a snippet"
            onAction={() => {
              const el = document.querySelector<HTMLTextAreaElement>('textarea')
              el?.focus()
            }}
          />
        </Card>
      )}

      <Card mono="New" title="Save a snippet">
        <FormGrid>
          <TextInput label="Title" value={title} onChange={setTitle} placeholder="e.g. Debounce helper" />
          <TextInput label="Language" value={language} onChange={setLanguage} placeholder="e.g. TypeScript" />
        </FormGrid>
        <div className="sm-code">
          <CodeArea
            value={code}
            onChange={setCode}
            language={languageForCodeArea(language)}
            ariaLabel="Snippet code"
          />
        </div>
        <div className="sm-tags">
          <TagInput tags={tags} onChange={setTags} placeholder="Add tags and press Enter" aria-label="Tags" />
        </div>
        {formError && <div className="sm-error" role="alert">{formError}</div>}
        <FormGrid>
          <PrimaryButton onClick={saveSnippet} disabled={!title.trim() || !code.trim()}>
            Save snippet
          </PrimaryButton>
        </FormGrid>
      </Card>

    </AppShell>
  )
}
