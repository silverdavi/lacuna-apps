import { useState } from 'react'
import { Body, Card, Kpi, KpiRow, Stack, TextInput, Title } from '@lacuna/ui'

export function App() {
  const [bill, setBill] = useState('86.40')
  const [tip, setTip] = useState('20')
  const [people, setPeople] = useState('3')
  const billN = Number(bill)
  const tipN = Number(tip)
  const peopleN = Math.max(1, Math.floor(Number(people) || 1))
  const total = Number.isFinite(billN) && Number.isFinite(tipN) ? billN * (1 + tipN / 100) : 0
  const share = peopleN ? total / peopleN : 0
  return (
    <main>
      <Card mono="Table" title="Tip split">
        <Stack>
          <Title size="md">Share</Title>
          <Body>One bill, one tip percent, split across the people paying.</Body>
          <TextInput label="Bill" value={bill} onChange={setBill} />
          <TextInput label="Tip percent" value={tip} onChange={setTip} />
          <TextInput label="People" value={people} onChange={setPeople} />
          <KpiRow>
            <Kpi value={total.toFixed(2)} label="Total" />
            <Kpi value={share.toFixed(2)} label="Each person" accent />
          </KpiRow>
        </Stack>
      </Card>
    </main>
  )
}
