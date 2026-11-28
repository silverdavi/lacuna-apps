import { Actions, Button, Card, Checkbox, EmptyState, List, Row } from '@lacuna/ui'
import type { CrosswordRecord } from './host/index.ts'
import { allWords } from './generate.ts'
import { formatTime } from './play.ts'

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

interface Props {
  records: CrosswordRecord[]
  onResume: (r: CrosswordRecord) => void
  onPrint: (r: CrosswordRecord) => void
  onDelete: (r: CrosswordRecord) => void
  withAnswers: boolean
  setWithAnswers: (v: boolean) => void
  undo: CrosswordRecord | null
  onUndo: () => void
  onNew: () => void
}

function line(r: CrosswordRecord): string {
  const words = allWords(r.puzzle).length
  const kind = r.puzzle.size === 'custom' ? 'Custom' : r.puzzle.size[0].toUpperCase() + r.puzzle.size.slice(1)
  const prog = r.status === 'solved' ? `Solved in ${formatTime(r.state?.elapsed ?? 0)}` : r.state ? `${formatTime(r.state.elapsed)} played` : 'Not started'
  return `${kind}, ${words} words. ${prog}. ${when(r.updatedAt)}`
}

export function Saved({ records, onResume, onPrint, onDelete, withAnswers, setWithAnswers, undo, onUndo, onNew }: Props) {
  const progress = records.filter((r) => r.status === 'in-progress')
  const custom = records.filter((r) => r.source === 'custom' && r.status !== 'in-progress')
  const solved = records.filter((r) => r.source !== 'custom' && r.status === 'solved')
  const fresh = records.filter((r) => r.source !== 'custom' && r.status === 'new')

  const group = (title: string, mono: string, items: CrosswordRecord[]) =>
    items.length === 0 ? null : (
      <Card mono={mono} title={title}>
        <List label={title}>
          {items.map((r) => (
            <Row
              key={r.id}
              title={r.name}
              meta={line(r)}
              value={r.source === 'daily' ? 'Daily' : undefined}
              action={
                <span className="cw-saved-actions">
                  <Button kind="primary" onClick={() => onResume(r)} ariaLabel={`${r.status === 'in-progress' ? 'Resume' : 'Play'} ${r.name}`}>
                    {r.status === 'in-progress' ? 'Resume' : 'Play'}
                  </Button>
                  <Button onClick={() => onPrint(r)} ariaLabel={`Print ${r.name}`}>
                    Print
                  </Button>
                  <Button kind="ghost" onClick={() => onDelete(r)} ariaLabel={`Delete ${r.name}`}>
                    Delete
                  </Button>
                </span>
              }
            />
          ))}
        </List>
      </Card>
    )

  return (
    <div className="cw-screen">
      {undo ? (
        <Card mono="Deleted" title={undo.name}>
          <Actions>
            <Button onClick={onUndo}>Undo delete</Button>
          </Actions>
        </Card>
      ) : null}
      {records.length === 0 ? (
        <EmptyState mono="Empty" title="Nothing saved yet" detail="Puzzles you start appear here so you can pick them up again. Custom puzzles you save stay until you delete them." actionLabel="New puzzle" onAction={onNew} />
      ) : (
        <>
          <Checkbox label="Print with an answer page" checked={withAnswers} onChange={setWithAnswers} />
          {group('In progress', 'Resume', progress)}
          {group('Custom puzzles', 'Yours', custom)}
          {group('Solved', 'Done', solved)}
          {group('Not started', 'Unplayed', fresh)}
        </>
      )}
    </div>
  )
}
