// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { ExportMenu } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { exportBackup, importBackup } from '@lacuna/json-backup'

type Commit = { message: string }

const APP_ID = 'lacuna.changelog'
const BACKUP_VERSION = 1

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

function ActivityBars({ counts }: { counts: { label: string; value: number }[] }) {
  const width = 300
  const height = 96
  const padX = 8
  const padTop = 10
  const padBottom = 18
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const max = Math.max(1, ...counts.map((c) => c.value))
  const n = counts.length
  const gap = n > 1 ? 10 : 0
  const bw = n > 1 ? (innerW - gap * (n - 1)) / n : innerW
  const bars = counts.map((c, i) => {
    const x = padX + i * (bw + gap)
    const h = (c.value / max) * innerH
    const y = padTop + innerH - h
    return { x, y, w: bw, h, ...c }
  })
  return (
    <div>
      <MonoLabel sm>BY SECTION</MonoLabel>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Commits per section"
        style={{ display: 'block', marginTop: 'calc(8px * var(--sf))' }}
      >
        {bars.map((b) => (
          <g key={b.label}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill="var(--accent)"
              fillOpacity={b.value === 0 ? 0 : 0.85}
              rx="2"
            />
            <text
              x={b.x + b.w / 2}
              y={b.y - 4}
              textAnchor="middle"
              fontSize="calc(9px * var(--tf))"
              fill="var(--ink-60)"
              fontFamily="var(--mono)"
            >
              {b.value}
            </text>
            <text
              x={b.x + b.w / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize="calc(8px * var(--tf))"
              fill="var(--ink-40)"
              fontFamily="var(--mono)"
            >
              {b.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
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
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

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

  const breakdown = useMemo(
    () =>
      sections.order.map((section) => ({
        label: section,
        value: sections.map.get(section)!.length,
      })),
    [sections],
  )

  const exportData = useMemo(
    () =>
      JSON.stringify(
        messages.map((msg) => ({
          message: msg,
          section: parseCommit(msg).section,
        })),
        null,
        2,
      ),
    [messages],
  )

  const backupText = () =>
    exportBackup<Commit>({
      appId: APP_ID,
      version: BACKUP_VERSION,
      filename: 'changelog',
      records: state.activeItems.map((item) => ({
        id: item.id,
        data: { message: item.data.message },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    })

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

  function pickImport() {
    importInputRef.current?.click()
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      setImportFile(text)
      const result = importBackup<Commit>(text, {
        currentVersion: BACKUP_VERSION,
        validate: (record) =>
          typeof record.data?.message === 'string' && record.data.message.trim() !== ''
            ? null
            : 'missing message',
      })
      if (result.records.length === 0) {
        setImportMsg('No valid commits found in that file.')
        return
      }
      const seen = new Set(state.activeItems.map((item) => item.id))
      let added = 0
      for (const record of result.records) {
        if (seen.has(record.id)) continue
        seen.add(record.id)
        actions.add({ message: record.data.message })
        added += 1
      }
      setImportMsg(added > 0 ? `Imported ${added} new commit${added === 1 ? '' : 's'}.` : 'Those commits are already in your list.')
    } catch {
      setImportMsg('Could not read that file.')
    }
  }

  function toggleTask(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const count = state.activeItems.length
  const chips = breakdown.slice(0, 3).map((b) => `${b.label}: ${b.value}`)

  return (
    <AppShell
      name="Changelog Generator"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={
        count > 0
          ? `${count} commit${count === 1 ? '' : 's'}`
          : undefined
      }
      status={
        count > 0
          ? `${count} commit${count === 1 ? '' : 's'} · ${sections.order.length} section${sections.order.length === 1 ? '' : 's'}${copied ? ' · copied' : ''}`
          : 'Ready · add a commit to start'
      }
      side={
        <Rail
          note={`Commit messages · ${sections.order.length} section${sections.order.length === 1 ? '' : 's'}`}
          chips={chips.length > 0 ? chips : ['No sections yet']}
        >
          {count > 0 ? (
            <div style={{ display: 'grid', gap: 'calc(8px * var(--sf))' }}>
              <KpiRow>
                <Kpi value={String(count)} label="Commits" accent />
                <Kpi value={String(sections.order.length)} label="Sections" />
              </KpiRow>
              {useTaskList && (
                <Kpi
                  value={`${checked.size}/${count}`}
                  label="Marked done"
                />
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 'calc(12px * var(--sf))', color: 'var(--ink-60)' }}>
              Add commit messages to see a per-section breakdown here.
            </p>
          )}
        </Rail>
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
            <Button kind="primary" onClick={addCommit} disabled={draft.trim() === ''}>
              Add commit
            </Button>
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
            <Button
              kind="primary"
              onClick={() => setGenerated(true)}
              disabled={state.activeItems.length === 0}
            >
              Generate changelog
            </Button>
          }
        >
          <div className="chl-toggle">
            <input
              type="checkbox"
              id="chl-tasklist"
              checked={useTaskList}
              onChange={(e) => setUseTaskList(e.target.checked)}
            />
            <label htmlFor="chl-tasklist">Use task-list items</label>
          </div>
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
                  {
                    id: 'backup',
                    label: 'Full backup',
                    mimeType: 'application/json',
                    extension: 'json',
                    getData: () => backupText(),
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

        {!generated && (
          <Card title="Activity" mono="stats">
            {count === 0 ? (
              <p className="chl-muted">Add commits to see how they split across sections.</p>
            ) : (
              <ActivityBars counts={breakdown} />
            )}
          </Card>
        )}

        <Card title="Import & backup" mono="data">
          <p className="chl-muted">Merge commits from a previous JSON backup. Imports add new commits without duplicating ones you already have.</p>
          <div className="chl-row">
            <Button kind="secondary" onClick={pickImport}>
              Import backup
            </Button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            aria-hidden
            tabIndex={-1}
            onChange={onImportFile}
          />
          {importMsg && <p className="chl-muted">{importMsg}</p>}
        </Card>
      </div>
    </AppShell>
  )
}
