import { useEffect, useMemo, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, Kpi, KpiRow, Rail, TextInput } from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { defaultRecord, type RecordData } from './host'

const SUBJECTS = ['Math', 'Science', 'English'] as const
type Subject = (typeof SUBJECTS)[number]

const TAB_ITEMS = ['Gradebook', 'Statistics'] as const

const SUBJECT_ERROR = 'Score must be a number from 0 to 100'

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function rowGradesOf(grades: Record<string, number>, index: number): Record<string, number> {
  const row = `${index + 1}::`
  const out: Record<string, number> = {}
  for (const s of SUBJECTS) {
    const v = grades[`${row}${s}`]
    if (typeof v === 'number' && Number.isFinite(v)) out[s] = v
  }
  return out
}

function rawOf(grades: Record<string, number>, index: number, subject: string): string {
  const v = grades[`${index + 1}::${subject}`]
  return typeof v === 'number' ? String(v) : ''
}

function scoreError(raw: string): string | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? null : SUBJECT_ERROR
}

/** Average of the row's entered scores, two decimals, or '' when none. */
function rowAverage(grades: Record<string, number>): string {
  const values = SUBJECTS.map((s) => grades[s]).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return ''
  return round2(values.reduce((a, b) => a + b, 0) / values.length)
}

export function App() {
  const record = useLocalRecord<RecordData>({
    key: 'lacuna.gradebook.record',
    version: 1,
    defaultValue: defaultRecord(),
  })
  const [view, setView] = useState<string>('Gradebook')
  const [selected, setSelected] = useState(0)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const students = record.value.students
  const grades = record.value.grades

  useEffect(() => {
    if (selected >= students.length) setSelected(Math.max(0, students.length - 1))
  }, [students.length, selected])

  function patch(next: RecordData) {
    record.set(next)
  }

  function setStudentName(index: number, value: string) {
    if (value === students[index]) return
    const row = `${index + 1}::`
    const nextGrades: Record<string, number> = {}
    for (const [key, v] of Object.entries(grades)) {
      if (!key.startsWith(row)) continue
      nextGrades[`${index + 1}::${key.slice(row.length)}`] = v
    }
    for (const [key, v] of Object.entries(grades)) {
      if (!key.startsWith(row)) nextGrades[key] = v
    }
    patch({ students: students.map((n, i) => (i === index ? value : n)), grades: nextGrades })
  }

  function setGrade(index: number, subject: Subject, raw: string) {
    const key = `${index + 1}::${subject}`
    const nextGrades = { ...grades }
    if (raw.trim() === '') delete nextGrades[key]
    else nextGrades[key] = Number(raw)
    patch({ students, grades: nextGrades })
  }

  function addStudent() {
    patch({ students: [...students, ''], grades })
    setSelected(students.length)
  }

  function deleteStudent() {
    if (selected < 0 || selected >= students.length) return
    const gone = selected + 1
    const nextGrades: Record<string, number> = {}
    for (const [key, v] of Object.entries(grades)) {
      const sep = key.indexOf('::')
      if (sep < 0) continue
      const rowNum = Number(key.slice(0, sep))
      const subject = key.slice(sep + 2)
      if (!Number.isInteger(rowNum) || !SUBJECTS.includes(subject as Subject)) continue
      if (rowNum === gone) continue
      nextGrades[`${rowNum > gone ? rowNum - 1 : rowNum}::${subject}`] = v
    }
    patch({
      students: students.filter((_, i) => i !== selected),
      grades: nextGrades,
    })
    setSelected(Math.min(selected, students.length - 2))
  }

  function exportCsv() {
    void copy(
      toCsv([
        ['Student', ...SUBJECTS, 'Average'],
        ...students.map((name, i) => {
          const row = rowGradesOf(grades, i)
          return [
            name,
            ...SUBJECTS.map((s) => (row[s] != null ? String(row[s]) : '')),
            rowAverage(row),
          ]
        }),
      ]),
    )
  }

  const stats = useMemo(() => {
    const values = Object.values(grades).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (values.length === 0) return null
    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      highest: Math.max(...values),
      lowest: Math.min(...values),
      median: median(values),
    }
  }, [grades])

  const filledStudents = students.filter((n) => n.trim() !== '').length

  type CellKey = 'student' | 'Math' | 'Science' | 'English' | 'Average'
  const columns: { key: CellKey; label: string; num?: boolean }[] = [
    { key: 'student', label: 'Student' },
    { key: 'Math', label: 'Math', num: true },
    { key: 'Science', label: 'Science', num: true },
    { key: 'English', label: 'English', num: true },
    { key: 'Average', label: 'Average', num: true },
  ]

  const tableRows = students.map((name, i) => {
    const rowGrades = rowGradesOf(grades, i)
    const avg = rowAverage(rowGrades)
    return {
      hot: selected === i,
      cells: {
        student: (
          <span className="gb-cell">
            <TextInput
              label="Student"
              value={name}
              onChange={(v) => setStudentName(i, v)}
              placeholder="Name"
            />
            <Button
              kind={selected === i ? 'ink' : 'ghost'}
              aria-pressed={selected === i}
              ariaLabel={name ? `Select ${name}` : `Select row ${i + 1}`}
              onClick={() => setSelected(i)}
            >
              {name ? `Select ${name}` : `Select row ${i + 1}`}
            </Button>
          </span>
        ),
        Math: (
          <TextInput
            label="Math"
            value={rowGrades.Math != null ? String(rowGrades.Math) : ''}
            onChange={(v) => setGrade(i, 'Math', v)}
            inputMode="decimal"
            placeholder="0"
            error={scoreError(rawOf(grades, i, 'Math'))}
          />
        ),
        Science: (
          <TextInput
            label="Science"
            value={rowGrades.Science != null ? String(rowGrades.Science) : ''}
            onChange={(v) => setGrade(i, 'Science', v)}
            inputMode="decimal"
            placeholder="0"
            error={scoreError(rawOf(grades, i, 'Science'))}
          />
        ),
        English: (
          <TextInput
            label="English"
            value={rowGrades.English != null ? String(rowGrades.English) : ''}
            onChange={(v) => setGrade(i, 'English', v)}
            inputMode="decimal"
            placeholder="0"
            error={scoreError(rawOf(grades, i, 'English'))}
          />
        ),
        Average: avg ? <span className="gc-avg has">{avg}</span> : <span className="gc-empty-cell" aria-hidden="true">&nbsp;</span>,
      },
    }
  })

  return (
    <AppShell
      name="Gradebook Manager"
      icon="sheets"
      hue="green"
      category="Productivity"
      meta={`${filledStudents} of ${students.length} students`}
      status={stats ? `${stats.count} scores` : 'No scores yet'}
      side={
        <Rail
          title="Gradebook"
          note="Scores, averages and statistics"
          chips={['Add students and scores', 'Averages per row', 'Class statistics', 'Export CSV to clipboard']}
        />
      }
    >
      <div className="lc-tabs" role="tablist">
        {TAB_ITEMS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            className={`lc-tab gc-tab${view === item ? ' active' : ''}`}
            onClick={() => setView(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {view === 'Gradebook' ? (
        <Card mono="Table" title="Grades">
          <div className="gc-header-strip" role="presentation">
            {columns.map((c) => (
              <div
                key={c.key}
                role="row"
                className={c.key === 'student' ? 'gc-header-cell gc-name' : 'gc-header-cell'}
              >
                {c.key === 'student' ? c.label : <span aria-hidden="true">{c.label}</span>}
              </div>
            ))}
          </div>
          <table className="lc-table gc-grades" aria-label="Grades">
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className={r.hot ? 'hot' : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.num ? 'num' : undefined} data-label={c.label}>
                      {r.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Actions>
            <Button kind="primary" onClick={addStudent}>
              Add Student
            </Button>
            <Button kind="danger" onClick={deleteStudent} disabled={students.length === 0}>
              Delete Student
            </Button>
          </Actions>
        </Card>
      ) : (
        <Card mono="Stats" title="Class statistics">
          {stats ? (
            <>
              <KpiRow>
                <Kpi value={`Class Average: ${round2(stats.avg)}`} label="All scores" accent />
                <Kpi value={`Highest: ${stats.highest}`} label="Top score" />
                <Kpi value={`Lowest: ${stats.lowest}`} label="Bottom score" />
                <Kpi value={`Median: ${round2(stats.median)}`} label="Middle score" />
              </KpiRow>
              <Actions>
                <Button kind="primary" onClick={exportCsv}>
                  Export CSV
                </Button>
                {copied ? <span className="gc-copied" role="status">Copied to clipboard</span> : null}
              </Actions>
            </>
          ) : (
            <EmptyState
              mono="Empty"
              title="No scores yet"
              detail="Record a score in the Gradebook tab to see the class figures."
              actionLabel="Open the Gradebook tab"
              onAction={() => setView('Gradebook')}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
