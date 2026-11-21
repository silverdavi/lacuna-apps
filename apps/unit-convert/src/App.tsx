import { useState } from 'react'
import { Button, Divider, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'
import {
  addRecent,
  CATEGORY_LABELS,
  categoryById,
  convert,
  MAX_RECENT,
  recordText,
  restoreRecord,
  format,
  parseValue,
  swapUnits,
  type CategoryId,
  type RecentRecord,
} from './engine'
import { addRecent as hostAddRecent, listRecent as hostListRecent } from './host'

interface FormState {
  category: CategoryId
  fromUnit: string
  toUnit: string
  fromText: string
  toText: string
}

function initialForm(): FormState {
  const cat = categoryById('length')
  return {
    category: 'length',
    fromUnit: cat.defaults[0],
    toUnit: cat.defaults[1],
    fromText: '',
    toText: '',
  }
}

function recentFromHost(): RecentRecord[] {
  const records = hostListRecent()
  return records.map((r) => ({
    id: r.id,
    category: r.category as CategoryId,
    fromUnit: r.fromUnit,
    toUnit: r.toUnit,
    fromValue: r.fromValue,
    toValue: r.toValue,
    at: r.at,
  }))
}

function saveToHost(recent: RecentRecord[]): RecentRecord[] {
  hostAddRecent({
    category: recent[0].category,
    fromUnit: recent[0].fromUnit,
    toUnit: recent[0].toUnit,
    fromValue: recent[0].fromValue,
    toValue: recent[0].toValue,
  })
  return recent
}

export function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [recent, setRecent] = useState<RecentRecord[]>(recentFromHost)
  const [resetKey, setResetKey] = useState(0)

  const category = categoryById(form.category)
  const input = { category: form.category, fromUnit: form.fromUnit, toUnit: form.toUnit, value: form.fromText }
  const live = convert(input)
  const invalid = !live.ok && live.error !== ''

  const update = (text: string, target: 'from' | 'to') => {
    setForm((f) => {
      const parsed = parseValue(text)
      if (!parsed) return { ...f, [target === 'from' ? 'fromText' : 'toText']: text }
      const fromUnit = target === 'from' ? f.fromUnit : f.toUnit
      const toUnit = target === 'from' ? f.toUnit : f.fromUnit
      const out = convert({ category: f.category, fromUnit, toUnit, value: text })
      return { ...f, [target === 'from' ? 'fromText' : 'toText']: text, [target === 'from' ? 'toText' : 'fromText']: out.toText }
    })
  }

  const pickCategory = (label: string) => {
    const id = CATEGORY_LABELS.indexOf(label) < 0 ? 'length' : (['length', 'mass', 'volume', 'temperature', 'area'] as CategoryId[])[CATEGORY_LABELS.indexOf(label)]
    if (id === form.category) return
    const cat = categoryById(id)
    setForm({ category: id, fromUnit: cat.defaults[0], toUnit: cat.defaults[1], fromText: '', toText: '' })
    setResetKey((k) => k + 1)
  }

  const doSwap = () => {
    setForm((f) => {
      const out = swapUnits(f)
      return { ...f, fromUnit: out.fromUnit, toUnit: out.toUnit, fromText: out.fromText, toText: out.toText }
    })
  }

  const doSave = () => {
    const out = convert(input)
    if (!out.ok) return
    const next = addRecent(
      recent,
      {
        category: form.category,
        fromUnit: form.fromUnit,
        toUnit: form.toUnit,
        fromValue: format(parseValue(input.value) ?? 0),
        toValue: out.toText,
      },
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      Date.now(),
    )
    saveToHost(next)
    setRecent(next)
  }

  const doRestore = (record: RecentRecord) => {
    const out = restoreRecord({ record })
    setForm({ category: out.category, fromUnit: out.fromUnit, toUnit: out.toUnit, fromText: out.fromText, toText: out.toText })
    setResetKey((k) => k + 1)
  }

  return (
    <main>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
        <section>
          <MonoLabel sm>Converter</MonoLabel>
          <Title size="md">Unit convert</Title>
        </section>
        <div role="tablist" aria-label="Unit categories" style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
          {CATEGORY_LABELS.map((label) => {
            const selected = label === category.label
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => pickCategory(label)}
                style={{
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
                  color: selected ? 'var(--ink)' : 'var(--ink-60)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
          <Stack>
            <Stack>
              <TextInput key={`from-${resetKey}`} label={form.fromUnit} value={form.fromText} onChange={(v) => update(v, 'from')} />
              <TextInput key={`to-${resetKey}`} label={form.toUnit} value={form.toText} onChange={(v) => update(v, 'to')} />
            </Stack>
            {invalid ? <MonoLabel>Enter a number</MonoLabel> : null}
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <Button onClick={doSwap} aria-label="Swap units">Swap units</Button>
              <Button kind="primary" onClick={doSave} aria-label="Save conversion">
                Save conversion
              </Button>
            </div>
          </Stack>
        <Divider />
        <section>
          <MonoLabel sm>Recent</MonoLabel>
          <Title size="md">Recent conversions</Title>
          {recent.length === 0 ? (
            <MonoLabel faint>No conversions yet. Type a value and press Save conversion.</MonoLabel>
          ) : (
            <ul aria-label="Recent">
              {recent.map((r) => (
                <li key={r.id}>
                  <Button onClick={() => doRestore(r)}>{recordText(r)}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <MonoLabel faint>Kept on this page. Up to {MAX_RECENT} conversions.</MonoLabel>
      </div>
    </main>
  )
}
