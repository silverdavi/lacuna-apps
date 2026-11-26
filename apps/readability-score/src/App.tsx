import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Checkbox,
  Rail,
  SectionLabel,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { host } from './host'
import { counts, interpret, reportText, scores } from './lib/readability'

type Tab = 'Analyze' | 'History'

type SavedRecord = {
  v: 1
  text: string
  gunningFog: boolean
}

const REPORT_NAME = 'readability-report.txt'

const TABS: Tab[] = ['Analyze', 'History']

const TAB_LIST_STYLE: CSSProperties = {
  display: 'flex',
  gap: 'calc(2px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
}

const tabButtonStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'var(--sans)',
  fontSize: 'calc(12.5px * var(--tf))',
  fontWeight: 600,
  color: active ? 'var(--ink)' : 'var(--ink-80)',
  padding: '0 calc(10px * var(--sf)) calc(10px * var(--sf))',
  border: 'none',
  background: 'none',
  borderBottom: `calc(2px * var(--sf)) solid ${active ? 'var(--accent)' : 'transparent'}`,
  cursor: 'pointer',
})

const scoreValueStyle = (accent: boolean): CSSProperties => ({
  color: accent ? 'var(--ink)' : 'var(--mid)',
  fontWeight: accent ? 600 : 400,
})

