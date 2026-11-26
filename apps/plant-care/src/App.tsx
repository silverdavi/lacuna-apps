// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { type ChangeEvent, useMemo, useRef, useState } from 'react'
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
  List,
  MonoLabel,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import { computeStreaks } from '@lacuna/streak-calc'
import { addDays, fromISODate, toISODate } from '@lacuna/date-math'
import { host } from './host/mock'
import type { Plant } from './host'

type TabId = 'Plants' | 'Log'

function dateDiff(aIso: string, bIso: string): number {
  const a = fromISODate(aIso)
  const b = fromISODate(bIso)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function lastWateredText(plant: Plant, todayIso: string): string | null {
  if (plant.lastWatered === null) return null
  if (plant.lastWatered === todayIso) return 'Last watered: today'
  const diff = dateDiff(plant.lastWatered, todayIso)
  return `Last watered: ${diff} ${diff === 1 ? 'day' : 'days'} ago`
}

function baselineIso(plant: Plant): string {
  if (plant.lastWatered !== null) return plant.lastWatered
  return toISODate(new Date(plant.addedAt))
}

function dueInText(plant: Plant, todayIso: string): string | null {
  const diff = dateDiff(baselineIso(plant), todayIso)
  return `Due in: ${Math.max(0, plant.intervalDays - diff)} days`
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [tab, setTab] = useState<TabId>('Plants')
  const [form, setForm] = useState({ name: '', interval: '3', error: null as string | null })
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [todayOffset, setTodayOffset] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useClipboard()

  const plants = state.plants
  const log = state.log
  const todayIso = useMemo(() => toISODate(addDays(new Date(), todayOffset)), [todayOffset])

  const isDue = (p: Plant) => dateDiff(baselineIso(p), todayIso) >= p.intervalDays

  const dueCount = useMemo(
    () => plants.filter(isDue).length,
    [plants, todayIso],
  )

  function addPlant() {
    const name = form.name.trim()
    if (!name) {
      setForm((f) => ({ ...f, error: 'Enter a plant name' }))
      return
    }
    const intervalText = form.interval.trim()
    if (!intervalText) {
      setForm((f) => ({ ...f, error: 'Enter an interval in days' }))
      return
    }
    const interval = Number(intervalText)
    if (!Number.isFinite(interval) || interval < 1 || interval !== Math.round(interval)) {
      setForm((f) => ({ ...f, error: 'Interval must be a whole number of days' }))
      return
    }
    setState(host.addPlant(name, interval))
    setForm({ name: '', interval: '3', error: null })
  }

  function water(plant: Plant) {
    setState(host.water(plant.id, todayIso))
  }

  function deletePlant(plant: Plant) {
    setState(host.deletePlant(plant.id))
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
      const parsed: unknown = JSON.parse(text)
      const records = Array.isArray(parsed) ? parsed : []
      const seen = new Set(log.map((l) => l.id))
      let added = 0
      const merged = [...log]
      for (const record of records) {
        const r = record as {
          id?: unknown
          data?: { plantId?: unknown; plantName?: unknown; date?: unknown }
          createdAt?: unknown
        }
        if (!r || typeof r.id !== 'string' || seen.has(r.id)) continue
        const d = r.data
        if (!d || typeof d.plantId !== 'string' || typeof d.plantName !== 'string') continue
        if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue
        seen.add(r.id)
        merged.push({
          id: r.id,
          plantId: d.plantId,
          plantName: d.plantName,
          date: d.date,
          wateredAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
        })
        added += 1
      }
      if (added === 0) {
        setImportMsg('No valid entries found in that file.')
        return
      }
      setState(host.write({ ...state, log: merged }))
      setImportMsg(`Imported ${added} new ${added === 1 ? 'entry' : 'entries'}.`)
    } catch {
      setImportMsg('Could not read that file.')
    }
  }

  async function exportLog() {
    const rows: string[][] = [['Plant', 'Date']]
    for (const entry of log) rows.push([entry.plantName, entry.date])
    await copy(toCsv(rows))
  }

  const plantsBody = plants.length === 0 ? (
    <EmptyState
      mono="Empty"
      title="No plants yet"
      detail="Add your first plant above to start keeping the schedule."
      actionLabel="Add a plant"
    />
  ) : (
    <Stack>
      <div style={{ display: 'flex', gap: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
        <Button kind="secondary" onClick={() => setTodayOffset((o) => o + 1)}>
          Advance day
        </Button>
        {todayOffset > 0 && (
          <Button kind="ghost" onClick={() => setTodayOffset(0)}>
            Reset to today
          </Button>
        )}
      </div>
      <List label="Plants">
        {plants.map((plant) => {
          const due = isDue(plant)
          const streak =
            plant.lastWatered !== null
              ? computeStreaks(
                  log.filter((e) => e.plantId === plant.id).map((e) => e.date),
                  { today: todayIso },
                ).current
              : 0
          const lastText = lastWateredText(plant, todayIso)
          const dueText = dueInText(plant, todayIso)
          const meta =
            `every ${plant.intervalDays} ${plant.intervalDays === 1 ? 'day' : 'days'}` +
            ` · ${lastText ?? 'Not watered yet'}` +
            (dueText ? ` · ${dueText}` : '') +
            (plant.lastWatered !== null ? ` · Streak: ${streak}` : '')
          const titleText = due
            ? `${plant.name} · ${plant.name} is due for water`
            : plant.name
          return (
            <li key={plant.id} className={`lk-row${due ? ' hot' : ''}`}>
              <div className="lk-row-text">
                <span className="lk-row-title">
                  {titleText} <span className="lk-row-meta">{meta}</span>
                </span>
              </div>
              <Actions>
                <Button
                  kind="primary"
                  ariaLabel={`Water ${plant.name}`}
                  onClick={() => water(plant)}
                >
                  Water
                </Button>
                <Button kind="ghost" ariaLabel={`Delete ${plant.name}`} onClick={() => deletePlant(plant)}>
                  Remove
                </Button>
              </Actions>
            </li>
          )
        })}
      </List>
    </Stack>
  )

  const heatData = useMemo(() => {
    const seen = new Set(log.map((e) => e.date))
    const days: { date: string; filled: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const iso = toISODate(addDays(new Date(), i))
      days.push({ date: iso, filled: seen.has(iso) })
    }
    return days
  }, [log])

  const logBody =
    log.length === 0 ? (
      <EmptyState
        mono="Empty"
        title="No waterings logged yet"
        detail="Water a plant to see it here."
        actionLabel="Water a plant"
        onAction={() => setTab('Plants')}
      />
    ) : (
      <Stack>
        {log.map((entry) => (
          <div
            key={entry.id}
            role="row"
            aria-label={`${entry.plantName}, ${entry.date}`}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 'calc(12px * var(--sf))' }}
          >
            <span className="lk-row-title">{entry.plantName}</span>
            <span className="lc-faint" style={{ fontFamily: 'var(--mono)' }}>{entry.date}</span>
          </div>
        ))}
      </Stack>
    )

  return (
    <AppShell name="Plant Watering Tracker" icon="home" hue="teal" category="Personal">
      <Stack lg>
        <Card mono={`${plants.length} ${plants.length === 1 ? 'plant' : 'plants'}`} title="Your plants">
          <Body sm>Add a plant, set how often it drinks, and water it when the day comes.</Body>
          <FormGrid>
            <TextInput
              label="Plant name"
              value={form.name}
              onChange={(value) => setForm((f) => ({ ...f, name: value, error: null }))}
              placeholder="e.g. Fern"
            />
            <TextInput
              label="Interval (days)"
              value={form.interval}
              onChange={(value) => setForm((f) => ({ ...f, interval: value, error: null }))}
              type="number"
              inputMode="numeric"
              error={form.error}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={addPlant}>
              Add plant
            </Button>
          </Actions>
        </Card>

        <div className="lc-tabs" role="tablist" aria-label="Sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'Plants'}
            className={`lc-tab${tab === 'Plants' ? ' active' : ''}`}
            style={tab !== 'Plants' ? { color: 'var(--ink-60)' } : undefined}
            onClick={() => setTab('Plants')}
          >
            Plants
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'Log'}
            className={`lc-tab${tab === 'Log' ? ' active' : ''}`}
            style={tab !== 'Log' ? { color: 'var(--ink-60)' } : undefined}
            onClick={() => setTab('Log')}
          >
            Log
          </button>
        </div>

        {tab === 'Plants' ? (
          <Card mono={`${dueCount} due`} title="Schedule">
            {plantsBody}
          </Card>
        ) : (
          <Card
            mono={`${log.length} ${log.length === 1 ? 'watering' : 'waterings'}`}
            title="Watering log"
          >
            {logBody}
            <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
              <MonoLabel>Watering activity · last 7 days</MonoLabel>
              <div
                role="grid"
                aria-label="Watering activity, last 7 days"
                aria-rowcount={7}
                aria-colcount={7}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 'calc(4px * var(--sf))',
                  marginTop: 'calc(8px * var(--sf))',
                }}
              >
                {heatData.map((d) => (
                  <div
                    key={d.date}
                    role="gridcell"
                    aria-label={`${d.date}: ${d.filled ? 'watered' : 'no data'}`}
                    aria-rowindex={1}
                    className={d.filled ? 'pc-cell filled' : 'pc-cell'}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 'calc(4px * var(--sf))',
                      background: d.filled ? 'var(--accent)' : 'var(--paper-deep)',
                      border: 'calc(1px * var(--sf)) solid var(--hair)',
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card mono="Data" title="Backup and export">
          <Body sm>Copy the log to the clipboard, or import a backup from before.</Body>
          <Stack>
            <Actions>
              <Button kind="primary" onClick={exportLog}>
                Export log
              </Button>
              <Button kind="ghost" onClick={() => importInputRef.current?.click()}>
                Import JSON
              </Button>
              <Button kind="ghost" onClick={clearAll}>
                Clear all
              </Button>
            </Actions>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={onImportFile}
            />
            {copied && <MonoLabel accent>Log copied to clipboard</MonoLabel>}
            {importMsg && <MonoLabel faint>{importMsg}</MonoLabel>}
          </Stack>
        </Card>

        <KpiRow>
          <Kpi value={String(dueCount)} label="Due now" accent />
          <Kpi value={String(log.length)} label="Waterings logged" />
        </KpiRow>
      </Stack>
    </AppShell>
  )
}
