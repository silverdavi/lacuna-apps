// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { openFile } from '@lacuna/file-save-open'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'

interface ReceiptData {
  merchant: string
  amount: number
  category: string
  date: string
}

const CATEGORIES = ['Food', 'Office', 'Transport', 'Housing', 'Health', 'Other']

const APP_ID = 'lacuna.receipt-tracker'
const BACKUP_VERSION = 1

interface ReceiptItem {
  id: string
  data: ReceiptData
  archived: boolean
  createdAt: number
  updatedAt: number
}

function isReceiptData(value: unknown): value is ReceiptData {
  const v = value as ReceiptData
  return (
    typeof v?.merchant === 'string' &&
    typeof v?.amount === 'number' &&
    Number.isFinite(v.amount) &&
    typeof v?.category === 'string' &&
    typeof v?.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date)
  )
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All categories' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
]

export function App() {
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const exportAnchorRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = exportAnchorRef.current
    if (el) document.body.appendChild(el)
    return () => {
      if (el && el.parentNode) el.parentNode.removeChild(el)
    }
  }, [])

  const { state, actions } = useCollection<ReceiptData>({
    storageKey: 'lacuna.receipt-tracker:receipts',
  })

  const active = state.activeItems as ReceiptItem[]

  const totalAll = useMemo(
    () => active.reduce((sum, item) => sum + item.data.amount, 0),
    [active],
  )

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return active.filter((item) => {
      const matchesSearch = query === '' || item.data.merchant.toLowerCase().includes(query)
      const matchesCategory = category === '' || item.data.category === category
      return matchesSearch && matchesCategory
    })
  }, [active, search, category])

  const total = useMemo(() => rows.reduce((sum, item) => sum + item.data.amount, 0), [rows])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of active) {
      map.set(item.data.category, (map.get(item.data.category) ?? 0) + item.data.amount)
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [active])

  function add() {
    const value = Number.parseFloat(amount)
    if (amount.trim() === '' || Number.isNaN(value) || value <= 0) {
      setAmountError('Amount is required')
      return
    }
    if (!merchant.trim()) return
    actions.add({
      merchant: merchant.trim(),
      amount: value,
      category: category || 'Other',
      date: todayISO(),
    })
    setMerchant('')
    setAmount('')
    setAmountError(null)
    setCategory('')
  }

  function pickImport() {
    importInputRef.current?.click()
  }

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setImportMsg(`Could not read ${file.name}: ${result.error}`)
      return
    }
    try {
      const imported = importBackup<ReceiptData>(JSON.stringify(result.data), {
        currentVersion: BACKUP_VERSION,
        validate: (record) => (isReceiptData(record.data) ? null : 'record is not a receipt'),
      })
      if (imported.records.length === 0) {
        setImportMsg('No valid receipts found in that file.')
        return
      }
      const seen = new Set(active.map((item) => item.id))
      let added = 0
      for (const record of imported.records) {
        if (seen.has(record.id)) continue
        seen.add(record.id)
        actions.add(record.data)
        added += 1
      }
      setImportMsg(added > 0 ? `Imported ${added} new receipt${added === 1 ? '' : 's'}.` : 'Nothing new to import.')
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Could not import that file.')
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const el = exportAnchorRef.current
    if (!el) return
    el.href = url
    el.download = filename
    el.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const csvText = () =>
    toCsv([
      ['Merchant', 'Category', 'Amount'],
      ...active.map((item) => [
        item.data.merchant,
        item.data.category,
        item.data.amount.toFixed(2),
      ]),
    ])

  const backupText = () =>
    exportBackup<ReceiptData>({
      appId: APP_ID,
      version: BACKUP_VERSION,
      filename: 'receipt-tracker',
      records: active.map((item) => ({
        id: item.id,
        data: item.data,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    })

  const receiptTable = (
    <table className="lc-table rt-table" aria-label="Receipts">
      <tbody>
        {rows.map((item) => (
          <tr key={item.id}>
            <td data-label="Merchant">{item.data.merchant}</td>
            <td data-label="Category">{item.data.category}</td>
            <td data-label="Date">{item.data.date}</td>
            <td data-label="Amount" className="num">
              {formatMoney(item.data.amount)}
            </td>
            <td data-label="Actions">
              <Button
                kind="ghost"
                ariaLabel={`Delete ${item.data.merchant}`}
                onClick={() => actions.remove(item.id)}
              >
                Delete
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <AppShell
      name="Receipt Tracker"
      icon="timesheets"
      hue="teal"
      category="Finance"
      meta={`${active.length} receipt${active.length === 1 ? '' : 's'}`}
      side={
        <Rail title="Summary">
          <KpiRow>
            <Kpi value={String(active.length)} label="Receipts" />
            <Kpi value={formatMoney(totalAll)} label="All-time total" accent />
          </KpiRow>
          <MonoLabel>By category</MonoLabel>
          <div className="rt-catlist">
            {byCategory.length === 0 ? (
              <div className="rt-muted">Nothing logged yet.</div>
            ) : (
              byCategory.map((entry) => (
                <div key={entry.label} className="rt-cat">
                  <span>{entry.label}</span>
                  <span className="num">{formatMoney(entry.value)}</span>
                </div>
              ))
            )}
          </div>
        </Rail>
      }
    >
      <Stack>
        <Card title="Receipt list" mono={`${rows.length} shown`}>
          <div className="rt-filter-row">
            <TextInput
              label="Search"
              type="search"
              value={search}
              onChange={setSearch}
              placeholder="Find a merchant"
            />
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
            />
          </div>
          {active.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No receipts yet"
              detail="Log a purchase in the form below to start tracking."
              actionLabel="Add your first receipt"
            />
          ) : (
            <>
              {rows.length === 0 ? (
                <div className="rt-muted">No receipts match your filters.</div>
              ) : (
                receiptTable
              )}
              <p role="status" className="rt-total">
                Total: {formatMoney(total)}
              </p>
            </>
          )}
        </Card>

        <Card title="Add a receipt" mono="New">
          <FormGrid>
            <TextInput
              label="Merchant"
              value={merchant}
              onChange={setMerchant}
              placeholder="Where did you pay?"
            />
            <TextInput
              label="Amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              error={amountError}
            />
          </FormGrid>
          <PrimaryButton onClick={add}>Add receipt</PrimaryButton>
        </Card>

        <Card title="Export & import" mono="Data">
          <div className="rt-actions-row">
            <Button
              kind="ghost"
              onClick={() => {
                const blob = new Blob([csvText()], { type: 'text/csv' })
                triggerDownload(blob, 'receipts.csv')
              }}
            >
              Export CSV
            </Button>
            <Button
              kind="ghost"
              onClick={() => {
                const blob = new Blob([backupText()], { type: 'application/json' })
                triggerDownload(blob, 'receipt-tracker-backup.json')
              }}
              disabled={active.length === 0}
            >
              Export JSON
            </Button>
            <Button kind="ghost" onClick={pickImport} disabled={active.length === 0}>
              Import backup
            </Button>
          </div>
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
            <div className="rt-muted" role="status">
              {importMsg}
            </div>
          )}
        </Card>

        <a ref={exportAnchorRef} style={{ display: 'none' }} tabIndex={-1} aria-hidden />
      </Stack>
    </AppShell>
  )
}

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
