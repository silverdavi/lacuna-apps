import { useEffect, useRef, useState } from 'react'
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
  Rail,
  Row,
  Stack,
  Tabs,
  Table,
  TextInput,
} from '@lacuna/ui'
import { ExportMenu } from '@lacuna/export-menu'
import { Heatmap } from '@lacuna/heatmap'
import { DatePicker } from '@lacuna/date-picker'
import { toCsv } from '@lacuna/csv-parse'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { computeStreaks } from '@lacuna/streak-calc'
import { toISODate } from '@lacuna/date-math'
import { host } from './host/mock'
import type { WeightEntry } from './host'

const APP_ID = 'lacuna.weight-tracker'
const BACKUP_VERSION = 1
const KG_TO_LB = 2.20462

type Unit = 'kg' | 'lb'

type TabId = 'Overview' | 'History' | 'Insights' | 'Data'
const TABS: TabId[] = ['Overview', 'History', 'Insights', 'Data']

type FormState = {
  open: boolean
  date: string
  weight: string
  error: string | null
}

function today(): string {
  return toISODate(new Date())
}

function fmtWeight(value: number, unit: Unit): string {
  const v = unit === 'lb' ? value * KG_TO_LB : value
  return `${Math.round(v * 10) / 10}`
}

function unitLabel(unit: Unit): string {
  return unit === 'lb' ? 'lb' : 'kg'
}

