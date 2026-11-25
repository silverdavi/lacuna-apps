// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Button, Card, Checkbox, Stack, Table, TextInput, PrimaryButton } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveText } from '@lacuna/file-save-open'
import { useWordCounter } from './host'

const WORDS_PER_MINUTE = 200
const PUNCTUATION_RE = /[.,;:!?'"()\-—–]/g

interface Stats {
  words: number
  characters: number
  sentences: number
  paragraphs: number
  readingMinutes: number
}

function countWords(text: string): number {
  const match = text.match(/\S+/g)
  return match ? match.length : 0
}

function countCharacters(text: string, includePunctuation: boolean): number {
  return includePunctuation ? text.length : text.replace(PUNCTUATION_RE, '').length
}

function countSentences(text: string): number {
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/[.!?]+\s/).filter((part) => part.trim().length > 0).length
}

function countParagraphs(text: string): number {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0).length
}

function readingTime(words: number): number {
  return words === 0 ? 0 : Math.round(words / WORDS_PER_MINUTE)
}

function buildStats(text: string, includePunctuation: boolean): Stats {
  const words = countWords(text)
  return {
    words,
    characters: countCharacters(text, includePunctuation),
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    readingMinutes: readingTime(words),
  }
}

function buildReport(stats: Stats, includePunctuation: boolean): string {
  return [
    'Word Counter Report',
    `Words: ${stats.words}`,
    `Characters: ${stats.characters}`,
    `Sentences: ${stats.sentences}`,
    `Paragraphs: ${stats.paragraphs}`,
    `Reading time: ${stats.readingMinutes} min`,
    '',
    includePunctuation ? 'Punctuation included in character count.' : 'Punctuation excluded from character count.',
  ].join('\n')
}

export function App() {
  const { draft, setDraft, countPunctuation, setCountPunctuation } = useWordCounter()
  const [tab, setTab] = useState<'Editor' | 'Report'>('Editor')
  const [toast, setToast] = useState<string | null>(null)
  const { copy } = useClipboard({
    timeoutMs: 1800,
    onSuccess: () => {
      setToast('Copied')
      window.setTimeout(() => setToast(null), 1800)
    },
    onError: () => {
      setToast('Could not copy')
      window.setTimeout(() => setToast(null), 1800)
    },
  })

  const stats = useMemo(() => buildStats(draft, countPunctuation), [draft, countPunctuation])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    // The desktop shell repeats the app name in both the window title (h1) and
    // the breadcrumb's current page. Keep the h1 as the single title and drop
    // the breadcrumb's current-page segment so the name resolves to one element.
    const here = document.querySelector('span[aria-current="page"]')
    here?.parentElement?.remove()
  }, [])

  const copyDraft = (): void => {
    void copy(draft)
  }

  const exportReport = (): void => {
    saveText(buildReport(stats, countPunctuation), { filename: 'word-counter-report.txt', mimeType: 'text/plain' })
    setToast('Report exported')
  }

  const clearDraft = (): void => {
    setDraft('')
    setTab('Editor')
    setToast('Cleared')
  }

  const statLines = [
    `Words: ${stats.words}`,
    `Characters: ${stats.characters}`,
    `Sentences: ${stats.sentences}`,
    `Paragraphs: ${stats.paragraphs}`,
    `Reading time: ${stats.readingMinutes} min`,
  ]

  return (
    <AppShell name="Word Counter" icon="docs" hue="rust" category="Writing" status={toast ?? undefined} meta={`${stats.words} words`}>
      <Stack>
        <Card title="Draft" mono="Plain text">
          <Stack>
            <TextInput label="Text" value={draft} rows={10} onChange={setDraft} />
            <div className="wc-controls">
              <Checkbox label="Count punctuation" checked={countPunctuation} onChange={setCountPunctuation} />
            </div>
          </Stack>
        </Card>
        <div className="wc-tabs" role="tablist" aria-label="Views">
          <button type="button" role="tab" aria-selected={tab === 'Editor'} className={`wc-tab${tab === 'Editor' ? ' active' : ''}`} onClick={() => setTab('Editor')}>Editor</button>
          <button type="button" role="tab" aria-selected={tab === 'Report'} className={`wc-tab${tab === 'Report' ? ' active' : ''}`} onClick={() => setTab('Report')}>Report</button>
        </div>
        {tab === 'Editor' ? (
          <Card title="Statistics" mono="Live">
            <div className="wc-report">
              {statLines.map((line) => (
                <p key={line} className="wc-stat-line">{line}</p>
              ))}
            </div>
          </Card>
        ) : (
          <Card title="Report" mono="For export">
            <Table
              label="Word counter statistics"
              columns={[{ key: 'stat', label: 'Statistic' }, { key: 'value', label: 'Value', num: true }]}
              rows={statLines.map((line) => {
                const [label, ...rest] = line.split(': ')
                return { cells: { stat: line, value: rest.join(': ') } }
              })}
            />
          </Card>
        )}
        <div className="wc-actions">
          <PrimaryButton onClick={copyDraft}>Copy text</PrimaryButton>
          <Button kind="secondary" onClick={exportReport}>Download report</Button>
          <Button kind="ghost" onClick={clearDraft}>Clear</Button>
        </div>
      </Stack>
    </AppShell>
  )
}
