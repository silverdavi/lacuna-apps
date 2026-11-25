// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState, useCallback } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  SectionLabel,
  Table,
  TextInput,
} from '@lacuna/ui'
import { loadFavorites, saveFavorites } from './host'

const DICT = [
  'silent',
  'enlist',
  'inlets',
  'tinsel',
  'listen',
  'aba',
]

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z]/g, '')
}

function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const ch of word) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
  }
  return counts
}

function isAnagramOf(word: string, target: string): boolean {
  if (word.length !== target.length) return false
  const targetCounts = letterCounts(target)
  for (const ch of word) {
    const c = targetCounts.get(ch) ?? 0
    if (c === 0) return false
    targetCounts.set(ch, c - 1)
  }
  return true
}

function findAnagrams(input: string, includeOriginal: boolean): string[] {
  const target = normalize(input)
  if (!target) return []
  const results: string[] = []
  for (const word of DICT) {
    if (isAnagramOf(word, target)) {
      results.push(word)
    }
  }
  if (includeOriginal) {
    const idx = results.indexOf(target)
    if (idx !== -1) {
      results.splice(idx, 1)
      results.unshift(target)
    }
  } else {
    const idx = results.indexOf(target)
    if (idx !== -1) results.splice(idx, 1)
  }
  return results
}

export function App() {
  const [word, setWord] = useState('')
  const [includeOriginal, setIncludeOriginal] = useState(true)
  const [results, setResults] = useState<string[] | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())
  const [activeTab, setActiveTab] = useState('Results')
  const [copied, setCopied] = useState(false)

  const handleFind = useCallback(() => {
    const found = findAnagrams(word, includeOriginal)
    setResults(found)
    setCopied(false)
  }, [word, includeOriginal])

  const handleCopy = useCallback(async () => {
    if (!results || results.length === 0) return
    const text = results.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable
    }
  }, [results])

  const handleAddFavorite = useCallback(
    (fav: string) => {
      const next = favorites.includes(fav) ? favorites : [...favorites, fav]
      setFavorites(next)
      saveFavorites(next)
    },
    [favorites]
  )

  const handleRemoveFavorite = useCallback(
    (fav: string) => {
      const next = favorites.filter((f) => f !== fav)
      setFavorites(next)
      saveFavorites(next)
    },
    [favorites]
  )

  const hasResults = results !== null && results.length > 0

  return (
    <AppShell
      name="Anagram Solver"
      icon="search"
      hue="rust"
      category="Productivity"
      meta={hasResults ? `${results.length} anagrams` : 'Ready'}
      status={
        activeTab === 'Favorites'
          ? `${favorites.length} saved`
          : hasResults
            ? `${results.length} anagrams found`
            : 'No search yet'
      }
      side={
        <Rail
          title="Anagram Solver"
          note="Dictionary search · favorites saved"
          chips={['Search', 'Copy', 'Favorites', 'Reload-safe']}
        >
          <Card mono="Stats" title="Session">
            <div className="lk-list">
              <div className="lk-row">
                <span className="lk-row-text lk-row-title">Favorites</span>
                <span className="lk-row-meta">{favorites.length}</span>
              </div>
              <div className="lk-row">
                <span className="lk-row-text lk-row-title">Last result</span>
                <span className="lk-row-meta">
                  {results === null ? 'None' : results.length === 0 ? '0 found' : `${results.length} found`}
                </span>
              </div>
            </div>
          </Card>
        </Rail>
      }
    >
      <div role="tablist" className="lc-tabs">
        {['Results', 'Favorites'].map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            className={`as-tab ${activeTab === tab ? 'active' : ''}`}
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Results' && (
        <>
          <Card mono="Search" title="Find anagrams">
            <FormGrid>
              <TextInput
                label="Word or phrase"
                value={word}
                onChange={setWord}
                placeholder="Type a word, e.g. listen"
              />
            </FormGrid>
            <Actions>
              <Checkbox
                label="Include original"
                checked={includeOriginal}
                onChange={setIncludeOriginal}
              />
              <PrimaryButton onClick={handleFind}>Find anagrams</PrimaryButton>
            </Actions>
          </Card>

          {results === null && (
            <Card mono="Results" title="Anagrams">
              <EmptyState
                mono="Ready"
                title="No results yet"
                detail="Type a word and click Find anagrams to see its anagrams."
                actionLabel="Find anagrams"
              />
            </Card>
          )}

          {results !== null && results.length === 0 && (
            <Card mono="Results" title="Anagrams">
              <EmptyState
                mono="None"
                title="No anagrams found"
                detail={`No anagrams found for "${word.trim()}".`}
                actionLabel="Try another word"
              />
            </Card>
          )}

          {hasResults && (
            <Card
              mono={`${results.length} found`}
              title="Anagrams"
              actions={
                <Button kind="secondary" onClick={handleCopy}>
                  {copied ? `Copied ${results.length} anagrams to clipboard` : 'Copy results'}
                </Button>
              }
            >
              <ul className="lk-list" role="list" aria-label="Anagrams">
                {results.map((r) => (
                  <li key={r} className="lk-row" aria-label={r}>
                    <span className="lk-row-text">
                      <span className="lk-row-title">{r}</span>
                    </span>
                    <Button
                      kind="ghost"
                      onClick={() => handleAddFavorite(r)}
                    >
                      Add to favorites
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {activeTab === 'Favorites' && (
        <Card mono={`${favorites.length} saved`} title="Favorites">
          {favorites.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No favorites yet"
              detail="Add a word to your favorites to see it here."
              actionLabel="Go to Results"
            />
          ) : (
            <Table
              label="Favorites"
              columns={[
                { key: 'word', label: 'Word' },
                { key: 'action', label: '' },
              ]}
              rows={favorites.map((fav) => ({
                cells: {
                  word: fav,
                  action: (
                    <Button
                      kind="ghost"
                      ariaLabel={`Remove ${fav}`}
                      onClick={() => handleRemoveFavorite(fav)}
                    >
                      Remove
                    </Button>
                  ),
                },
              }))}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
