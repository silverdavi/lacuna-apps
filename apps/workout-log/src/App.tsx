// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Table,
  Tabs,
  TextInput,
} from '@lacuna/ui'
import { ExportMenu } from '@lacuna/export-menu'
import { toISODate } from '@lacuna/date-math'
import { workouts, type Exercise, type Workout } from './host'

type SortDir = 'asc' | 'desc'

function csvOf(ws: Workout[]): string {
  const lines = ['Exercise,Reps,Weight,Sets']
  for (const w of ws) {
    for (const e of w.exercises) {
      lines.push(`${e.name},${e.reps},${e.weight},${e.sets}`)
    }
  }
  return lines.join('\n')
}

export function App() {
  const [refresh, setRefresh] = useState(0)
  const [tab, setTab] = useState('Workouts')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Exercise[]>([])
  const [exName, setExName] = useState('')
  const [exReps, setExReps] = useState('')
  const [exWeight, setExWeight] = useState('')
  const [exSets, setExSets] = useState('')
  const [error, setError] = useState<string | null>(null)

  const all = useMemo(() => workouts.list(), [refresh])

  function bump() {
    setRefresh((n) => n + 1)
  }

  const workoutsNow = workouts.list()

  const filtered = search.trim()
    ? workoutsNow.filter((w) =>
        w.exercises.some((e) => e.name.toLowerCase().includes(search.trim().toLowerCase())),
      )
    : workoutsNow

  function saveExercise() {
    const name = exName.trim()
    const reps = parseInt(exReps, 10)
    const weight = parseInt(exWeight, 10)
    const sets = parseInt(exSets, 10)
    if (!name) {
      setError('Type the exercise name first')
      return
    }
    if (!Number.isFinite(reps) || reps <= 0) {
      setError('Reps must be a positive whole number')
      return
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Weight must be a positive whole number')
      return
    }
    if (!Number.isFinite(sets) || sets <= 0) {
      setError('Sets must be a positive whole number')
      return
    }
    setDraft([...draft, { id: `ex-${Date.now()}-${draft.length}`, name, reps, weight, sets }])
    setExName('')
    setExReps('')
    setExWeight('')
    setExSets('')
    setError(null)
  }

  function finishWorkout() {
    if (draft.length === 0) {
      setError('Add at least one exercise')
      return
    }
    workouts.add({
      date: toISODate(new Date()),
      exercises: draft,
    })
    setDraft([])
    setAdding(false)
    setError(null)
    bump()
  }

  function cancelWorkout() {
    setDraft([])
    setAdding(false)
    setError(null)
  }

  function removeExercise(workoutId: string, exerciseId: string) {
    const w = workouts.get(workoutId)
    if (!w) return
    const remaining = w.exercises.filter((e) => e.id !== exerciseId)
    if (remaining.length === 0) {
      workouts.remove(workoutId)
    } else {
      workouts.update(workoutId, { exercises: remaining })
    }
    bump()
  }

  function toggleSort() {
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const sorted = [...filtered].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date)
    return sortDir === 'desc' ? -cmp : cmp
  })

  const sortAria = sortDir === 'desc' ? 'descending' : 'ascending'

  return (
    <AppShell
      name="Gym Workout Logger"
      icon="grid"
      hue="teal"
      category="Personal"
    >
      <Tabs items={['Workouts', 'History']} active={tab} onSelect={setTab} />

      {tab === 'Workouts' ? (
        <>
          <Card mono="Filter" title="Search">
            <TextInput
              label="Search workouts"
              type="search"
              value={search}
              onChange={setSearch}
              placeholder="Filter by exercise name"
            />
          </Card>

          {adding ? (
            <Card mono="Draft" title="New workout">
              <FormGrid>
                <TextInput label="Exercise" value={exName} onChange={setExName} placeholder="Bench Press" error={error} />
                <TextInput label="Reps" type="number" value={exReps} onChange={setExReps} placeholder="8" />
                <TextInput label="Weight (lbs)" type="number" value={exWeight} onChange={setExWeight} placeholder="100" />
                <TextInput label="Sets" type="number" value={exSets} onChange={setExSets} placeholder="3" />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={saveExercise}>Save exercise</PrimaryButton>
                <Button kind="primary" onClick={finishWorkout}>Finish workout</Button>
                <Button kind="ghost" onClick={cancelWorkout}>Cancel</Button>
              </Actions>
              {draft.length > 0 && (
                <Table
                  label="Draft exercises"
                  columns={[
                    { key: 'name', label: 'Exercise' },
                    { key: 'reps', label: 'Reps', num: true },
                    { key: 'weight', label: 'Weight (lbs)', num: true },
                    { key: 'sets', label: 'Sets', num: true },
                    { key: 'del', label: 'Remove' },
                  ]}
                  rows={draft.map((e) => ({
                    cells: {
                      name: e.name,
                      reps: e.reps,
                      weight: e.weight,
                      sets: e.sets,
                      del: (
                        <Button
                          kind="ghost"
                          onClick={() => setDraft(draft.filter((d) => d.id !== e.id))}
                        >
                          Delete {e.name}
                        </Button>
                      ),
                    },
                  }))}
                />
              )}
            </Card>
          ) : (
            <Card
              mono={`${all.length} saved`}
              title="Workouts"
              actions={
                <Actions>
                  <PrimaryButton onClick={() => setAdding(true)}>Add workout</PrimaryButton>
                  <ExportMenu
                    ariaLabel="Export CSV"
                    fileName="workouts"
                    options={[
                      {
                        id: 'csv',
                        label: 'CSV',
                        mimeType: 'text/csv',
                        extension: 'csv',
                        getData: () => csvOf(workoutsNow),
                      },
                    ]}
                  />
                </Actions>
              }
            >
              {filtered.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No workouts yet"
                  detail={all.length === 0 ? 'Add your first workout to get started.' : 'No workouts match that search.'}
                  actionLabel="Start a workout"
                  onAction={() => setAdding(true)}
                />
              ) : (
                <List label="Workouts">
                  {filtered.map((w) => (
                    <Row
                      key={w.id}
                      title={w.exercises.map((e) => e.name).join(', ')}
                      meta={`${w.date} · ${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`}
                      value={`${w.exercises.length} ex`}
                      action={
                        <span>
                          {w.exercises.map((e) => (
                            <Button
                              key={e.id}
                              kind="ghost"
                              onClick={() => removeExercise(w.id, e.id)}
                            >
                              Delete {e.name}
                            </Button>
                          ))}
                        </span>
                      }
                    />
                  ))}
                </List>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card mono={`${all.length} total`} title="History">
          <Table
            label="Workout history"
            columns={[
              {
                key: 'date',
                label: (
                  <th-sort>
                    <th
                      className={`wk-sort${sortDir === 'desc' ? ' desc' : ' asc'}`}
                      aria-sort={sortAria}
                      onClick={toggleSort}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') toggleSort()
                      }}
                    >
                      Date
                    </th>
                  </th-sort>
                ),
              },
              { key: 'exercises', label: 'Exercises' },
              { key: 'totalSets', label: 'Total sets', num: true },
            ]}
            rows={sorted.map((w) => ({
              cells: {
                date: w.date,
                exercises: w.exercises.map((e) => e.name).join(', '),
                totalSets: w.exercises.reduce((s, e) => s + e.sets, 0),
              },
            }))}
            empty="No workouts logged yet."
          />
        </Card>
      )}
    </AppShell>
  )
}
