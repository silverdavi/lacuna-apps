import { useEffect, useMemo, useState } from 'react'
import { Actions, Button, Card, Checkbox, EmptyState, ErrorState, Kpi, KpiRow, Stack, TextInput } from '@lacuna/ui'
import { EXAMPLE, parseCustom } from './custom.ts'
import { CUSTOM_MIN_WORDS, allWords, generateCustom } from './generate.ts'
import type { Puzzle } from './generate.ts'
import { Grid } from './Grid.tsx'
import { numberAt } from './play.ts'
import { host } from './host/index.ts'

interface Props {
  onPlay: (p: Puzzle) => void
  onSave: (p: Puzzle) => void
  onPrint: (p: Puzzle) => void
  withAnswers: boolean
  setWithAnswers: (v: boolean) => void
}

export function Custom({ onPlay, onSave, onPrint, withAnswers, setWithAnswers }: Props) {
  const [text, setText] = useState(() => host.readDraft())
  const [title, setTitle] = useState('Custom crossword')
  const [tried, setTried] = useState(false)
  const [built, setBuilt] = useState<{ puzzle: Puzzle; left: string[] } | null>(null)
  const [fail, setFail] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => host.writeDraft(text), [text])
  const parsed = useMemo(() => parseCustom(text), [text])

  const edit = (v: string) => {
    setText(v)
    setBuilt(null)
    setFail(null)
    setSaved(false)
  }

  const run = () => {
    setTried(true)
    setSaved(false)
    if (!parsed.enough) return
    const name = title.trim() || 'Custom crossword'
    const r = generateCustom(parsed.entries, `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`, name)
    if (!r.ok) {
      setBuilt(null)
      setFail(r.reason)
      return
    }
    const placed = new Set(allWords(r.puzzle).map((w) => w.answer))
    setFail(null)
    setBuilt({ puzzle: r.puzzle, left: parsed.entries.filter((e) => !placed.has(e.answer)).map((e) => e.answer) })
  }

  const nums = useMemo(() => (built ? numberAt(built.puzzle) : null), [built])

  return (
    <div className="cw-screen">
      <Card
        mono="Make your own"
        title="Custom crossword"
        actions={
          <Actions>
            <Button kind="primary" onClick={run}>
              Generate
            </Button>
            <Button onClick={() => edit(EXAMPLE)}>Use an example</Button>
          </Actions>
        }
      >
        <Stack>
          <div className="cw-textarea">
            <TextInput
              label="Words and clues"
              rows={10}
              value={text}
              onChange={edit}
              placeholder={'PLANET - World that circles a star\nORBIT: Path of a moon'}
              hint="One per line as WORD - clue or WORD: clue. Words use A to Z, 3 to 13 letters."
            />
          </div>
          <TextInput label="Name" value={title} onChange={(v) => (setTitle(v), setSaved(false))} />
          <KpiRow>
            <Kpi value={String(parsed.entries.length)} label="Valid words" accent />
            <Kpi value={String(parsed.errors.length)} label="Lines to fix" />
          </KpiRow>
          {parsed.errors.length > 0 ? (
            <ul className="cw-issues" aria-label="Lines to fix">
              {parsed.errors.map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          ) : null}
          {tried && !parsed.enough ? (
            <ErrorState title="Add more words" detail={`A puzzle needs at least ${CUSTOM_MIN_WORDS} valid words. You have ${parsed.entries.length}.`} />
          ) : null}
          {fail ? <ErrorState title="Could not cross these words" detail={fail} /> : null}
        </Stack>
      </Card>
      {built && nums ? (
        <Card mono="Preview" title={built.puzzle.title}>
          <Stack>
            <p>
              {allWords(built.puzzle).length} of {parsed.entries.length} words placed in a {built.puzzle.cols} by {built.puzzle.rows} grid.
              {built.left.length ? ` Left out because they would not cross: ${built.left.join(', ')}. Generate again for another layout.` : ''}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <Grid puzzle={built.puzzle} nums={nums} showSolution label="Preview of the generated puzzle" />
            </div>
            <Actions>
              <Button kind="primary" onClick={() => onPlay(built.puzzle)}>
                Play
              </Button>
              <Button
                onClick={() => {
                  onSave(built.puzzle)
                  setSaved(true)
                }}
              >
                Save as a record
              </Button>
              <Button onClick={() => onPrint(built.puzzle)}>Print</Button>
              <Checkbox label="Answer page" checked={withAnswers} onChange={setWithAnswers} />
            </Actions>
            {saved ? <p className="cw-hint" role="status">Saved. Find it under Saved.</p> : null}
          </Stack>
        </Card>
      ) : !fail && parsed.enough ? (
        <EmptyState mono="Ready" title="Generate to see the puzzle" detail="Your list is long enough. Press Generate." />
      ) : null}
    </div>
  )
}
