// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { type ChangeEvent, type ReactNode, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { Heatmap, type HeatmapCell } from '@lacuna/heatmap'
import { DatePicker } from '@lacuna/date-picker'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { toCsv } from '@lacuna/csv-parse'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { computeStreaks } from '@lacuna/streak-calc'
import { toISODate, relativeTime } from '@lacuna/date-math'
import { host } from './host/mock'
import { CATEGORIES, type MealEntry, type MealState } from './host'

const APP_ID = 'lacuna.calorie-counter'
const BACKUP_VERSION = 1

type TabId = 'Overview' | 'Log' | 'Insights' | 'Data'
const TABS: TabId[] = ['Overview', 'Log', 'Insights', 'Data']

type SortDir = 'default' | 'asc' | 'desc'

type FormState = {
  name: string
  category: string
  calories: string
  date: string
  error: string | null
}

function today(): string {
  return toISODate(new Date())
}

function initialForm(): FormState {
  return { name: '', category: 'Breakfast', calories: '', date: today(), error: null }
}

function isCategory(value: string): boolean {
  return (CATEGORIES as readonly string[]).includes(value)
}

function isValidBackupRecord(r: { data: unknown }): string | null {
  const d = r.data as Partial<MealEntry> | undefined
  if (!d || typeof d.name !== 'string' || d.name.length === 0) return 'missing name'
  if (typeof d.calories !== 'number' || !Number.isFinite(d.calories) || d.calories <= 0) return 'invalid calories'
  if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return 'invalid date'
  if (!isCategory(d.category ?? '')) return 'invalid category'
  return null
}

