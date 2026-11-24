import { useMemo, useReducer, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  SectionLabel,
  Table,
  TextInput,
  type IconName,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { exportBackup } from '@lacuna/json-backup'
import { useCollection, type CollectionItem } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { toISODate } from '@lacuna/date-math'
import { computeStreaks } from '@lacuna/streak-calc'
import { host, spaceId } from './host/mock'
import {
  KEY,
  emptyState,
  makeId,
  money,
  percentOf,
  savedOf,
  type Goal,
  type SavingsState,
} from './host'

const APP_ID = 'lacuna.savings-goal'
const BACKUP_VERSION = 1

const TABS = ['Goals', 'Progress', 'History'] as const
type Tab = (typeof TABS)[number]

function todayISO(): string {
  return toISODate(new Date())
}

function parseAmount(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

/** A circular progress ring. The percentage is shown inside the ring. */
function Ring({ percent, saved, target }: { percent: number; saved: number; target: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(100, Math.max(0, percent))
  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        width={108}
        height={108}
        viewBox="0 0 108 108"
        style={{ display: 'block', margin: '0 auto' }}
      >
        <circle cx={54} cy={54} r={radius} fill="none" stroke="var(--ui-line2)" strokeWidth={8} />
        <circle
          cx={54}
          cy={54}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${(filled / 100) * circumference} ${circumference}`}
          transform="rotate(-90 54 54)"
        />
        <text
          x={54}
          y={54}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--ink)"
          style={{ fontSize: 'calc(18px * var(--tf))', fontFamily: 'var(--mono)' }}
        >
          {percent}%
        </text>
      </svg>
      <div style={{ fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>
        {money(saved)} of {money(target)}
      </div>
    </div>
  )
}

export function App() {
  const [, forceRender] = useReducer((x: number) => x + 1, 0)
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<Tab>('Goals')
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [depositFor, setDepositFor] = useState<string | null>(null)

  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDeadline, setGoalDeadline] = useState(todayISO())
  const [goalError, setGoalError] = useState<string | null>(null)

  const [depositAmount, setDepositAmount] = useState('')
  const [depositDate, setDepositDate] = useState(todayISO())
  const [depositError, setDepositError] = useState<string | null>(null)

  const { copy, copied } = useClipboard({ timeoutMs: 2000 })

  const goals = useMemo<Goal[]>(() => host.read().goals, [version])

  const refresh = () => {
    setVersion((v) => v + 1)
    forceRender()
  }

  const totalSaved = goals.reduce((sum, g) => sum + savedOf(g), 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const depositDates = useMemo(
    () => goals.flatMap((g) => g.deposits.map((d) => d.date)),
    [goals],
  )
  const streak = computeStreaks(depositDates, { today: todayISO() })

  const historyRows = useMemo(() => {
    const all = goals
      .flatMap((g) => g.deposits.map((d) => ({ ...d, goal: g.name, goalId: g.id })))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    let running = 0
    return all.map((d) => {
      running += d.amount
      return {
        date: d.date,
        goal: d.goal,
        amount: money(d.amount),
        running: money(running),
        raw: d,
      }
    })
  }, [goals])

  const chartData: ChartDataPoint[] = goals.map((g) => ({ label: g.name, value: savedOf(g) }))

  const backupRecords = goals.map((g) => ({
    id: g.id,
    data: g,
    createdAt: g.createdAt,
    updatedAt: g.createdAt,
  }))

  const csv = ['Goal,Target,Saved,Percent', ...goals.map((g) => `${g.name},${g.target.toFixed(2)},${savedOf(g).toFixed(2)},${percentOf(g)}`)].join('\n')

  const exportOptions: ExportOption[] =
    goals.length > 0
      ? [
          {
            id: 'json',
            label: 'Backup JSON',
            mimeType: 'application/json',
            extension: 'json',
            getData: () => exportBackup({ appId: APP_ID, version: BACKUP_VERSION, records: backupRecords }),
          },
        ]
      : []

  const onAddGoal = () => {
    const name = goalName.trim()
    const target = parseAmount(goalTarget)
    if (!name) {
      setGoalError('Enter a goal name')
      return
    }
    if (target == null) {
      setGoalError('Enter a target amount greater than 0')
      return
    }
    host.addGoal(name, target, goalDeadline)
    setGoalName('')
    setGoalTarget('')
    setGoalDeadline(todayISO())
    setGoalError(null)
    setGoalFormOpen(false)
    refresh()
  }

  const onAddDeposit = (goalId: string) => {
    const amount = parseAmount(depositAmount)
    if (amount == null) {
      setDepositError('Enter an amount greater than 0')
      return
    }
    host.addDeposit(goalId, amount, depositDate)
    setDepositAmount('')
    setDepositDate(todayISO())
    setDepositError(null)
    setDepositFor(null)
    refresh()
  }

  const deleteGoal = (id: string) => {
    host.deleteGoal(id)
    if (depositFor === id) {
      setDepositFor(null)
      setDepositAmount('')
      setDepositError(null)
    }
    refresh()
  }

  const shellActions = (
    <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
      <ExportMenu
        options={exportOptions}
        fileName="savings-goal"
        ariaLabel="Export data"
        disabled={goals.length === 0}
      />
      <Button kind={copied ? 'primary' : 'secondary'} onClick={() => void copy(csv)} disabled={goals.length === 0}>
        {copied ? 'Copied' : 'Export CSV'}
      </Button>
    </div>
  )

  return (
    <AppShell
      name="Savings Goal Tracker"
      icon="wallet"
      category="Finance"
      hue="teal"
      meta={`${goals.length} goal${goals.length === 1 ? '' : 's'}`}
      actions={shellActions}
      side={
        <div style={{ display: 'grid', gap: 'calc(12px * var(--sf))' }}>
          <Card title="Overall" mono="Summary">
            <KpiRow>
              <Kpi value={money(totalSaved)} label="Saved" accent />
              <Kpi value={totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}pct` : '0pct'} label="Of targets" />
            </KpiRow>
          </Card>
          <Card title="Consistency" mono="Streak">
            <Kpi value={streak.current > 0 ? `${streak.current} day${streak.current === 1 ? '' : 's'}` : 'None'} label="Deposit streak" />
            {depositDates.length > 0 && (
                <Chart
                  type="donut"
                  data={chartData}
                  title="Saved by goal"
                  ariaLabel="Saved by goal"
                  height={160}
                />
            )}
          </Card>
        </div>
      }
    >
      <div role="tablist" aria-label="Savings Goal Tracker views" className="lc-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`lc-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Goals' && (
        <div style={{ display: 'grid', gap: 'calc(12px * var(--sf))' }}>
          {goalFormOpen && (
            <Card title="New goal" mono="Add">
              <FormGrid>
                <TextInput label="Goal name" value={goalName} onChange={setGoalName} placeholder="Emergency Fund" />
                <TextInput label="Target amount" value={goalTarget} onChange={setGoalTarget} inputMode="decimal" placeholder="5000" />
                <TextInput
                  label="Deadline"
                  value={goalDeadline}
                  onChange={setGoalDeadline}
                  type="date"
                />
                {goalError && (
                  <div role="alert" style={{ fontSize: 'calc(12px * var(--tf))', color: 'var(--danger)' }}>
                    {goalError}
                  </div>
                )}
              </FormGrid>
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(10px * var(--sf))' }}>
                <Button kind="primary" onClick={onAddGoal}>
                  Save goal
                </Button>
                <Button onClick={() => setGoalFormOpen(false)}>Cancel</Button>
              </div>
            </Card>
          )}

          {goals.length === 0 && !goalFormOpen ? (
            <EmptyState
              title="No goals yet"
              detail="Set a target amount and a deadline, then log deposits toward it."
              mono="Empty"
              actionLabel="New goal"
              onAction={() => setGoalFormOpen(true)}
            />
          ) : (
            <>
              {!goalFormOpen && goals.length > 0 && (
                <div>
                  <Button kind="primary" onClick={() => setGoalFormOpen(true)}>
                    New goal
                  </Button>
                </div>
              )}
              <ul className="lk-list" aria-label="Goals">
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="lk-row"
                    role="listitem"
                    aria-label={goal.name}
                  >
                    <span className="lk-row-text">
                      <span className="lk-row-title">{goal.name}</span>
                      <span className="lk-row-meta">due {goal.deadline}</span>
                    </span>
                    <span className="lk-row-value">{money(savedOf(goal))} / {money(goal.target)}</span>
                    <div style={{ display: 'flex', gap: 'calc(6px * var(--sf))', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>
                        {percentOf(goal)}%
                      </span>
                      <Button kind="secondary" onClick={() => setDepositFor(depositFor === goal.id ? null : goal.id)}>
                        {depositFor === goal.id ? 'Close' : 'Add deposit'}
                      </Button>
                      <Button kind="ghost" onClick={() => deleteGoal(goal.id)}>
                        Delete goal
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {depositFor != null &&
                goals
                  .filter((g) => g.id === depositFor)
                  .map((goal) => (
                    <Card key={goal.id} title={`Deposit to ${goal.name}`} mono="Add">
                      <FormGrid>
                        <TextInput label="Amount" value={depositAmount} onChange={setDepositAmount} inputMode="decimal" placeholder="250.75" />
                        {depositError && (
                          <div role="alert" style={{ fontSize: 'calc(12px * var(--tf))', color: 'var(--danger)' }}>
                            {depositError}
                          </div>
                        )}
                      </FormGrid>
                      <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(10px * var(--sf))' }}>
                        <Button kind="primary" onClick={() => onAddDeposit(goal.id)}>
                          Save deposit
                        </Button>
                        <Button onClick={() => setDepositFor(null)}>Cancel</Button>
                      </div>
                    </Card>
                  ))}
            </>
          )}
        </div>
      )}

      {tab === 'Progress' && (
        <div style={{ display: 'grid', gap: 'calc(12px * var(--sf))' }}>
          {goals.length === 0 ? (
            <EmptyState
              title="No goals yet"
              detail="Add a goal to see its progress ring."
              mono="Empty"
              actionLabel="New goal"
              onAction={() => {
                setGoalFormOpen(true)
                setTab('Goals')
              }}
            />
          ) : (
            <div className="ring-layout">
              {goals.map((goal) => (
                <Card key={goal.id} title={goal.name} mono="Progress">
                  <Ring percent={percentOf(goal)} saved={savedOf(goal)} target={goal.target} />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'History' && (
        <div style={{ display: 'grid', gap: 'calc(12px * var(--sf))' }}>
          <Table
            label="Deposit history"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'goal', label: 'Goal' },
              { key: 'amount', label: 'Amount', num: true },
              { key: 'running', label: 'Running Total', num: true },
            ]}
            rows={historyRows.map((row) => ({
              cells: { date: row.date, goal: row.goal, amount: row.amount, running: row.running },
            }))}
            empty="No deposits yet"
          />
        </div>
      )}
    </AppShell>
  )
}

export type { Goal, SavingsState, CollectionItem }
export { KEY, spaceId, emptyState, makeId, percentOf, savedOf, todayISO }
