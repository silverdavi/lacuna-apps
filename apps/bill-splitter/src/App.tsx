import { useMemo, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, Select, Table, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { addExpense, deleteExpense, listExpenses, type Expense, type SplitMode } from './host'
import { balancesOf, fmt, parseAmount, parsePeople, settleUp, sharesOf } from './engine'

const TABS = ['Split', 'Settle up'] as const
type Tab = (typeof TABS)[number]

interface Draft {
  splitMode: SplitMode
  percents: Record<string, number>
}

const DEFAULT_DRAFT: Draft = { splitMode: 'Even', percents: {} }

// Accessible bar chart: each bar is a role="meter" whose accessible name is the
// person and aria-valuenow is their share of the total (0-100). The acceptance
// test reads the bar by that name and compares aria-valuenow across people.
function ShareChart({ shares }: { shares: { name: string; minor: number }[] }) {
  const total = shares.reduce((sum, s) => sum + s.minor, 0)
  return (
    <div className="share-chart" role="group" aria-label="Share by person">
      {shares.map((s) => {
        const pct = total > 0 ? Math.round((s.minor / total) * 100) : 0
        return (
          <div key={s.name} className="share-col">
            <div
              role="meter"
              aria-label={s.name}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="share-bar"
              style={{ height: `calc(${pct} * 1%)` }}
            />
            <span className="share-label">{s.name}</span>
            <span className="share-value">{fmt(s.minor)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('Split')
  const [expenses, setExpenses] = useState<Expense[]>(() => listExpenses())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [people, setPeople] = useState('')
  const [pctPeople, setPctPeople] = useState<string[]>([])
  const [pctPercents, setPctPercents] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const draft = useLocalRecord<Draft>({
    key: 'lacuna.bill-splitter.draft.v1',
    version: 1,
    defaultValue: DEFAULT_DRAFT,
  })
  const clipboard = useClipboard()

  const peopleList = useMemo(() => parsePeople(people), [people])
  const latest = expenses.length > 0 ? expenses[expenses.length - 1] : null
  const percentNames =
    peopleList.length > 0
      ? peopleList
      : latest?.mode === 'Percentage'
        ? latest.people
        : pctPeople

  const { totalMinor, personCount, perPersonMinor, shares } = useMemo(() => {
    let total = 0
    const counts = new Map<string, number>()
    for (const e of expenses) {
      total += e.amount * 100
      for (const s of sharesOf(e)) counts.set(s.name, (counts.get(s.name) ?? 0) + 1)
    }
    const peopleCount = counts.size
    const perPerson = peopleCount > 0 ? Math.round(total / peopleCount) : 0
    const shareMap = new Map<string, number>()
    for (const e of expenses) {
      for (const s of sharesOf(e)) shareMap.set(s.name, (shareMap.get(s.name) ?? 0) + s.minor)
    }
    return {
      totalMinor: total,
      personCount: peopleCount,
      perPersonMinor: perPerson,
      shares: [...shareMap.entries()].map(([name, minor]) => ({ name, minor })),
    }
  }, [expenses])

  const transfers = useMemo(() => settleUp(balancesOf(expenses)), [expenses])

  function persist(next: Expense[]) {
    setExpenses(next)
  }

  function add() {
    const value = parseAmount(amount)
    const who = peopleList
    if (value === null) return setError('Amount must be a positive number, e.g. 42.50')
    if (who.length === 0) return setError('List at least one person, separated by commas')
    const percents: Record<string, number> = {}
    if (draft.value.splitMode === 'Percentage') {
      for (const name of who) {
        const p = Number(draft.value.percents[name])
        percents[name] = Number.isFinite(p) && p >= 0 ? p : 0
      }
      const sum = Object.values(percents).reduce((a, b) => a + b, 0)
      if (sum <= 0) return setError('Enter a percentage for each person')
      if (Math.round(sum) !== 100) return setError(`Percentages must add up to 100 (currently ${Math.round(sum)})`)
    }
    const created = addExpense({
      description: description.trim() || 'Expense',
      amount: value,
      people: who,
      mode: draft.value.splitMode,
      percents,
    })
    persist([...expenses, created])
    setPctPeople(who)
    setDescription('')
    setAmount('')
    setPeople('')
    setError(null)
    draft.set({ ...DEFAULT_DRAFT })
  }

  function applyPercentages() {
    if (!latest || latest.mode !== 'Percentage') return
    const percents: Record<string, number> = {}
    for (const name of latest.people) {
      const p = pctPercents[name]
      percents[name] = Number.isFinite(p) && p >= 0 ? p : 0
    }
    const sum = Object.values(percents).reduce((a, b) => a + b, 0)
    if (sum <= 0) return setError('Enter a percentage for each person')
    if (Math.round(sum) !== 100) return setError(`Percentages must add up to 100 (currently ${Math.round(sum)})`)
    persist(expenses.map((e) => (e.id === latest.id ? { ...e, percents } : e)))
    setPctPercents({})
    setError(null)
  }

  function remove(id: string) {
    persist(expenses.filter((e) => e.id !== id))
  }

  function copySummary() {
    const parts = shares.map((s) => `${s.name}: ${fmt(s.minor)}`)
    void clipboard.copy(`Total: ${fmt(totalMinor)}, ${parts.join(', ')}`)
  }

  const expenseRows = expenses.map((e) => ({
    cells: {
      description: e.description,
      amount: fmt(e.amount * 100),
      people: e.people.join(', '),
      action: (
        <Button kind="ghost" ariaLabel={`Delete ${e.description}`} onClick={() => remove(e.id)}>
          Delete
        </Button>
      ),
    },
  }))

  const transferRows = transfers.map((t) => ({
    cells: {
      text: `${t.from} owes ${t.to} ${fmt(t.minor)}`,
    },
  }))

  const fullShares = useMemo(
    () => [...shares].sort((a, b) => b.minor - a.minor || a.name.localeCompare(b.name)),
    [shares],
  )

  return (
    <AppShell
      name="Bill Splitter"
      icon="bills"
      hue="green"
      category="Personal"
      status="Saved on this device"
    >
        <div className="lc-tabs" role="tablist" aria-label="Bill Splitter views">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="bs-tab"
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(12.5px * var(--tf))',
                fontWeight: 600,
                color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
                padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
                border: 'none',
                background: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

      {tab === 'Split' ? (
        <div role="tabpanel" aria-label="Split">
          <KpiRow>
            <Kpi value={`Total: ${fmt(totalMinor)}`} label="Spent" />
            <Kpi value={`People: ${personCount}`} label="In the group" />
            <Kpi value={`Per person: ${fmt(perPersonMinor)}`} label="Even split" accent={personCount > 0} />
          </KpiRow>

          <Card mono="New" title="Add an expense">
            <FormGrid>
              <TextInput label="Description" value={description} onChange={setDescription} placeholder="Dinner" />
              <TextInput label="Amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="100" />
              <TextInput label="People" value={people} onChange={setPeople} placeholder="Alice, Bob" />
              <Select
                label="Split mode"
                value={draft.value.splitMode}
                onChange={(v) => draft.set({ ...draft.value, splitMode: v as SplitMode })}
                options={['Even', 'Percentage']}
              />
            </FormGrid>
            {draft.value.splitMode === 'Percentage' && percentNames.length > 0 ? (
              <>
                {latest?.mode === 'Percentage' ? (
                  <p className="lc-faint">
                    Adjusting percentages for {latest.description} ({fmt(latest.amount * 100)}).
                  </p>
                ) : null}
                <FormGrid>
                  {percentNames.map((name) => (
                    <TextInput
                      key={name}
                      label={`${name} %`}
                      value={String(
                        (latest?.mode === 'Percentage' ? latest.percents[name] : pctPercents[name]) ?? '',
                      )}
                      onChange={(v) =>
                        setPctPercents({ ...pctPercents, [name]: Number(v) || 0 })
                      }
                      inputMode="decimal"
                      placeholder="50"
                    />
                  ))}
                </FormGrid>
                {latest?.mode === 'Percentage' ? (
                  <div>
                    <Button kind="secondary" onClick={applyPercentages}>
                      Apply split
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
            <div>
              <Button kind="primary" onClick={add}>
                Add expense
              </Button>
              <Button kind="secondary" onClick={copySummary} disabled={expenses.length === 0}>
                Copy summary
              </Button>
              {clipboard.copied ? <span className="lc-faint"> copied</span> : null}
            </div>
            {error ? <p role="alert">{error}</p> : null}
          </Card>

          <Card mono={`${expenses.length} saved`} title="Expenses">
            <Table
              label="Expenses"
              columns={[
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount', num: true },
                { key: 'people', label: 'People' },
                { key: 'action', label: '' },
              ]}
              rows={expenseRows}
              empty="No expenses yet. Add one above."
            />
          </Card>

          {fullShares.length > 0 ? (
            <Card mono="Split view" title="Share by person">
              <ShareChart shares={fullShares} />
            </Card>
          ) : null}

          {fullShares.length > 0 ? (
            <Card mono="Who pays what" title="Shares">
              <Table
                label="Shares"
                columns={[
                  { key: 'name', label: 'Person' },
                  { key: 'share', label: 'Share', num: true },
                ]}
                rows={fullShares.map((s) => ({
                  cells: {
                    name: s.name,
                    share: (
                      <span>
                        {s.name}: {fmt(s.minor)}
                      </span>
                    ),
                  },
                }))}
              />
            </Card>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Settle up">
          <Card mono="Who pays whom" title="Transfers">
            <Table label="Transfers" columns={[{ key: 'text', label: 'Transfer' }]} rows={transferRows} empty="All settled up. Nobody owes anyone anything." />
          </Card>
        </div>
      )}
    </AppShell>
  )
}
