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
  const [copied, setCopied] = useState(false)
  const { copy } = useClipboard()

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

  const copyResult = async () => {
    try {
      await copy(lines.map((line) => line.text).join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable: the button simply does not flip to "Copied".
    }
  }

  return (
    <AppShell
      name="Regex Tester"
      icon="search"
      hue="rust"
      category="Productivity"
    >
      <div role="tablist" aria-label="Sections" className="lc-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="lc-tab"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
      {tab === 'Test' ? (
        <Stack lg>
          <Card mono="TEST" title="Test a pattern">
            <FormGrid>
              <TextInput label="Pattern" value={pattern} onChange={setPattern} placeholder="Type a regular expression" />
              <TextInput label="Sample text" value={text} onChange={setText} rows={5} placeholder="Paste text to test against" />
              <TextInput label="Flags" value={flags} onChange={setFlags} placeholder="gim" />
              <Checkbox label="Case insensitive" checked={caseInsensitive} onChange={setCaseInsensitive} />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={savePattern} disabled={!pattern}>
                Save pattern
              </Button>
              <Button kind="ghost" onClick={() => void copyResult()} disabled={!matchesReady}>
                Copy result
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
              <EmptyState title="No matches" detail="No part of the sample text matches this pattern." actionLabel="Try a different pattern" />
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
        </Stack>
      ) : (
        <Card mono="HISTORY" title="Saved patterns">
          {history.length === 0 ? (
            <EmptyState title="No saved patterns" detail="Save a pattern on the Test tab to keep it here." actionLabel="Test a pattern" />
          ) : (
            <List label="Saved patterns">
              {history.map((entry) => (
                <Row
                  key={`tab-${entry.pattern}-${entry.flags}`}
                  title={entry.pattern}
                  meta={`${entry.flags} · ${entry.matches}`}
                  action={
                    <Button kind="ghost" ariaLabel={`Delete ${entry.pattern}`} onClick={() => deletePattern(entry)}>
                      Delete
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      )}
      </div>
      {copied && (
        <div role="status" style={{ position: 'fixed', bottom: 'calc(18px * var(--sf))', right: 'calc(18px * var(--sf))', padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: '6px', fontFamily: 'var(--mono)', fontSize: 'calc(10.5px * var(--tf))' }}>
          Copied
        </div>
      )}
    </AppShell>
  )
}