export function App() {
  const initial = useMemo(() => host.loadEditor(), [])
  const [tab, setTab] = useState<Tab>('Analyze')
  const [text, setText] = useState(initial.text)
  const [gunningFog, setGunningFog] = useState(initial.gunningFog)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const { set: setRecord } = useLocalRecord<SavedRecord>({
    key: 'lacuna.readability-score.saved',
    version: 1,
    defaultValue: { v: 1, text: '', gunningFog: false },
  })

  useEffect(() => {
    host.saveEditor({ text, gunningFog })
    setRecord({ v: 1, text, gunningFog })
  }, [text, gunningFog, setRecord])

  const stats = useMemo(() => counts(text), [text])

  const sc = useMemo(
    () => scores({ words: stats.words, sentences: stats.sentences, text }),
    [stats, text],
  )

  const lastSaved = useRef(initial.text)

  useEffect(() => {
    if (stats.words === 0) return
    if (lastSaved.current === text) return
    lastSaved.current = text
    host.addAnalysis(text, sc.flesch ?? 0)
    setHistoryVersion((n) => n + 1)
  }, [text, sc, stats.words])

  const history = useMemo(() => host.listAnalyses(), [historyVersion])

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }

  const { copy } = useClipboard()

  async function onCopy() {
    const content = reportText(
      text,
      { words: stats.words, sentences: stats.sentences, text },
      sc,
      gunningFog,
    )
    await copy(content)
    showToast('Report copied to clipboard')
  }

  function onDownload() {
    saveText(
      reportText(
        text,
        { words: stats.words, sentences: stats.sentences, text },
        sc,
        gunningFog,
      ),
      { filename: REPORT_NAME, mimeType: 'text/plain' },
    )
  }

  function onClearHistory() {
    host.clearHistory()
    setHistoryVersion((n) => n + 1)
  }

  const fmt = (value: number | null) => (value === null ? 'n/a' : value.toFixed(1))

  const statRow = (label: string, value: string) => (
    <div
      key={label}
      style={{
        padding: 'calc(7px * var(--sf)) 0',
        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
        fontSize: 'calc(13px * var(--tf))',
        fontFamily: 'var(--mono)',
        color: 'var(--ink)',
      }}
    >
      {label} {value}
    </div>
  )

  return (
    <AppShell
      name="Text Readability Score"
      icon="docs"
      hue="rust"
      category="Productivity"
      meta={stats.words > 0 ? `${stats.words} words` : 'Empty'}
      status={toast ?? undefined}
      side={
        <Rail
          title="Scores"
          note="Scores update as you type"
          chips={['Flesch Reading Ease', 'Flesch-Kincaid Grade', 'SMOG', 'Copy and download the report']}
        >
          <SectionLabel>Quick facts</SectionLabel>
          <Stack>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))', color: 'var(--mid)' }}>
              Reading ease above 80 reads like plain speech; a grade level near zero means a first-grader could follow along.
            </div>
          </Stack>
        </Rail>
      }
    >
      <Stack>
        <div style={TAB_LIST_STYLE} role="tablist" aria-label="Readability views">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              style={tabButtonStyle(tab === t)}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Analyze' ? (
          <Stack>
            <Card mono="Input" title="Passage">
              <div
                style={{
                  fontSize: 'calc(13px * var(--tf))',
                  fontFamily: 'var(--sans)',
                  color: 'var(--mid)',
                }}
              >
                Paste or type the passage you want to score. Scores update as you type.
              </div>
              <div style={{ margin: 'calc(12px * var(--sf)) 0' }}>
                <TextInput
                  label="Input text"
                  value={text}
                  onChange={setText}
                  rows={5}
                  placeholder="The cat sat on the mat."
                />
                <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                  <Checkbox
                    label="Gunning Fog"
                    checked={gunningFog}
                    onChange={setGunningFog}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(8px * var(--sf))',
                  alignItems: 'center',
                }}
              >
                <Button kind="primary" onClick={() => void onCopy()}>
                  Copy report
                </Button>
                <Button onClick={onDownload}>Download .txt</Button>
              </div>
            </Card>

            <Card mono="Counts" title="Text stats">
              {stats.words === 0 ? (
                <div style={{ color: 'var(--mid)', fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))' }}>
                  Nothing to count yet — type or paste a passage above.
                </div>
              ) : (
                <div>
                  {statRow('Words:', String(stats.words))}
                  {statRow('Sentences:', String(stats.sentences))}
                  {statRow('Paragraphs:', String(stats.paragraphs))}
                  {statRow('Characters:', String(stats.characters))}
                </div>
              )}
            </Card>

            <Card mono="Scores" title="Readability">
              {stats.words === 0 ? (
                <div style={{ color: 'var(--mid)', fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))' }}>
                  No scores yet — scores appear once the passage has words.
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'calc(12px * var(--sf))',
                      fontFamily: 'var(--mono)',
                      fontSize: 'calc(15px * var(--tf))',
                    }}
                  >
                    <span style={scoreValueStyle(true)}>
                      Flesch Reading Ease {fmt(sc.flesch)} · Flesch-Kincaid Grade Level {fmt(sc.kincaid)}
                    </span>
                    {gunningFog ? (
                      <span style={scoreValueStyle(false)}>Gunning Fog {fmt(sc.fog)}</span>
                    ) : null}
                    <span style={scoreValueStyle(false)}>SMOG n/a</span>
                  </div>
                  {sc.flesch !== null ? (
                    <div
                      style={{
                        marginTop: 'calc(10px * var(--sf))',
                        fontSize: 'calc(13px * var(--tf))',
                        fontFamily: 'var(--mono)',
                        color: 'var(--mid)',
                      }}
                    >
                      {interpret(sc.flesch)} — plain-speech territory above 80.
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          </Stack>
        ) : (
          <Card
            mono={`${history.length} ${history.length === 1 ? 'analysis' : 'analyses'}`}
            title="Analysis history"
          >
            {history.length === 0 ? (
              <div style={{ color: 'var(--mid)', fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))' }}>
                No analyses yet
              </div>
            ) : (
              <Stack>
                <div style={{ marginBottom: 'calc(8px * var(--sf))' }}>
                  <Button kind="danger" onClick={onClearHistory}>
                    Clear history
                  </Button>
                </div>
                <Table
                  label="Analysis history"
                  columns={[
                    { key: 'text', label: 'Text' },
                    { key: 'flesch', label: 'Flesch', num: true },
                    { key: 'when', label: 'When' },
                  ]}
                  rows={history.map((a) => ({
                    cells: {
                      text: a.text,
                      flesch: a.flesch.toFixed(1),
                      when: new Date(a.at).toLocaleString(),
                    },
                  }))}
                />
              </Stack>
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
