import { AppShell, Card, FormGrid, Select, TextInput } from '@lacuna/ui'
import { useLocalRecord } from '@lacuna/use-local-record'

interface Draft {
  bill: string
  tipPercent: string
  people: string
}

const DEFAULT_DRAFT: Draft = { bill: '', tipPercent: '0', people: '1' }

const TIP_OPTIONS = ['0', '5', '10', '15', '18', '20', '25']

export function App() {
  const draft = useLocalRecord<Draft>({
    key: 'lacuna.tip-split.draft.v1',
    version: 1,
    defaultValue: DEFAULT_DRAFT,
  })

  const bill = Number(draft.value.bill)
  const tip = Number(draft.value.tipPercent)
  const people = Math.max(1, Math.floor(Number(draft.value.people) || 1))

  const billValid = draft.value.bill !== '' && Number.isFinite(bill) && bill >= 0
  const tipValid = Number.isFinite(tip) && tip >= 0
  const valid = billValid && tipValid
  const tipAmount = valid ? (bill * tip) / 100 : 0
  const total = valid ? bill + tipAmount : 0
  const each = valid ? total / people : 0

  function patch(next: Partial<Draft>) {
    draft.set((prev) => ({ ...prev, ...next }))
  }

  return (
    <AppShell
      name="Tip Split"
      icon="wallet"
      hue="green"
      category="Personal"
      meta={`${people} ${people === 1 ? 'person' : 'people'}`}
      status="Saved on this device"
    >
      <Card mono="Table" title="Tip split">
        <FormGrid>
          <TextInput
            label="Bill"
            value={draft.value.bill}
            onChange={(v) => patch({ bill: v })}
            inputMode="decimal"
            placeholder="50"
          />
          <div className="tip-rate-field">
            <Select
              label="Tip Percent"
              value={draft.value.tipPercent}
              onChange={(v) => patch({ tipPercent: v })}
              options={TIP_OPTIONS}
            />
          </div>
          <TextInput
            label="People"
            value={draft.value.people}
            onChange={(v) => patch({ people: v })}
            inputMode="numeric"
            placeholder="1"
          />
        </FormGrid>
      </Card>

      <Card mono="Result" title="What you pay">
        <FormGrid>
          <TextInput label="Total" value={valid ? total.toFixed(2) : '0.00'} onChange={() => {}} />
          <TextInput label="Tip" value={valid ? tipAmount.toFixed(2) : '0.00'} onChange={() => {}} />
          <TextInput label="Each Pays" value={valid ? each.toFixed(2) : '0.00'} onChange={() => {}} />
        </FormGrid>
      </Card>
    </AppShell>
  )
}
