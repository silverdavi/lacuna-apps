import { useEffect, useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  List,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type HistoryEntry } from './host'

const TABS = ['Test', 'History'] as const
type Tab = (typeof TABS)[number]

interface MatchLine {
  index: number
  text: string
  groups: { name: string; value: string }[]
}

function runMatches(
  pattern: string,
  flags: string,
  text: string,
  caseInsensitive: boolean,
): { lines: MatchLine[]; error: string | null } {
  let re: RegExp
  try {
    const effectiveFlags = caseInsensitive && !flags.includes('i') ? flags + 'i' : flags
    re = new RegExp(pattern, effectiveFlags)
  } catch (err) {
    return { lines: [], error: err instanceof Error ? err.message : 'Invalid regular expression' }
  }
  const lines: MatchLine[] = []
  if (re.flags.includes('g') || re.flags.includes('y')) {
    for (const m of text.matchAll(re)) {
      lines.push(toLine(m, re))
      if (lines.length >= 1000) break
    }
  } else {
    const m = re.exec(text)
    if (m) lines.push(toLine(m, re))
  }
  return { lines, error: null }
}

function toLine(m: RegExpExecArray, re: RegExp): MatchLine {
  const groupNames = re.source.match(/\\<([A-Za-z_$][\w$]*)\>/g)?.map((g) => g.slice(2, -1)) ?? []
  const groups: { name: string; value: string }[] = []
  for (let i = 1; i < m.length; i++) {
    if (m[i] == null) continue
    groups.push({ name: groupNames[i - 1] ?? String(i), value: String(m[i]) })
  }
  return { index: m.index, text: m[0], groups }
}

export function App() {
  const [pattern, setPattern] = useState(() => host.state().pattern)
  const [caseInsensitive, setCaseInsensitive] = useState(false)
  const [flags, setFlags] = useState(() => host.state().flags)
  const [text, setText] = useState(() => host.state().text)
  const [tab, setTab] = useState<Tab>('Test')
  const [history, setHistory] = useState<HistoryEntry[]>(() => host.history())
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    host.saveState({ pattern, flags, text })
  }, [pattern, flags, text])

  useEffect(() => {
    host.saveHistory(history)
  }, [history])

  const result = useMemo(
    () => runMatches(pattern, flags, text, caseInsensitive),
    [pattern, flags, text, caseInsensitive],
  )
  const error = result.error
  const lines = result.lines
  const matchesReady = !error && lines.length > 0

  const savePattern = () => {
    setHistory((prev) => {
      const kept = prev.filter((e) => e.pattern !== pattern || e.flags !== flags)
      return [{ pattern, flags, matches: lines.length }, ...kept].slice(0, 50)
    })
    setTab('History')
  }

  const deletePattern = (entry: HistoryEntry) => {
    setHistory((prev) => prev.filter((e) => e !== entry))
  }

  const copyResult = () => {
    void copy(lines.map((line) => line.text).join('\n'))
  }

  const flagsLabel = flags === '' ? 'no flags' : flags

  return (
    <AppShell
      name="Regex Tester"
      icon="search"
      hue="blue"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'pattern' : 'patterns'} saved`}
      status={
        error
          ? `Pattern error: ${error}`
          : tab === 'Test'
            ? `Ready · ${flagsLabel} · sample ${text.length} chars`
            : `Library · ${history.length} ${history.length === 1 ? 'pattern' : 'patterns'}`
      }
      side={
        <Rail
          title="Pattern"
          chips={[
            `Flags: ${flagsLabel}`,
            `Case ${caseInsensitive ? 'insensitive' : 'sensitive'}`,
            `Sample ${text.length} chars`,
          ]}
        />
      }
    >
      <div role="tablist" aria-label="Sections" className="lc-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'lc-tab active' : 'lc-tab'}
            style={tab === t ? undefined : { color: 'var(--ink-60)' }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <Stack lg>
        {tab === 'Test' ? (
          <>
            <Card mono="TEST" title="Test a pattern">
              <FormGrid>
                <TextInput
                  label="Pattern"
                  value={pattern}
                  onChange={setPattern}
                  placeholder="Type a regular expression"
                />
                <TextInput
                  label="Sample text"
                  value={text}
                  onChange={setText}
                  placeholder="Paste text to test against"
                />
                <TextInput label="Flags" value={flags} onChange={setFlags} placeholder="gim" />
                <Checkbox
                  label="Case insensitive"
                  checked={caseInsensitive}
                  onChange={setCaseInsensitive}
                />
              </FormGrid>
              <Actions>
                <Button kind="primary" onClick={savePattern} disabled={!pattern}>
                  Save pattern
                </Button>
                <Button kind="ghost" onClick={copyResult} disabled={!matchesReady}>
                  {copied ? 'Copied' : 'Copy result'}
                </Button>
              </Actions>
            </Card>

            <Card
              title="Results"
              mono="MATCHES"
              actions={
                <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>
                  {error ? 'No matches' : `Matches: ${lines.length}`}
                </span>
              }
            >
              {error ? (
                <EmptyState title="Invalid pattern" detail={error} actionLabel="Fix the pattern" />
              ) : !matchesReady ? (
                <EmptyState
                  title="No matches"
                  detail="No part of the sample text matches this pattern."
                  actionLabel="Try a different pattern"
                />
              ) : (
                <List label="Matches">
                  {lines.map((line, i) => {
                    const groups = line.groups.map((g) => `Group ${g.name}: ${g.value}`).join(' · ')
                    const meta = groups ? `position ${line.index} · ${groups}` : `position ${line.index}`
                    return <Row key={`${line.index}-${i}`} title={line.text} meta={meta} />
                  })}
                </List>
              )}
            </Card>
          </>
        ) : (
          <Card mono="HISTORY" title="Saved patterns">
            {history.length === 0 ? (
              <EmptyState
                title="No saved patterns"
                detail="Save a pattern on the Test tab to keep it here."
                actionLabel="Test a pattern"
              />
            ) : (
              <List label="Saved patterns">
                {history.map((entry) => (
                  <Row
                    key={`tab-${entry.pattern}-${entry.flags}`}
                    title={entry.pattern}
                    meta={`${entry.flags === '' ? 'no flags' : entry.flags} · ${entry.matches}`}
                    action={
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${entry.pattern}`}
                        onClick={() => deletePattern(entry)}
                      >
                        Delete
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
