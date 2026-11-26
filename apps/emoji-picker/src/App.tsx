import { useMemo, useState } from 'react'
import { AppShell, Button, Card, EmptyState, PrimaryButton, Stack } from '@lacuna/ui'
import { EMOJIS, type Emoji } from './data'
import { loadFavorites, saveFavorites } from './host'

type Tab = 'Search' | 'Favorites'

function search(query: string): Emoji[] {
  const q = query.trim().toLowerCase()
  if (!q) return EMOJIS
  return EMOJIS.filter((e) => {
    const haystack = [e.name, ...(e.keywords ?? [])].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

function writeClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export function App() {
  const [tab, setTab] = useState<Tab>('Search')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())
  const [copied, setCopied] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const results = useMemo(() => search(query), [query])
  const favoriteEmojis = useMemo(
    () => favorites.map((c) => EMOJIS.find((e) => e.char === c)).filter((e): e is Emoji => e != null),
    [favorites],
  )

  function persist(next: string[]) {
    setFavorites(next)
    saveFavorites(next)
  }

  function clearCopiedAfter() {
    window.setTimeout(() => setCopied(null), 1600)
    window.setTimeout(() => setCopiedAll(false), 1600)
  }

  function copyOne(char: string) {
    if (writeClipboard(char)) {
      setCopied(char)
      clearCopiedAfter()
    }
  }

  function copyAll() {
    const text = favoriteEmojis.map((e) => e.char).join('')
    if (!text) return
    if (writeClipboard(text)) {
      setCopiedAll(true)
      clearCopiedAfter()
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && results.length > 0) {
      copyOne(results[0].char)
    }
  }

  function toggleFavorite(char: string) {
    persist(favorites.includes(char) ? favorites.filter((f) => f !== char) : [...favorites, char])
  }

  function removeFavorite(char: string) {
    persist(favorites.filter((f) => f !== char))
  }

  const actionsStyle: React.CSSProperties = { display: 'flex', gap: 'calc(8px * var(--sf))' }

  function title(e: Emoji) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', minWidth: 0 }}>
        <span aria-hidden="true" style={{ fontSize: 'calc(17px * var(--tf))', lineHeight: 1, flexShrink: 0 }}>
          {e.char}
        </span>
        <span>{e.name}</span>
      </span>
    )
  }

  const tabContrast = `
    .lc-tabs .lc-tab { color: var(--ink-60); }
  `

  return (
    <AppShell
      name="Emoji Picker"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={favorites.length ? `${favorites.length} FAV` : 'FRESH'}
      status={favorites.length ? `${favorites.length} favorite${favorites.length === 1 ? '' : 's'} saved` : 'Search, copy and favorite'}
    >
      <style>{tabContrast}</style>
      <Stack>
        <div className="lc-tabs" role="tablist" aria-label="Emoji Picker views">
          {(['Search', 'Favorites'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={cx('lc-tab', tab === t && 'active')}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Search' && (
          <Card title="Search" mono={`${results.length} RESULTS`}>
            <Stack>
              <label className="lc-field">
                <span className="lc-field-label">Search</span>
                <input
                  className="lc-input"
                  type="search"
                  value={query}
                  placeholder={'Try "smile" or "heart"'}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onKeyDown}
                />
              </label>
              {results.length === 0 ? (
                <EmptyState
                  title="No matches"
                  detail="Try a different word."
                  actionLabel="Try a different word"
                  onAction={() => setQuery('')}
                />
              ) : (
                <ul className="lk-list" role="list" aria-label="Results">
                  {results.map((e) => (
                    <li key={e.char} className="lk-row" role="listitem" aria-label={e.name}>
                      <span className="lk-row-text">{title(e)}</span>
                      <span style={actionsStyle}>
                        <Button kind={copied === e.char ? 'primary' : 'secondary'} onClick={() => copyOne(e.char)}>
                          {copied === e.char ? 'Copied' : 'Copy'}
                        </Button>
                        <Button kind="ghost" onClick={() => toggleFavorite(e.char)}>
                          Add to favorites
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
        )}

        {tab === 'Favorites' && (
          <Card
            title="Favorites"
            mono={`${favoriteEmojis.length} SAVED`}
            actions={
              favoriteEmojis.length > 0 ? (
                <PrimaryButton onClick={copyAll}>{copiedAll ? 'Copied all' : 'Copy all'}</PrimaryButton>
              ) : undefined
            }
          >
            <Stack>
              {favoriteEmojis.length === 0 ? (
                <EmptyState
                  title="No favorites yet"
                  detail="Search for an emoji and add it to favorites."
                  actionLabel="Search for an emoji"
                  onAction={() => setTab('Search')}
                />
              ) : (
                <ul className="lk-list" role="list" aria-label="Favorites">
                  {favoriteEmojis.map((e) => (
                    <li key={e.char} className="lk-row" role="listitem" aria-label={e.name}>
                      <span className="lk-row-text">{title(e)}</span>
                      <span style={actionsStyle}>
                        <Button kind={copied === e.char ? 'primary' : 'secondary'} onClick={() => copyOne(e.char)}>
                          {copied === e.char ? 'Copied' : 'Copy'}
                        </Button>
                        <Button kind="danger" onClick={() => removeFavorite(e.char)}>
                          Remove
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
