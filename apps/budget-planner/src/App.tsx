import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Cols,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  Rail,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { format as formatMoney, toMinorUnits } from '@lacuna/money'
import { isEntry, type BudgetEntry, type EntryType } from './host'

type EntryData = Omit<BudgetEntry, 'id'>

const STORAGE_KEY = 'lacuna.budget-planner.entries'
const APP_ID = 'lacuna.budget-planner'

function money(minor: number): string {
  const negative = minor < 0
  const text = formatMoney(Math.abs(minor))
  return negative ? `-${text}` : text
}

function formatSigned(amount: number, type: EntryType): string {
  const value = formatMoney(toMinorUnits(amount))
  return type === 'income' ? `+${value}` : `-${value}`
}

export function App() {
  const { state, actions } = useCollection<EntryData>({ storageKey: STORAGE_KEY })
  const entries = state.items.map((item) => ({ id: item.id, ...item.data }))

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'Income' | 'Expense'>('Income')
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [exported, setExported] = useState<string | null>(null)
  const [paste, setPaste] = useState('')

  const income = entries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const expenses = entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const balance = income - expenses

  const onAdd = () => {
    const parsed = Number.parseFloat(amount)
    const desc = description.trim()
    if (!desc || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a description and an amount greater than 0')
      return
    }
    setError(null)
    actions.add({ description: desc, type: type.toLowerCase() as EntryType, amount: parsed })
    setDescription('')
    setAmount('')
    setType('Income')
  }

  const onImport = () => {
    const text = paste.trim()
    if (!text) {
      setImportResult('Paste a backup JSON first.')
      return
    }
    try {
      const result = importBackup<EntryData>(text, {
        currentVersion: 1,
        validate: (record) => (isEntry({ id: record.id, ...record.data }) ? null : 'Entry is malformed'),
      })
      for (const record of result.records) {
        actions.add(record.data)
      }
      setImportResult(
        `Imported ${result.records.length} entr${result.records.length === 1 ? 'y' : 'ies'}${
          result.droppedCount > 0 ? `, dropped ${result.droppedCount}` : ''
        }.`,
      )
      setPaste('')
    } catch {
      setImportResult('That is not a valid backup JSON.')
    }
  }

  const backupRecords = state.items.map((item) => ({
    id: item.id,
    data: item.data,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))

  const exportOptions: ExportOption[] = entries.length > 0
    ? [
        {
          id: 'csv',
          label: 'Entries CSV',
          mimeType: 'text/csv',
          extension: 'csv',
          getData: () =>
            ['description,type,amount', ...entries.map((entry) => `${entry.description},${entry.type},${entry.amount}`)].join('\n'),
        },
        {
          id: 'json',
          label: 'Backup JSON',
          mimeType: 'application/json',
          extension: 'json',
          getData: () => exportBackup({ appId: APP_ID, version: 1, records: backupRecords }),
        },
      ]
    : []

  const chartData: ChartDataPoint[] = entries.length > 0
    ? [
        { label: 'Income', value: income },
        { label: 'Expenses', value: expenses },
      ]
    : []

  return (
    <AppShell
      name="Budget Planner"
      icon="finance"
      hue="green"
      category="Finance"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
      side={
        <Rail title="Budget Planner" note="One month · local" chips={['Income', 'Expenses', 'Works offline']}>
          <MonoLabel faint>Track income and expenses, watch the balance, and export or back up the list whenever you like.</MonoLabel>
        </Rail>
      }
    >
      <Card mono="New" title="Add an entry">
        <FormGrid>
          <TextInput label="Description" value={description} onChange={setDescription} error={error} placeholder="Salary, rent, coffee..." />
          <TextInput label="Amount" value={amount} onChange={setAmount} inputMode="decimal" type="number" placeholder="0.00" />
          <Select
            label="Type"
            value={type}
            onChange={(value) => setType(value as 'Income' | 'Expense')}
            options={['Income', 'Expense']}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={onAdd}>Add entry</Button>
        </Actions>
      </Card>

      <Cols kind="main-side">
        <div>
          <Card mono="Summary" title="Month">
            <KpiRow>
              <Kpi label="Income" value={`Income: ${money(toMinorUnits(income))}`} />
              <Kpi label="Expenses" value={`Expenses: ${money(toMinorUnits(expenses))}`} />
              <Kpi label="Balance" value={`Balance: ${money(toMinorUnits(balance))}`} accent />
            </KpiRow>
          </Card>

          <Card mono="Trend" title="Income vs expenses">
            {entries.length === 0 ? (
              <EmptyState mono="Empty" title="No data yet" detail="Add an income or expense above and it will be charted here." />
            ) : (
              <Chart type="bar" data={chartData} title="Income vs expenses" ariaLabel="Income vs expenses" height={220} />
            )}
          </Card>
        </div>

        <div>
          <Card mono={`${entries.length} saved`} title="Entries">
            {entries.length === 0 ? (
              <EmptyState mono="Empty" title="No entries yet" detail="Add the first one above." />
            ) : (
              <List label="Entries">
                {entries.map((entry) => (
                  <Row
                    key={entry.id}
                    title={entry.description}
                    value={formatSigned(entry.amount, entry.type)}
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${entry.description}`} onClick={() => actions.remove(entry.id)}>
                        Delete {entry.description}
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </div>
      </Cols>

      <Card mono="Backup" title="Export and import">
        {importResult ? <p role="status">{importResult}</p> : null}
        {exported ? <p role="status">{exported}</p> : null}
        {entries.length === 0 ? (
          <EmptyState title="Nothing to export yet" detail="Add an entry, then export it here." />
        ) : (
          <ExportMenu
            options={exportOptions}
            fileName="budget-planner"
            ariaLabel="Export budget"
            onExport={(id) => setExported(`Exported ${id === 'csv' ? 'CSV' : 'backup'}.`)}
          />
        )}
        <FormGrid>
          <TextInput
            label="Import a backup"
            value={paste}
            onChange={setPaste}
            rows={3}
            placeholder='Paste a backup JSON, e.g. {"appId":"lacuna.budget-planner",...}'
          />
        </FormGrid>
        <Actions>
          <Button kind="secondary" onClick={onImport}>Import backup</Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
