import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, Keys, Kpi, KpiRow, List, Rail, Row, Stack, TextInput } from '@lacuna/ui'
import { openFile, saveText } from '@lacuna/file-save-open'
import { host } from './host'
import { newScript } from './host/mock'
import type { Prefs, ScriptRecord } from './host'
import { KEY_MAP, Prompter } from './Prompter'
import { formatEstimate, parseScript, readSeconds } from './script'

const FORMAT_KEYS: [string, string][] = [
  ['## Title `1:30`', 'Start a section, with an optional target time'],
  ['> text', 'A cue, shown small under the next line'],
  ['[text]', 'A stage direction: dim, never counted as words'],
  ['Blank line', 'Ends a paragraph; each paragraph is one line to read'],
]

const label = (r: ScriptRecord) => r.name.trim() || 'Untitled script'
const slug = (r: ScriptRecord) => label(r).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'script'

export function App() {
  const [scripts, setScripts] = useState<ScriptRecord[]>(() => host.readScripts())
  const [prefs, setPrefs] = useState<Prefs>(() => host.readPrefs())
  const [selected, setSelected] = useState<string | null>(() => scripts[0]?.id ?? null)
  const [reading, setReading] = useState(false)
  const [removed, setRemoved] = useState<{ rec: ScriptRecord; at: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => host.writeScripts(scripts), [scripts])
  useEffect(() => host.writePrefs(prefs), [prefs])

  const rec = scripts.find((s) => s.id === selected) ?? null
  const parsedAll = useMemo(() => new Map(scripts.map((s) => [s.id, parseScript(s.text)])), [scripts])
  const parsed = rec ? parsedAll.get(rec.id) ?? null : null

  const patch = (id: string, change: Partial<ScriptRecord>) =>
    setScripts((list) => list.map((s) => (s.id === id ? { ...s, ...change } : s)))
  const edit = (change: Partial<ScriptRecord>) => rec && patch(rec.id, { ...change, updated: Date.now() })

  const add = (name: string, text: string, from?: ScriptRecord) => {
    const made = { ...newScript(name, text), ...(from ? { mode: from.mode, wpm: from.wpm, size: from.size, mirror: from.mirror, flip: from.flip } : {}) }
    setScripts((list) => [made, ...list])
    setSelected(made.id)
    setRemoved(null)
  }

  const remove = (s: ScriptRecord) => {
    const at = scripts.findIndex((x) => x.id === s.id)
    setScripts((list) => list.filter((x) => x.id !== s.id))
    setRemoved({ rec: s, at })
    if (selected === s.id) setSelected(scripts.find((x) => x.id !== s.id)?.id ?? null)
  }

  const undo = () => {
    if (!removed) return
    const { rec: back, at } = removed
    setScripts((list) => [...list.slice(0, at), back, ...list.slice(at)])
    setSelected(back.id)
    setRemoved(null)
  }

  const importFiles = async (files: FileList | File[]) => {
    setError(null)
    let failed = 0
    for (const f of Array.from(files)) {
      if (!/\.(txt|md|markdown|text)$/i.test(f.name) && !f.type.startsWith('text/')) {
        failed++
        continue
      }
      const result = await openFile(f, 'text')
      if (result.ok && typeof result.data === 'string') add(f.name.replace(/\.[^.]+$/, '') || 'Imported script', result.data)
      else failed++
    }
    if (failed) setError(`${failed} ${failed === 1 ? 'file was' : 'files were'} not read. Import .txt or .md text files.`)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files)
  }

  const words = parsed?.words ?? 0

  return (
    <>
      <AppShell
        name="Teleprompter"
        icon="docs"
        hue="rust"
        category="Create"
        meta={`${scripts.length} ${scripts.length === 1 ? 'script' : 'scripts'}`}
        side={
          <Rail title="Scripts" note="Saved on this device">
            <div
              className={`tp-lib${dropping ? ' drop' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDropping(true)
              }}
              onDragLeave={() => setDropping(false)}
              onDrop={onDrop}
            >
              <Actions>
                <Button kind="primary" onClick={() => add('Untitled script', '')}>
                  New script
                </Button>
                <Button onClick={() => fileRef.current?.click()}>Import</Button>
              </Actions>
              <input
                ref={fileRef}
                type="file"
                hidden
                multiple
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                aria-label="Import script files"
                onChange={(e) => {
                  if (e.target.files) void importFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              {scripts.length === 0 ? (
                <EmptyState mono="Empty" title="No scripts yet" detail="Start a script, or drop a .txt or .md file here." />
              ) : (
                <List label="Scripts">
                  {scripts.map((s) => {
                    const w = parsedAll.get(s.id)?.words ?? 0
                    return (
                      <Row
                        key={s.id}
                        hot={s.id === selected}
                        title={label(s)}
                        meta={`${w} words · ${formatEstimate(readSeconds(w, s.wpm))}`}
                        onClick={() => setSelected(s.id)}
                        action={
                          <span className="tp-row-actions">
                            <Button kind="ghost" ariaLabel={`Duplicate ${label(s)}`} onClick={() => add(`${label(s)} copy`, s.text, s)}>
                              Duplicate
                            </Button>
                            <Button kind="ghost" ariaLabel={`Delete ${label(s)}`} onClick={() => remove(s)}>
                              Delete
                            </Button>
                          </span>
                        }
                      />
                    )
                  })}
                </List>
              )}
              {removed ? (
                <div className="tp-undo" role="status">
                  <span>Deleted {label(removed.rec)}.</span>
                  <Button kind="ghost" onClick={undo}>
                    Undo
                  </Button>
                </div>
              ) : null}
              {error ? (
                <div className="tp-undo" role="alert">
                  {error}
                </div>
              ) : null}
            </div>
          </Rail>
        }
      >
        {rec ? (
          <Card
            mono="Editor"
            title={label(rec)}
            actions={
              <Actions>
                <Button kind="primary" onClick={() => setReading(true)}>
                  Rehearse
                </Button>
                <Button onClick={() => saveText(rec.text, { filename: `${slug(rec)}.txt`, mimeType: 'text/plain' })}>Export .txt</Button>
              </Actions>
            }
          >
            <Stack>
              <TextInput label="Name" value={rec.name} onChange={(v) => edit({ name: v })} />
              <TextInput label="Script" value={rec.text} onChange={(v) => edit({ text: v })} rows={14} placeholder="Paste or type your script. A blank line starts a new line to read." />
              <KpiRow>
                <Kpi value={String(words)} label="Words" accent />
                <Kpi value={formatEstimate(readSeconds(words, rec.wpm))} label={`At ${rec.wpm} wpm`} />
                <Kpi value={String(parsed?.sections.filter((s) => s.title).length || 1)} label="Sections" />
              </KpiRow>
              <details className="tp-help">
                <summary>Format help</summary>
                <Stack>
                  <Keys items={FORMAT_KEYS} />
                  <p className="tp-help-note">Text with no markers is one section.</p>
                </Stack>
              </details>
              <details className="tp-help">
                <summary>Keys while reading</summary>
                <Keys items={KEY_MAP} />
              </details>
            </Stack>
          </Card>
        ) : (
          <Card mono="Editor" title="Teleprompter">
            <EmptyState mono="Empty" title="No scripts yet" detail="Start a script or import a text file to rehearse it full-screen." actionLabel="New script" onAction={() => add('Untitled script', '')} />
          </Card>
        )}
      </AppShell>
      {reading && rec ? (
        <Prompter
          key={rec.id}
          rec={rec}
          prefs={prefs}
          onRec={(change) => patch(rec.id, change)}
          onPrefs={(change) => setPrefs((p) => ({ ...p, ...change }))}
          onExit={() => setReading(false)}
        />
      ) : null}
    </>
  )
}
