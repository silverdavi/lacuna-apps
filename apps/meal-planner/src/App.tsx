// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { saveText } from '@lacuna/file-save-open'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { DAYS, syncMeals, type Day } from './host'

type Tab = 'Week View' | 'Shopping List'

type MealData = {
  name: string
  day: Day
  ingredients: string
}

function parseIngredients(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function shopping(meals: MealData[]): { name: string; quantity: number }[] {
  const counts = new Map<string, number>()
  for (const meal of meals) {
    for (const ing of parseIngredients(meal.ingredients)) {
      counts.set(ing, (counts.get(ing) ?? 0) + 1)
    }
  }
  return [...counts.entries()].map(([name, quantity]) => ({ name, quantity }))
}

function copyText(items: { name: string; quantity: number }[]): string {
  return items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => `${i.name}: ${i.quantity}`)
    .join('\n')
}

function startOfWeek(): Date {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - day)
  return now
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function icsEvents(meals: MealData[]): IcsEvent[] {
  const start = startOfWeek()
  const byDay = new Map<string, MealData[]>()
  for (const meal of meals) {
    const list = byDay.get(meal.day) ?? []
    list.push(meal)
    byDay.set(meal.day, list)
  }
  const out: IcsEvent[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    for (const meal of byDay.get(DAYS[i]) ?? []) {
      out.push({
        id: `meal-${isoDate(d)}-${meal.name}`,
        summary: meal.name,
        description: meal.ingredients ? `Ingredients: ${meal.ingredients}` : undefined,
        startDate: isoDate(d),
        allDay: true,
      })
    }
  }
  return out
}

function isDay(v: string): v is Day {
  return (DAYS as readonly string[]).includes(v)
}

export function App() {
  const { state, actions } = useCollection<MealData>({ storageKey: 'meal-planner' })
  const [tab, setTab] = useState<Tab>('Week View')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [day, setDay] = useState('Monday')
  const [ingredients, setIngredients] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [dayError, setDayError] = useState<string | null>(null)

  const meals = state.activeItems.map((i) => i.data)

  useEffect(() => {
    syncMeals(state.items.map((i) => ({ id: i.id, ...i.data })))
  }, [state.items])

  const items = shopping(meals)

  const { copied, copy } = useClipboard()

  const saveMeal = () => {
    const n = name.trim()
    let ok = true
    if (n === '') {
      setNameError('Enter a meal name')
      ok = false
    } else {
      setNameError(null)
    }
    if (!isDay(day.trim())) {
      setDayError('Pick a day: Monday through Sunday')
      ok = false
    } else {
      setDayError(null)
    }
    if (!ok) return
    actions.add({ name: n, day: day.trim() as Day, ingredients: ingredients.trim() })
    setName('')
    setDay('Monday')
    setIngredients('')
    setOpen(false)
  }

  const exportIcs = () => {
    saveText(toIcs(icsEvents(meals)), { filename: 'meal-plan.ics', mimeType: 'text/calendar' })
  }

  return (
    <AppShell
      name="Meal Planner"
      icon="calendar"
      hue="brown"
      category="Personal"
      meta={`${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`}
      status={copied ? 'List copied' : undefined}
      actions={
        <Stack style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Button ariaLabel="Copy List" onClick={() => void copy(copyText(items))}>
            {copied ? 'Copied' : 'Copy List'}
          </Button>
          <Button ariaLabel="Export ICS" onClick={exportIcs}>
            Export ICS
          </Button>
        </Stack>
      }
      side={
        <Rail>
          <KpiRow>
            <Kpi value={meals.length} label="meals planned" />
            <Kpi value={items.length} label="items to buy" accent />
          </KpiRow>
        </Rail>
      }
    >
      <Stack>
        <div role="tablist" aria-label="Views" className="mp-tabs">
          {(['Week View', 'Shopping List'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`mp-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'Week View' ? (
          <Stack>
            <Card
              mono={open ? 'Form' : `${meals.length} planned`}
              title="Add a meal"
              actions={
                !open ? (
                  <Button ariaLabel="Add Meal" onClick={() => setOpen(true)}>
                    Add Meal
                  </Button>
                ) : undefined
              }
            >
              {open ? (
                <Stack>
                  <FormGrid>
                    <TextInput label="Meal Name" value={name} onChange={setName} error={nameError} />
                    <TextInput label="Day" value={day} onChange={setDay} error={dayError} hint="Monday, Tuesday, ..." />
                    <TextInput label="Ingredients" value={ingredients} onChange={setIngredients} />
                  </FormGrid>
                  <Actions>
                    <PrimaryButton onClick={saveMeal}>Save</PrimaryButton>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                  </Actions>
                </Stack>
              ) : null}
            </Card>
            <Card mono="This week" title="Week view">
              {meals.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No meals planned"
                  detail="Use Add Meal above to plan your first meal."
                  actionLabel="Plan a meal"
                  onAction={() => setOpen(true)}
                />
              ) : (
                <Table
                  label="Planned meals"
                  columns={[
                    { key: 'day', label: 'Day' },
                    { key: 'meal', label: 'Meal' },
                    { key: 'delete', label: '' },
                  ]}
                  rows={state.activeItems.map((item) => ({
                    cells: {
                      day: item.data.day,
                      meal: item.data.name,
                      delete: (
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${item.data.name}`}
                          onClick={() => actions.remove(item.id)}
                        >
                          Delete {item.data.name}
                        </Button>
                      ),
                    },
                  }))}
                />
              )}
            </Card>
          </Stack>
        ) : (
          <Card mono={`${items.length} items`} title="Shopping list">
            {items.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No items to buy"
                detail="Ingredients from your planned meals will appear here."
                actionLabel="Plan meals"
                onAction={() => setTab('Week View')}
              />
            ) : (
              <List label="Ingredients to buy">
                {items.map((i) => (
                  <Row key={i.name} title={i.name} value={i.quantity} />
                ))}
              </List>
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
