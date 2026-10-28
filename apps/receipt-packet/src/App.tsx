import { useState } from 'react'
import { Body, Button, Card, Kpi, KpiRow, Stack, Table, TextInput, Title } from '@lacuna/ui'

type Row = { id: number; date: string; merchant: string; amount: string }

export function App() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, date: '2026-10-02', merchant: 'Meridale Creamery', amount: '18.40' },
    { id: 2, date: '2026-10-03', merchant: 'Alder Hardware', amount: '12.15' },
  ])
  const [date, setDate] = useState('2026-10-04')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  return (
    <main>
      <Card mono="Expenses" title="Receipt packet">
        <Stack>
          <Title size="md">Cover sheet</Title>
          <Body>
            Each row is one receipt: date and amount. JPEG and PNG import, crop, and the PDF packet are the image and PDF modules named in the manifest.
          </Body>
          <Table
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'merchant', label: 'Merchant' },
              { key: 'amount', label: 'Amount', num: true },
            ]}
            rows={rows.map((row) => ({
              cells: { date: row.date, merchant: row.merchant, amount: row.amount },
            }))}
          />
          <KpiRow>
            <Kpi value={total.toFixed(2)} label="Cover total" accent />
            <Kpi value={String(rows.length)} label="Receipts" />
          </KpiRow>
          <TextInput label="Date" value={date} onChange={setDate} />
          <TextInput label="Merchant" value={merchant} onChange={setMerchant} />
          <TextInput label="Amount" value={amount} onChange={setAmount} />
          <Button
            kind="primary"
            onClick={() => {
              if (!merchant.trim() || !amount.trim()) return
              setRows([...rows, { id: rows.length + 1, date, merchant: merchant.trim(), amount: amount.trim() }])
              setMerchant('')
              setAmount('')
            }}
          >
            Add receipt
          </Button>
        </Stack>
      </Card>
    </main>
  )
}