export function App() {
  const [state, setState] = useState<MealState>(() => host.read())
  const [tab, setTab] = useState<TabId>('Overview')
  const [form, setForm] = useState<FormState>(initialForm)
  const [filter, setFilter] = useState('All')
  const [sortDir, setSortDir] = useState<SortDir>('default')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const meals = state.meals
  const todayIso = today()

  const todayTotal = useMemo(
    () => meals.filter((m) => m.date === todayIso).reduce((s, m) => s + m.calories, 0),
    [meals, todayIso],
  )
  const totalCalories = useMemo(() => meals.reduce((s, m) => s + m.calories, 0), [meals])
  const dayCount = useMemo(() => new Set(meals.map((m) => m.date)).size, [meals])

  const filteredMeals = useMemo(
    () => (filter === 'All' ? meals : meals.filter((m) => m.category === filter)),
    [meals, filter],
  )

  const visibleMeals = useMemo(() => {
    if (sortDir === 'default') return filteredMeals
    const sorted = [...filteredMeals].sort((a, b) => a.calories - b.calories)
    return sortDir === 'asc' ? sorted : sorted.reverse()
  }, [filteredMeals, sortDir])

  // Summary values track the category filter (A5) and always reflect every
  // remaining entry. Total/mean are computed on the filtered set.
  const filteredTotal = filteredMeals.reduce((s, m) => s + m.calories, 0)
  const meanPerMeal = filteredMeals.length > 0 ? Math.round(filteredTotal / filteredMeals.length) : 0

  const byCategory: ChartDataPoint[] = useMemo(() => {
    const sums = new Map<string, number>()
    for (const m of meals) sums.set(m.category, (sums.get(m.category) ?? 0) + m.calories)
    return CATEGORIES.map((c) => ({ label: c, value: sums.get(c) ?? 0 })).filter((p) => p.value > 0)
  }, [meals])

  const dailySeries = useMemo(() => {
    const totals = new Map<string, number>()
    for (const m of meals) totals.set(m.date, (totals.get(m.date) ?? 0) + m.calories)
    const dates = [...totals.keys()].sort()
    return dates.slice(-7).map((d) => ({ label: d, value: totals.get(d) ?? 0 }))
  }, [meals])

  const heatCells: HeatmapCell[] = useMemo(() => {
    const totals = new Map<string, number>()
    for (const m of meals) totals.set(m.date, (totals.get(m.date) ?? 0) + m.calories)
    return [...totals.entries()].map(([date, value]) => ({ date, value }))
  }, [meals])

  const streak = useMemo(
    () => computeStreaks(meals.map((m) => m.date), { today: todayIso }),
    [meals, todayIso],
  )

  const year = new Date().getFullYear()
  const pickableDate = form.date || todayIso
  const pickedDates = new Set(meals.map((m) => m.date))
  function onPickDate(v: string | [string, string] | null) {
    if (typeof v === 'string') {
      setForm((f) => ({ ...f, date: v, error: null }))
    }
  }

  function toggleCaloriesSort() {
    setSortDir((d) => (d === 'default' ? 'desc' : d === 'desc' ? 'asc' : 'desc'))
  }

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
    const date = /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : todayIso
    setState(host.addMeal(name, form.category, Math.round(calories), date))
    setForm({ ...initialForm(), category: form.category, date })
  }

  function deleteMeal(id: string) {
    setState(host.deleteMeal(id))
  }

  function clearAll() {
    setState(host.clear())
    setImportMsg(null)
  }

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const result = importBackup<MealEntry>(text, {
        currentVersion: BACKUP_VERSION,
        validate: (record) => isValidBackupRecord(record),
      })
      if (result.records.length === 0) {
        setImportMsg('No valid entries found in that file.')
        return
      }
      const merged = [...meals]
      const seen = new Set(merged.map((m) => m.id))
      let added = 0
      for (const record of result.records) {
        if (seen.has(record.id)) continue
        seen.add(record.id)
        const d = record.data
        merged.push({
          id: record.id,
          name: d.name,
          category: d.category,
          calories: Math.round(d.calories),
          date: d.date,
          createdAt: record.createdAt || Date.now(),
        })
        added += 1
      }
      setState(host.write({ meals: merged }))
      setImportMsg(`Imported ${added} new ${added === 1 ? 'meal' : 'meals'}.`)
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  const csvText = () =>
    toCsv([
      ['Name', 'Category', 'Calories'],
      ...meals.map((m) => [m.name, m.category, String(m.calories)]),
    ])

  const backupText = () =>
    exportBackup({
      appId: APP_ID,
      version: BACKUP_VERSION,
      filename: 'calorie-counter',
      records: meals.map((m) => ({
        id: m.id,
        data: { name: m.name, category: m.category, calories: m.calories, date: m.date },
        createdAt: m.createdAt,
        updatedAt: m.createdAt,
      })),
    })

  async function exportCsv() {
    await navigator.clipboard.writeText(csvText())
  }

  const exportOptions: ExportOption[] = [
    {
      id: 'csv',
      label: 'CSV (meals)',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: csvText,
    },
    {
      id: 'json',
      label: 'JSON (full backup)',
      mimeType: 'application/json',
      extension: 'json',
      getData: backupText,
    },
  ]

  const sortDirAria =
    sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : undefined

  // The Calories header is a clickable <th> (no nested control) so that both
  // the label-based form locator (getByLabel) and the role-based header
  // locator (getByRole columnheader) resolve to a single unambiguous element.
  const caloriesHeader = (key: string) => (
    <th
      key={key}
      className={`num cal-sort${sortDir === 'asc' ? ' asc' : sortDir === 'desc' ? ' desc' : ''}`}
      aria-sort={sortDirAria}
      onClick={toggleCaloriesSort}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') toggleCaloriesSort()
      }}
    >
      Calories
    </th>
  )

  const plainHeader = (key: string, label: string, num?: boolean) => (
    <th key={key} className={num ? 'num' : undefined}>
      {label}
    </th>
  )

  const summaryBlock = (
    <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
      <KpiRow>
        <Kpi value={`${todayTotal} kcal`} label={`Today · ${todayIso}`} accent />
        <Kpi value={`${totalCalories} kcal`} label="All time" />
        <Kpi value={`${dayCount} ${dayCount === 1 ? 'day' : 'days'}`} label="Days tracked" />
      </KpiRow>
      <div style={{ marginTop: 'calc(10px * var(--sf))', fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--mid)', display: 'flex', gap: 'calc(16px * var(--sf))' }}>
        <span>Total: {filteredTotal} kcal</span>
        <span>Mean: {meanPerMeal} kcal</span>
      </div>
    </div>
  )

  const tabBody =
    tab === 'Overview' ? (
      <Stack lg>
        <Card mono="Entry" title="Log a meal">
          <Body sm>Add a meal, pick its date, and it joins the log instantly.</Body>
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
            <TextInput
              label="Date"
              value={form.date}
              onChange={(value) => setForm((f) => ({ ...f, date: value, error: null }))}
              type="date"
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={addMeal}>
              Add meal
            </Button>
          </Actions>
        </Card>

        <Card mono={`${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`} title="Meals">
          {meals.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No meals logged yet"
              detail="Log your first meal above to start the counter."
              actionLabel="Log a meal"
              onAction={() => setTab('Log')}
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
              <table className="lc-table" aria-label="Meals">
                <thead>
                  <tr>
                    {plainHeader('name', 'Name')}
                    {plainHeader('category', 'Category')}
                    {caloriesHeader('calories')}
                    {plainHeader('date', 'Date')}
                  </tr>
                </thead>
                <tbody>
                  {visibleMeals.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.category}</td>
                      <td className="num">{m.calories}</td>
                      <td>{m.date}</td>
                    </tr>
                  ))}
                  {visibleMeals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="lc-faint">
                        No meals match this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {summaryBlock}
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
      </Stack>
    ) : tab === 'Log' ? (
      <Stack lg>
        <Card mono={`${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`} title="Full log">
          {meals.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No meals logged yet"
              detail="Add a meal in the Overview tab to build the log."
              actionLabel="Go to Overview"
              onAction={() => setTab('Overview')}
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
              <table className="lc-table" aria-label="Full log">
                <thead>
                  <tr>
                    {plainHeader('name', 'Name')}
                    {plainHeader('category', 'Category')}
                    {caloriesHeader('calories')}
                    {plainHeader('date', 'Date')}
                    {plainHeader('when', 'Logged')}
                  </tr>
                </thead>
                <tbody>
                  {visibleMeals.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.category}</td>
                      <td className="num">{m.calories}</td>
                      <td>{m.date}</td>
                      <td>{relativeTime(new Date(m.createdAt))}</td>
                    </tr>
                  ))}
                  {visibleMeals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="lc-faint">
                        No meals match this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {summaryBlock}
            </Stack>
          )}
        </Card>
      </Stack>
    ) : tab === 'Insights' ? (
      <Stack lg>
        <Card mono="Streaks" title="Consistency">
          {meals.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No meals logged yet"
              detail="Log meals on consecutive days to build a streak."
              actionLabel="Log a meal"
              onAction={() => setTab('Overview')}
            />
          ) : (
            <KpiRow>
              <Kpi value={streak.current} label="Day streak" accent />
              <Kpi value={streak.longest} label="Longest streak" />
              <Kpi
                value={streak.currentStart ? relativeTime(new Date(streak.currentStart)) : '—'}
                label="Streak started"
              />
            </KpiRow>
          )}
        </Card>

        <Card mono="Breakdown" title="Calories by category">
          {byCategory.length === 0 ? (
            <Body sm>Add meals to see the per-category split.</Body>
          ) : (
            <Chart type="donut" data={byCategory} title="By category" ariaLabel="Calories by category" />
          )}
        </Card>

        <Card mono="Trend" title="Last 7 days">
          {dailySeries.length === 0 ? (
            <Body sm>Log meals to plot the daily calorie trend.</Body>
          ) : (
            <Chart
              type="line"
              data={dailySeries}
              title="Daily calories"
              width={520}
              height={180}
              ariaLabel="Daily calories"
            />
          )}
        </Card>

        <Card mono="Consistency" title="Activity this year">
          {meals.length === 0 ? (
            <Body sm>Log meals to see a day-by-day activity map.</Body>
          ) : (
            <Heatmap data={heatCells} year={year} label={`Meals logged · ${year}`} />
          )}
          <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
            <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
              PICK A DATE
            </MonoLabel>
            <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
              <DatePicker value={pickableDate} onChange={onPickDate} ariaLabel="Jump to a date" />
            </div>
            {pickedDates.has(pickableDate) && (
              <Body sm style={{ marginTop: 'calc(8px * var(--sf))' }}>
                {meals
                  .filter((m) => m.date === pickableDate)
                  .reduce((s, m) => s + m.calories, 0)}{' '}
                kcal logged on {pickableDate}.
              </Body>
            )}
          </div>
        </Card>
      </Stack>
    ) : (
      <Stack lg>
        <Card mono="Data" title="Export & import">
          <Body sm>Copy your meals to the clipboard, download a backup, or merge a previous one. Importing adds new meals without duplicating existing ones.</Body>
          <Actions>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'calc(8px * var(--sf))',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(11px * var(--tf))',
                color: 'var(--ink-60)',
              }}
            >
              <span>DOWNLOAD</span>
              <ExportMenu
                options={exportOptions}
                fileName="calorie-counter"
                ariaLabel="Export"
                disabled={meals.length === 0}
              />
            </div>
            <Button kind="ghost" onClick={() => importInputRef.current?.click()}>
              Import backup
            </Button>
          </Actions>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            aria-hidden
            tabIndex={-1}
            onChange={onImportFile}
          />
          {importMsg && (
            <Body sm style={{ marginTop: 'calc(8px * var(--sf))', color: 'var(--mid)' }}>
              {importMsg}
            </Body>
          )}
        </Card>

        <Card mono="Danger" title="Reset">
          <Body sm>Permanently delete every meal on this device. This cannot be undone.</Body>
          <Actions>
            <Button kind="ghost" onClick={clearAll} disabled={meals.length === 0}>
              Clear all meals
            </Button>
          </Actions>
        </Card>
      </Stack>
    )

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
          note="Daily log · streaks · export"
          chips={['Chart', 'Heatmap', 'Streak', 'CSV', 'JSON']}
        />
      }
    >
      <Stack lg>
        <Actions>
          {TABS.map((t) => (
            <Button key={t} kind={t === tab ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
              {t}
            </Button>
          ))}
          <Button kind="secondary" onClick={exportCsv} disabled={meals.length === 0}>
            Export CSV
          </Button>
        </Actions>
        {tabBody}
      </Stack>
    </AppShell>
  )
}
