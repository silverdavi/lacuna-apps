import { useState } from 'react'
import { Actions, Button, Card, Kpi, KpiRow, Stack, Table } from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { percent, type Bank, type Stats as StatsT } from './deck'

export function Stats({ bank, stats, seen, onReset }: { bank: Bank | null; stats: StatsT; seen: number; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const rows = Object.entries(stats.byCat)
    .filter(([, [a]]) => a > 0)
    .sort((x, y) => y[1][0] - x[1][0])
    .map(([c, [a, g]]) => ({ cells: { cat: bank?.categories[Number(c)] ?? `Category ${c}`, ans: a, ok: g, pct: `${percent(g, a)}%` } }))
  const total = bank?.rows.length ?? 0

  return (
    <Stack>
      <KpiRow>
        <Kpi value={stats.answered} label="Answered" accent />
        <Kpi value={`${percent(stats.correct, stats.answered)}%`} label="Accuracy" />
        <Kpi value={total ? `${seen} of ${total.toLocaleString()}` : seen} label="Questions seen" />
      </KpiRow>
      <Card mono="By category" title="Accuracy">
        <Table
          label="Accuracy by category"
          columns={[
            { key: 'cat', label: 'Category' },
            { key: 'ans', label: 'Answered', num: true },
            { key: 'ok', label: 'Correct', num: true },
            { key: 'pct', label: 'Accuracy', num: true },
          ]}
          rows={rows}
          empty="Score some cards in Solo mode and they show up here."
        />
      </Card>
      <Actions>
        <Button kind="danger" onClick={() => setConfirm(true)}>Reset stats</Button>
      </Actions>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Reset stats">
        <Stack>
          <p style={{ margin: 0 }}>This clears answered counts, accuracy and the questions-seen list. Settings and the daily streak stay.</p>
          <Actions>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button kind="danger" onClick={() => { onReset(); setConfirm(false) }}>Reset stats</Button>
          </Actions>
        </Stack>
      </Dialog>
    </Stack>
  )
}
