// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Card, TextInput, PrimaryButton, Button, EmptyState } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { ExportMenu } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'

type Commit = { message: string }

const SECTION_MAP: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  perf: 'Performance',
  test: 'Tests',
  refactor: 'Refactoring',
  chore: 'Chores',
  ci: 'CI',
  style: 'Styles',
}

function parseCommit(message: string): { section: string; text: string } {
  const idx = message.indexOf(':')
  if (idx > 0) {
    const type = message.slice(0, idx).trim().toLowerCase()
    const text = message.slice(idx + 1).trim()
    return { section: SECTION_MAP[type] ?? type, text }
  }
  return { section: 'Other', text: message.trim() }
}

function buildMarkdown(commits: string[], useTaskList: boolean): string {
  const sections = new Map<string, string[]>()
  for (const msg of commits) {
    const { section, text } = parseCommit(msg)
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(text)
  }
  const parts: string[] = []
  for (const [section, texts] of sections) {
    const items = texts.map((t) => (useTaskList ? `- [ ] ${t}` : `- ${t}`))
    parts.push(`## ${section}\n${items.join('\n')}`)
  }
  return parts.join('\n\n')
}

const APP_NAME = 'Changelog Generator'
const EMBEDDED_MARKER = 'lacuna-embedded'

function isEmbeddedHost(): boolean {
  return document.documentElement.dataset[EMBEDDED_MARKER] === 'true'
}

export function App() {
  const [draft, setDraft] = useState('')
  const [useTaskList, setUseTaskList] = useState(true)
  const [generated, setGenerated] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [embedded, setEmbedded] = useState(() => isEmbeddedHost())
  const { state, actions } = useCollection<Commit>({
    storageKey: 'changelog.commits',
  })

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    const el = document.documentElement
    const ro = new MutationObserver(() => setEmbedded(el.dataset[EMBEDDED_MARKER] === 'true'))
    ro.observe(el, { attributes: true, attributeFilter: ['data-lacuna-embedded'] })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const h1 = document.querySelector('h1.name.lk-name')
    if (h1) {
      h1.textContent = ''
      h1.setAttribute('data-name', APP_NAME)
    }
  }, [])

  const messages = useMemo(
    () => state.activeItems.map((item) => item.data.message),
    [state.activeItems],
  )

  const sections = useMemo(() => {
    const map = new Map<string, { idx: number; text: string }[]>()
    let idx = 0
    for (const msg of messages) {
      const { section, text } = parseCommit(msg)
      if (!map.has(section)) map.set(section, [])
      map.get(section)!.push({ idx: idx++, text })
    }
    return { map, order: [...map.keys()] }
  }, [messages])

  const markdown = useMemo(
    () => buildMarkdown(messages, useTaskList),
    [messages, useTaskList],
  )

  const exportData = useMemo(() => {
    return JSON.stringify(
      messages.map((msg) => ({
        message: msg,
        section: parseCommit(msg).section,
      })),
      null,
      2,
    )
  }, [messages])

  function handleCopy() {
    void copy(markdown)
  }

  function addCommit() {
    const msg = draft.trim()
    if (msg === '') return
    actions.add({ message: msg })
    setDraft('')
  }

  function removeCommit(id: string) {
    actions.remove(id)
    setChecked(new Set())
  }



  function toggleTask(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <AppShell
      name="Changelog Generator"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={
        state.activeItems.length > 0
          ? `${state.activeItems.length} commit${state.activeItems.length === 1 ? '' : 's'}`
          : undefined
      }
    >
      <div className="chl-stack">
        <Card title="Commits" mono="input">
          <div className="chl-row">
            <TextInput
              label="Commit message"
              value={draft}
              onChange={setDraft}
              placeholder="feat: add login"
            />
            <PrimaryButton onClick={addCommit} disabled={draft.trim() === ''}>
              Add commit
            </PrimaryButton>
          </div>
          {state.activeItems.length === 0 ? (
            <EmptyState
              title="No commits yet"
              detail="Add commit messages to build your changelog."
              actionLabel="Add a commit"
            />
          ) : generated ? (
            null
          ) : (
            <ul className="chl-commit-list" aria-label="Commits">
              {state.activeItems.map((item) => (
                <li key={item.id} className="chl-commit-item">
                  {item.data.message}
                  <button
                    type="button"
                    className="lc-btn ghost chl-commit-del"
                    aria-label={`Delete ${item.data.message}`}
                    onClick={() => removeCommit(item.id)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Options"
          mono="settings"
          actions={
            <PrimaryButton
              onClick={() => setGenerated(true)}
              disabled={state.activeItems.length === 0}
            >
              Generate changelog
            </PrimaryButton>
          }
        >
          <label className="chl-toggle">
            <input
              type="checkbox"
              checked={useTaskList}
              onChange={(e) => setUseTaskList(e.target.checked)}
            />
            <span>Use task-list items</span>
          </label>
        </Card>

        {generated && sections.map.size > 0 && (
          <div className="chl-changelog">
            <div className="chl-row">
              <Button kind="secondary" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Markdown'}
              </Button>
              <ExportMenu
                options={[
                  {
                    id: 'json',
                    label: 'JSON',
                    mimeType: 'application/json',
                    extension: 'json',
                    getData: () => exportData,
                  },
                ]}
                fileName="changelog"
                ariaLabel="Export"
              />
            </div>
            {sections.order.map((section) => (
              <Card key={section} mono="Changelog">
                <h2 className="chl-section">{section}</h2>
                <ul className="chl-preview-list">
                  {sections.map
                    .get(section)!
                    .map((entry) => (
                      <li key={entry.idx} className="chl-preview-item">
                        <input
                          type="checkbox"
                          checked={checked.has(entry.idx)}
                          aria-label={`Mark ${entry.text}`}
                          onChange={() => toggleTask(entry.idx)}
                        />
                        <span>{entry.text}</span>
                      </li>
                    ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
