// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// GPA calculator: add courses (name, credits, letter grade), pick a 4.0 or 5.0 scale, and read the
// running GPA, a per-course grade-point table, and a bar chart of the points. Everything persists locally.
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, KpiRow, Kpi, Select, Stack, Table, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { gpaStore, DEFAULT_RECORD, type CourseRecord, type GpaRecord } from './host/mock'
import { GRADE_OPTIONS, chartBars, computeGpa, formatGpa, gradePoint, type Scale } from './gpa'
import { GpaChart } from './GpaChart'

let idSeq = 0
function newId(): string {
  idSeq += 1
  return `course-${Date.now().toString(36)}-${idSeq}`
}

const SCALE_OPTIONS: { value: Scale; label: string }[] = [
  { value: '4.0', label: '4.0 scale (A = 4.0)' },
  { value: '5.0', label: '5.0 scale (A = 5.0)' },
]

const TABS = ['Courses', 'Chart'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const [record, setRecord] = useState<GpaRecord>(() => gpaStore.get())
  const [name, setName] = useState('')
  const [credits, setCredits] = useState('')
  const [grade, setGrade] = useState<string>(GRADE_OPTIONS[0])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Courses')

  useEffect(() => {
    gpaStore.set(record)
  }, [record])

  const { courses, scale } = record
  const { gpa, totalCredits } = useMemo(() => computeGpa(courses, scale), [courses, scale])
  const bars = useMemo(() => chartBars(courses, scale), [courses, scale])
  const gpaText = `GPA: ${formatGpa(gpa)}`

  const clipboard = useClipboard()

  function addCourse(): void {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Course name is required')
      return
    }
    const creditNumber = Number.parseFloat(credits)
    if (!Number.isFinite(creditNumber) || creditNumber <= 0) {
      setError('Enter credits greater than zero')
      return
    }
    const course: CourseRecord = { id: newId(), name: trimmed, credits: creditNumber, grade }
    setRecord((prev) => ({ ...prev, courses: [...prev.courses, course] }))
    setName('')
    setCredits('')
    setGrade(GRADE_OPTIONS[0])
    setError(null)
  }

  function removeCourse(id: string): void {
    setRecord((prev) => ({ ...prev, courses: prev.courses.filter((c) => c.id !== id) }))
  }

  function setScale(next: string): void {
    setRecord((prev) => ({ ...prev, scale: next === '5.0' ? '5.0' : '4.0' }))
  }

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      label: 'JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => JSON.stringify({ scale, gpa: gpaText, courses }, null, 2),
    },
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () => {
        const rows = courses.map((c) => [c.name, c.credits, c.grade, formatGpa(gradePoint(c.grade, scale))].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        return ['Course,Credits,Grade,Grade Point', ...rows].join('\n')
      },
    },
  ]

  const tableColumns = [
    { key: 'name', label: 'Course' },
    { key: 'credits', label: 'Credits', num: true },
    { key: 'grade', label: 'Grade', num: true },
    { key: 'point', label: 'Grade Point', num: true },
    { key: 'remove', label: '' },
  ]
  const tableRows = courses.map((c) => ({
    cells: {
      name: c.name,
      credits: String(c.credits),
      grade: c.grade,
      point: formatGpa(gradePoint(c.grade, scale)),
      remove: <Button kind="ghost" ariaLabel={`Delete ${c.name}`} onClick={() => removeCourse(c.id)}>Delete</Button>,
    },
  }))

  return (
    <AppShell
      name="GPA Calculator"
      icon="school"
      hue="gold"
      category="Productivity"
      meta={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'} · ${scale}`}
      status="Local · saved on this device"
      actions={
        <>
          <Button kind="secondary" onClick={() => void clipboard.copy(gpaText)}>
            {clipboard.copied ? 'Copied' : 'Copy GPA'}
          </Button>
          <ExportMenu options={exportOptions} fileName="gpa-calculator" ariaLabel="Export" disabled={courses.length === 0} />
        </>
      }
    >
      <Stack>
        <Card mono="New" title="Add a course">
          <FormGrid>
            <TextInput label="Course Name" value={name} onChange={(v) => { setName(v); if (v) setError(null) }} error={error} placeholder="e.g. Math 101" />
            <TextInput label="Credits" value={credits} onChange={setCredits} type="number" inputMode="decimal" placeholder="4" />
            <Select label="Grade" value={grade} onChange={setGrade} options={[...GRADE_OPTIONS]} />
          </FormGrid>
          <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
            <Button kind="primary" onClick={addCourse}>Add Course</Button>
          </div>
        </Card>

        <Card mono={`${totalCredits} credits`} title="Result">
          <KpiRow>
            <Kpi value={gpaText} label="GPA" accent />
            <Kpi value={String(totalCredits)} label="Credits" />
            <Kpi value={scale} label="Scale" />
          </KpiRow>
          <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
            <Select label="Scale" value={scale} onChange={setScale} options={SCALE_OPTIONS} />
          </div>
        </Card>

        <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(13px * var(--tf))',
                color: tab === t ? 'var(--paper)' : 'var(--ink)',
                background: tab === t ? 'var(--ink)' : 'transparent',
                border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                borderRadius: 'calc(7px * var(--sf))',
                padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Courses' ? (
          <Card mono={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`} title="Courses">
            {courses.length === 0 ? (
              <EmptyState title="No courses yet" detail="Add your first course above to start computing a GPA." />
            ) : (
              <Table label="Courses" columns={tableColumns} rows={tableRows} />
            )}
          </Card>
        ) : (
          <Card mono="Visual" title="Grade points by course">
            <GpaChart bars={bars} width={640} height={320} />
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
