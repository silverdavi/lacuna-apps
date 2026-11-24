// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AppShell, Button, Card, EmptyState, Kpi, KpiRow, PrimaryButton, Rail } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { gradeRecord } from './host'
import './gradebook.css'

const ASSIGNMENTS = ['Math', 'Science', 'English'] as const
const TABS = ['Gradebook', 'Statistics', 'Export CSV'] as const

export interface RecordData {
  students: string[]
  grades: Record<string, Record<string, number | null>>
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function fmt(n: number | null): string {
  return n == null ? 'n/a' : n.toFixed(2)
}

function fmtStat(n: number | null): string {
  return n == null ? 'n/a' : String(Math.round(n))
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function parseGrade(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  const v = Number(t)
  if (Number.isNaN(v)) return null
  return v
}

function toCSV(students: string[], grades: Record<string, Record<string, number | null>>): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const header = ['Student', ...ASSIGNMENTS, 'Average'].map(cell).join(',')
  const lines = students.map((s) => {
    const values = ASSIGNMENTS.map((a) => grades[s]?.[a] ?? null)
    const avg = mean(values.filter((v): v is number => v != null))
    return [
      s,
      ...values.map((v) => (v == null ? '' : String(v))),
      avg?.toFixed(2) ?? '',
    ].map(cell).join(',')
  })
  return [header, ...lines].join('\n')
}

function normalize(raw: RecordData): RecordData {
  const students = raw.students.length === 0 ? [''] : [...raw.students]
  if (!students.includes('')) students.push('')
  return { students, grades: { ...raw.grades } }
}

function TabBar({ active, onSelect }: { active: string; onSelect: (value: string) => void }) {
  const [focused, setFocused] = useState(0)

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let next = -1
    if (e.key === 'ArrowRight') next = (focused + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (focused - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next === -1) return
    e.preventDefault()
    setFocused(next)
    onSelect(TABS[next])
    document.getElementById(`tab-${TABS[next]}`)?.focus()
  }

  return (
    <div
      className="gb-tabs"
      role="tablist"
      aria-label="Gradebook views"
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      {TABS.map((item, i) => (
        <button
          key={item}
          type="button"
          id={`tab-${item}`}
          role="tab"
          aria-selected={item === active}
          aria-controls={`panel-${item}`}
          tabIndex={item === active ? 0 : -1}
          className={item === active ? 'gb-tab active' : 'gb-tab'}
          onClick={() => {
            setFocused(i)
            onSelect(item)
          }}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function App() {
  const [data, setData] = useState<RecordData>(() => normalize(gradeRecord.get()))
  const [tab, setTab] = useState('Gradebook')
  const [selected, setSelected] = useState<number | null>(null)
  const clipboard = useClipboard()

  function update(next: RecordData) {
    setData(next)
    gradeRecord.set(next)
  }

  function addStudent() {
    const students = [...data.students]
    if (students[students.length - 1] === '') {
      setSelected(students.length - 1)
      return
    }
    students.push('')
    setSelected(students.length - 1)
    update({ ...data, students })
  }

  function setStudentName(index: number, name: string) {
    const oldName = data.students[index]
    let students = data.students.map((s, i) => (i === index ? name : s))
    const grades = { ...data.grades }
    if (oldName !== name && oldName !== '' && grades[oldName]) {
      grades[name] = { ...(grades[name] ?? {}), ...grades[oldName] }
      delete grades[oldName]
    }
    if (index === students.length - 1 && name !== '' && students.length === 1) {
      students = [...students, '']
    }
    update({ students, grades })
  }

  function gradeText(row: number, assignment: string): string {
    const student = data.students[row]
    if (student === '') return ''
    const v = data.grades[student]?.[assignment]
    return v == null ? '' : String(v)
  }

  function setGrade(row: number, assignment: string, text: string) {
    const student = data.students[row]
    if (student === '') return
    const grades = { ...data.grades }
    const studentGrades = { ...(grades[student] ?? {}) }
    studentGrades[assignment] = parseGrade(text)
    grades[student] = studentGrades
    update({ ...data, grades })
  }

  function removeStudent() {
    const students = [...data.students]
    let idx = selected
    if (idx == null || students[idx] === '') {
      idx = students.findIndex((s) => s !== '')
    }
    if (idx === -1) return
    const removed = students.splice(idx, 1)[0]
    if (!students.includes('')) students.push('')
    const grades = { ...data.grades }
    delete grades[removed]
    setSelected(null)
    update({ students, grades })
  }

  const studentAverage = (row: number): number | null => {
    const student = data.students[row]
    if (student === '') return null
    const s = data.grades[student]
    if (!s) return null
    return mean(
      ASSIGNMENTS.map((a) => s[a] ?? null).filter((v): v is number => v != null),
    )
  }

  const namedStudents = data.students.filter((s) => s !== '')
  const allGrades = namedStudents
    .flatMap((s) => ASSIGNMENTS.map((a) => data.grades[s]?.[a] ?? null))
    .filter((v): v is number => v != null)

  const classAverage = mean(allGrades)
  const highest = allGrades.length ? Math.max(...allGrades) : null
  const lowest = allGrades.length ? Math.min(...allGrades) : null
  const med = median(allGrades)

  const csv = toCSV(namedStudents, data.grades)

  function exportCsv() {
    void clipboard.copy(csv)
  }

  const railChips = [
    `${namedStudents.length} student${namedStudents.length === 1 ? '' : 's'}`,
    ...ASSIGNMENTS,
    'Average',
  ]

  return (
    <AppShell
      name="Gradebook Manager"
      icon="docs"
      hue="green"
      category="Productivity"
      meta={`${namedStudents.length} students`}
      side={<Rail title="Gradebook" note="Local record" chips={railChips} />}
    >
      <TabBar active={tab} onSelect={setTab} />
      <div className="gb-gap" />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'Gradebook' && (
          <Card title="Gradebook">
            <table className="lc-table" aria-label="Grades">
              <thead>
                <tr>
                  <th>Student</th>
                  {ASSIGNMENTS.map((a) => (
                    <th key={a} className="num">
                      {a}
                    </th>
                  ))}
                  <th className="num">Average</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, i) => (
                  <tr key={`${i}-${s}`} aria-label={s || `Row ${i + 1}`} className={selected === i ? 'hot' : undefined}>
                    <td>
                      <input
                        className="lc-input gc-name"
                        aria-label="Student"
                        value={s}
                        onChange={(e) => setStudentName(i, e.target.value)}
                        onFocus={() => setSelected(i)}
                      />
                    </td>
                    {ASSIGNMENTS.map((a) => (
                      <td key={a} className="num">
                        <input
                          className="lc-input gc-grade"
                          aria-label={a}
                          inputMode="decimal"
                          value={gradeText(i, a)}
                          onChange={(e) => setGrade(i, a, e.target.value)}
                          onFocus={() => setSelected(i)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault()
                              const avg = (e.currentTarget.closest('tr')?.querySelector('.gc-avg') as HTMLElement | null) ?? null
                              if (avg) avg.focus()
                            }
                          }}
                        />
                      </td>
                    ))}
                    <td className="num">
                      <span
                        className={`gc-avg${studentAverage(i) != null ? ' has' : ''}`}
                        tabIndex={0}
                        aria-label={`Average, ${s || `Row ${i + 1}`}`}
                      >
                        {fmt(studentAverage(i))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="gb-gap" />
            <div className="gb-actions">
              <PrimaryButton onClick={addStudent}>Add Student</PrimaryButton>
              <Button kind="danger" onClick={removeStudent}>
                Delete Student
              </Button>
            </div>
          </Card>
        )}
        {tab === 'Statistics' && (
          <Card title="Statistics">
            {allGrades.length === 0 ? (
              <EmptyState
                title="Nothing to summarize"
                detail="Enter grades first."
                actionLabel="Open Gradebook"
                onAction={() => setTab('Gradebook')}
              />
            ) : (
              <>
                <KpiRow>
                  <Kpi value={fmt(classAverage)} label="Class Average" />
                  <Kpi value={fmtStat(highest)} label="Highest" />
                  <Kpi value={fmtStat(lowest)} label="Lowest" />
                  <Kpi value={fmt(med)} label="Median" />
                </KpiRow>
                <div className="gb-gap" />
                <div className="gb-actions">
                  <PrimaryButton onClick={exportCsv}>Export CSV</PrimaryButton>
                  {clipboard.copied && <span className="gc-copied">Copied</span>}
                </div>
              </>
            )}
          </Card>
        )}
        {tab === 'Export CSV' && (
          <Card title="Export CSV">
            {namedStudents.length === 0 ? (
              <EmptyState
                title="Nothing to export"
                detail="Enter grades first."
                actionLabel="Open Gradebook"
                onAction={() => setTab('Gradebook')}
              />
            ) : (
              <>
                <div className="gb-actions">
                  <PrimaryButton onClick={exportCsv}>Export CSV</PrimaryButton>
                  {clipboard.copied && <span className="gc-copied">Copied</span>}
                </div>
                <div className="gb-gap" />
                <pre className="gc-csv">{csv}</pre>
              </>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
