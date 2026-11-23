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
  Kpi,
  KpiRow,
  Rail,
  Select,
  Stack,
  Table,
  Tabs,
  TextInput,
} from '@lacuna/ui'
import { host } from './host/mock'
import { CATEGORIES } from './host'
import type { MealState } from './host'

type SortDir = 'desc' | 'asc'
type View = 'log' | 'history'

type FormState = {
  name: string
  category: string
  calories: string
  error: string | null
}

function toCsv(meals: MealState['meals']): string {
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  const lines = ['Name,Category,Calories']
  for (const m of meals) {
    lines.push([escape(m.name), escape(m.category), String(m.calories)].join(','))
  }
  return lines.join('\n')
}

export function App() {
  const [state, setState] = useState<MealState>(() => host.read())
  const [form, setForm] = useState<FormState>({ name: '', category: 'Breakfast', calories: '', error: null })
  const [sortDir, setSortDir] = useState<SortDir | null>(null)
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState<View>('log')

  const meals = state.meals

  const visibleMeals = useMemo(() => {
    const filtered = filter === 'All' ? meals : meals.filter((m) => m.category === filter)
    if (sortDir === null) return filtered
    const dir = sortDir === 'desc' ? -1 : 1
    return [...filtered].sort((a, b) => (a.calories - b.calories) * dir)
  }, [meals, filter, sortDir])

  const total = visibleMeals.reduce((sum, m) => sum + m.calories, 0)
  const mean = visibleMeals.length > 0 ? Math.round(total / visibleMeals.length) : 0

  function addMeal() {
    const name = form.name.trim()
    if (!name) {
      setForm((f) => ({ ...f, error: 'Enter a meal name' }))
      return
    }
    const caloriesText = form.calories.trim()
    if (!caloriesText) {
      setForm((f) => ({ ...f, error: 'Enter the calories' }))
      return
    }
    const calories = Number(caloriesText)
    if (!Number.isFinite(calories) || calories <= 0) {
      setForm((f) => ({ ...f, error: 'Calories must be greater than 0' }))
      return
    }
    setState(host.addMeal(name, form.category, Math.round(calories)))
    setForm({ name: '', category: form.category, calories: '', error: null })
  }

  function deleteMeal(id: string) {
    setState(host.deleteMeal(id))
  }

  function toggleSort() {
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  async function exportCsv() {
    try {
      await navigator.clipboard.writeText(toCsv(meals))
    } catch {
      // clipboard unavailable
    }
  }

  const sortIndicator = sortDir === 'desc' ? ' ↓' : sortDir === 'asc' ? ' ↑' : ''

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'calories',
      num: true,
      label: (
        <button
          type="button"
          onClick={toggleSort}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            font: 'inherit',
            color: 'inherit',
            textAlign: 'right',
            padding: 0,
          }}
        >
          Calories{sortIndicator}
        </button>
      ),
    },
  ]

  const rows = visibleMeals.map((m) => ({
    cells: {
      name: m.name,
      category: m.category,
      calories: String(m.calories),
    },
  }))

  const historyColumns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'calories', num: true, label: 'Calories' },
  ]

  const historyRows = meals.map((m) => ({
    cells: {
      name: m.name,
      category: m.category,
      calories: String(m.calories),
    },
  }))

  return (
    <AppShell
      name="Calorie Counter"
      icon="analytics"
      hue="teal"
      category="Health"
      meta={`${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`}
      side={
        <Rail
          title="Calorie Counter"
          note="Daily log"
          chips={['Sort', 'Filter', 'Export']}
        />
      }
    >
      <Stack lg>
        <Tabs items={['Log', 'History']} active={view} onSelect={(v) => setView(v as View)} />

        {view === 'log' && (
          <>
            <Card mono="Entry" title="Log a meal">
              <FormGrid>
                <TextInput
                  label="Meal name"
                  value={form.name}
                  onChange={(value) => setForm((f) => ({ ...f, name: value, error: null }))}
                  placeholder="e.g. Oatmeal"
                />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(value) => setForm((f) => ({ ...f, category: value, error: null }))}
                  options={CATEGORIES}
                />
                <TextInput
                  label="Calories"
                  value={form.calories}
                  onChange={(value) => setForm((f) => ({ ...f, calories: value, error: null }))}
                  type="number"
                  inputMode="decimal"
                  error={form.error}
                />
              </FormGrid>
              <Actions>
                <Button kind="primary" onClick={addMeal}>
                  Add meal
                </Button>
                <Button kind="secondary" onClick={exportCsv} disabled={meals.length === 0}>
                  Export CSV
                </Button>
              </Actions>
            </Card>

            <Card mono={`${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`} title="Meals">
              {meals.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No meals logged yet"
                  detail="Add your first meal above."
                  actionLabel="Log a meal"
                />
              ) : (
                <Stack>
                  {meals.length >= 2 && (
                    <div style={{ marginBottom: 'calc(12px * var(--sf))' }}>
                      <Select
                        label="Filter by category"
                        value={filter}
                        onChange={setFilter}
                        options={['All', ...CATEGORIES]}
                      />
                    </div>
                  )}
                  <Table
                    label="Meals"
                    columns={columns}
                    rows={rows}
                    empty="No meals match this filter"
                  />
                  <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
                    <KpiRow>
                      <Kpi value={`Total: ${total} kcal`} label="Sum of visible meals" accent />
                      <Kpi value={`Mean: ${mean} kcal`} label="Average per meal" />
                    </KpiRow>
                  </div>
                  <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
                    <Actions>
                      {visibleMeals.map((m) => (
                        <Button key={m.id} kind="ghost" ariaLabel={`Delete ${m.name}`} onClick={() => deleteMeal(m.id)}>
                          Delete {m.name}
                        </Button>
                      ))}
                    </Actions>
                  </div>
                </Stack>
              )}
            </Card>
          </>
        )}

        {view === 'history' && (
          <Card mono={`${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`} title="All meals">
            {meals.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No meals logged yet"
                detail="Add your first meal in the Log tab."
                actionLabel="Switch to Log"
              />
            ) : (
              <Table label="All meals" columns={historyColumns} rows={historyRows} empty="No meals" />
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