function WeightChart({ entries, unit }: { entries: WeightEntry[]; unit: Unit }) {
  const width = 340
  const height = 150
  const padX = 30
  const padTop = 16
  const padBottom = 24
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const weights = entries.map((e) => e.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const step = entries.length > 1 ? innerW / (entries.length - 1) : 0
  const pts = entries.map((e, i) => {
    const x = entries.length > 1 ? padX + i * step : padX + innerW / 2
    const y = padTop + innerH - ((e.weight - min) / span) * innerH
    return { x, y, entry: e }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  return (
    <div>
      <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
        TREND
      </MonoLabel>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Weight over time"
        style={{ display: 'block', marginTop: 'calc(8px * var(--sf))' }}
      >
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p) => (
          <circle key={p.entry.id} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="3.5" fill="var(--accent)" />
        ))}
        {pts.map((p) => (
          <text
            key={`lbl-${p.entry.id}`}
            x={p.x.toFixed(2)}
            y={(height - 8).toFixed(2)}
            textAnchor="middle"
            fontSize="calc(8.5px * var(--tf))"
            fill="var(--ink-40)"
            fontFamily="var(--mono)"
          >
            {p.entry.date}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [form, setForm] = useState<FormState>({ open: false, date: '', weight: '', error: null })
  const [tab, setTab] = useState<TabId>('Overview')
  const [unit, setUnit] = useState<Unit>(() => {
    try {
      const raw = window.localStorage.getItem(`${APP_ID}.settings`)
      if (!raw) return 'kg'
      const parsed = JSON.parse(raw) as { unit?: string }
      return parsed.unit === 'lb' ? 'lb' : 'kg'
    } catch {
      return 'kg'
    }
  })
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const entries = state.entries
  const latest = entries.length ? entries[entries.length - 1] : null
  const change = entries.length >= 2 ? entries[entries.length - 1].weight - entries[0].weight : null
  const unitLbl = unitLabel(unit)
  const changeText =
    change !== null
      ? `${change < 0 ? '-' : '+'}${Math.abs(Math.round(change * 10) / 10).toFixed(1)}`
      : null

  useEffect(() => {
    try {
      window.localStorage.setItem(`${APP_ID}.settings`, JSON.stringify({ unit }))
    } catch {
      // ignore
    }
  }, [unit])

  useEffect(() => {
    if (!form.open) return
    const first = dialogRef.current?.querySelector<HTMLElement>('input, button')
    first?.focus()
  }, [form.open])

  function openForm() {
    setForm({ open: true, date: today(), weight: '', error: null })
  }

  function closeForm() {
    setForm((f) => ({ ...f, open: false, error: null }))
  }

  function save() {
    const weightText = form.weight.trim()
    if (!weightText) {
      setForm((f) => ({ ...f, error: 'Enter a weight greater than 0' }))
      return
    }
    const value = Number(weightText)
    if (!Number.isFinite(value)) {
      setForm((f) => ({ ...f, error: 'Enter a valid weight' }))
      return
    }
    if (value <= 0) {
      setForm((f) => ({ ...f, error: 'Enter a weight greater than 0' }))
      return
    }
    const weight = Math.round(value * 10) / 10
    const date = /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : today()
    setState(host.addEntry(date, weight))
    setForm({ open: false, date: '', weight: '', error: null })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') closeForm()
  }

  function remove(id: string) {
    setState(host.deleteEntry(id))
  }

  function clearAll() {
    setState(host.clear())
    setImportMsg(null)
    setImportFile(null)
  }

  function pickImport() {
    importInputRef.current?.click()
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      setImportFile(text)
      const result = importBackup<{ date: string; weight: number }>(text, {
        currentVersion: BACKUP_VERSION,
        validate: (record) => {
          const d = record.data
          if (typeof d?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
            return 'missing valid date'
          }
          if (typeof d?.weight !== 'number' || d.weight <= 0) {
            return 'missing valid weight'
          }
          return null
        },
      })
      if (result.records.length === 0) {
        setImportMsg('No valid entries found in that file.')
        return
      }
      const merged = [...entries]
      const seen = new Set(merged.map((en) => en.id))
      let added = 0
      for (const record of result.records) {
        const id = record.id
        if (seen.has(id)) continue
        seen.add(id)
        merged.push({
          id,
          date: record.data.date,
          weight: Math.round(record.data.weight * 10) / 10,
          createdAt: record.createdAt || Date.now(),
        })
        added += 1
      }
      setState(host.write({ entries: merged }))
      setImportMsg(`Imported ${added} new ${added === 1 ? 'entry' : 'entries'}.`)
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  const csvText = () =>
    toCsv([
      ['date', 'weight_kg'],
      ...entries.map((e) => [e.date, String(e.weight)]),
    ])

  const backupText = () =>
    exportBackup({
      appId: APP_ID,
      version: BACKUP_VERSION,
      filename: 'weight-tracker',
      records: entries.map((e) => ({
        id: e.id,
        data: { date: e.date, weight: e.weight },
        createdAt: e.createdAt,
        updatedAt: e.createdAt,
      })),
    })

  const streak = computeStreaks(entries.map((e) => e.date), { today: today() })
  const avg = entries.length ? entries.reduce((s, e) => s + e.weight, 0) / entries.length : null
  const hi = entries.length ? Math.max(...entries.map((e) => e.weight)) : null
  const lo = entries.length ? Math.min(...entries.map((e) => e.weight)) : null
  const year = new Date().getFullYear()
  const pickableDate = form.date || today()
  const pickedDates = new Set(entries.map((e) => e.date))
  function onPickDate(v: string | [string, string] | null) {
    if (typeof v === 'string') {
      setForm((f) => ({ ...f, date: v, error: null }))
    }
  }

  const entryTableRows = entries.map((e) => {
    const i = entries.indexOf(e)
    const prev = i > 0 ? entries[i - 1].weight : null
    const delta = prev === null ? null : e.weight - prev
    return {
      cells: {
        date: e.date,
        weight: `${fmtWeight(e.weight, unit)} ${unitLbl}`,
        delta:
          delta === null ? '—' : `${delta < 0 ? '-' : '+'}${Math.abs(Math.round(delta * 10) / 10).toFixed(1)}`,
      },
    }
  })

  const exportOptions = [
    {
      id: 'csv',
      label: 'CSV (weights)',
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

  const tabBody =
    tab === 'Overview' ? (
      <Stack lg>
        <Card mono="Entry" title="Add a reading">
          <Body sm>Log your weight on a date and watch the trend.</Body>
          <Actions>
            <Button kind="primary" onClick={openForm}>
              Add entry
            </Button>
          </Actions>
        </Card>

        <Card
          mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
          title="Entries"
        >
          {entries.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No entries yet"
              detail="Add your first reading to start the trend."
            />
          ) : (
            <Stack>
              <List label="Entries">
                {entries.map((e) => (
                  <Row
                    key={e.id}
                    title={e.date}
                    value={`${fmtWeight(e.weight, unit)} ${unitLbl}`}
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${e.date}`} onClick={() => remove(e.id)}>
                        Delete {e.date}
                      </Button>
                    }
                  />
                ))}
              </List>
              <WeightChart entries={entries} unit={unit} />
              <KpiRow>
                {latest && (
                  <Kpi
                    value={`Latest: ${fmtWeight(latest.weight, unit)} ${unitLbl}`}
                    label="Most recent reading"
                    accent
                  />
                )}
                {changeText !== null && <Kpi value={`Change: ${changeText} ${unitLbl}`} label="Since first entry" />}
              </KpiRow>
            </Stack>
          )}
        </Card>
      </Stack>
    ) : tab === 'History' ? (
      <Card mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} title="History">
        {entries.length === 0 ? (
          <EmptyState mono="Empty" title="No entries yet" detail="Add a reading to build the table." />
        ) : (
          <Table
            label="Weight history"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'weight', label: `Weight (${unitLbl})`, num: true },
              { key: 'delta', label: 'Change', num: true },
            ]}
            rows={entryTableRows}
            empty="No entries yet"
          />
        )}
      </Card>
    ) : tab === 'Insights' ? (
      <Stack lg>
        <Card mono="Stats" title="At a glance">
          {entries.length === 0 ? (
            <EmptyState mono="Empty" title="No entries yet" detail="Add readings to unlock insights." />
          ) : (
            <KpiRow>
              <Kpi value={streak.current} label="Day streak" accent />
              <Kpi value={streak.longest} label="Longest streak" />
              <Kpi
                value={avg !== null ? `${fmtWeight(avg, unit)} ${unitLbl}` : '—'}
                label="Average"
              />
              <Kpi
                value={hi !== null ? `${fmtWeight(hi, unit)} ${unitLbl}` : '—'}
                label="Highest"
              />
              <Kpi
                value={lo !== null ? `${fmtWeight(lo, unit)} ${unitLbl}` : '—'}
                label="Lowest"
              />
            </KpiRow>
          )}
        </Card>
        <Card mono="Consistency" title="Activity this year">
          {entries.length === 0 ? (
            <Body sm>Add readings to see a day-by-day activity map.</Body>
          ) : (
            <Heatmap
              data={entries.map((e) => ({ date: e.date, value: e.weight }))}
              year={year}
              label={`Weight recorded · ${year}`}
            />
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
                Recorded on {pickableDate}.
              </Body>
            )}
          </div>
        </Card>
      </Stack>
    ) : (
      <Stack lg>
        <Card mono="Units" title="Settings">
          <Body sm>Choose how weights are displayed. Entries are always stored in kilograms.</Body>
          <Actions>
            <Tabs items={['kg', 'lb']} active={unit} onSelect={(v) => setUnit(v as Unit)} />
          </Actions>
        </Card>

        <Card mono="Data" title="Export & import">
          <Body sm>Download your data, or merge a previous backup. Importing adds new entries without duplicating existing ones.</Body>
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
              <span>EXPORT</span>
              <ExportMenu
                options={exportOptions}
                fileName="weight-tracker"
                ariaLabel="Export"
                disabled={entries.length === 0}
              />
            </div>
            <Button kind="ghost" onClick={pickImport} disabled={importFile === null}>
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
          <Body sm>Permanently delete every entry on this device. This cannot be undone.</Body>
          <Actions>
            <Button kind="ghost" onClick={clearAll} disabled={entries.length === 0}>
              Clear all entries
            </Button>
          </Actions>
        </Card>
      </Stack>
    )

  return (
    <AppShell
      name="Weight Tracker"
      icon="analytics"
      hue="teal"
      category="Personal"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Weight Tracker"
          note="Dated readings · local"
          chips={['Line chart', 'Heatmap', 'Export', 'Offline']}
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
        </Actions>
        {tabBody}
      </Stack>

      {form.open && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--dim-veil)',
            pointerEvents: 'none',
          }}
          onClick={closeForm}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Add a reading"
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              width: 'calc(360px * var(--sf))',
              padding: 'calc(18px * var(--sf))',
              background: 'var(--ui-card)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(6px * var(--sf))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <MonoLabel accent>ADD A READING</MonoLabel>
            <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
              <FormGrid>
                <TextInput
                  label="Date"
                  value={form.date}
                  onChange={(value) => setForm((f) => ({ ...f, date: value, error: null }))}
                />
                <TextInput
                  label="Weight (kg)"
                  value={form.weight}
                  onChange={(value) => setForm((f) => ({ ...f, weight: value, error: null }))}
                  error={form.error}
                />
              </FormGrid>
            </div>
            <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
              <Actions>
                <Button kind="primary" onClick={save}>
                  Save
                </Button>
                <Button kind="ghost" onClick={closeForm}>
                  Cancel
                </Button>
              </Actions>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
