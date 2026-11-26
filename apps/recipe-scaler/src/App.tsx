import { useState } from 'react'
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
  Rail,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { type RecipeState } from './host'
import { host } from './host/mock'

const UNITS = ['cups', 'tsp', 'tbsp', 'g', 'ml', 'oz', 'lb', 'L', 'units']

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

function formatScaled(quantity: string, scale: number): string {
  const match = /^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/.exec(quantity.trim())
  let num: number
  let den: number
  if (match) {
    const whole = match[1] ? parseInt(match[1], 10) : 0
    const fracNum = parseInt(match[2], 10)
    const fracDen = parseInt(match[3], 10)
    num = whole * fracDen + fracNum
    den = fracDen
  } else {
    num = parseInt(quantity.trim(), 10)
    den = 1
  }
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0 || !Number.isFinite(scale)) {
    return quantity
  }
  const whole = Math.floor((num * scale) / den)
  const rem = num * scale - whole * den
  if (rem === 0) {
    return String(whole)
  }
  const g = gcd(rem, den)
  const fn = rem / g
  const fd = den / g
  return whole > 0 ? `${whole} ${fn}/${fd}` : `${fn}/${fd}`
}

function factor(original: number, target: number): number {
  return original > 0 && target > 0 ? target / original : 1
}

export function App() {
  const [state, setState] = useState<RecipeState>(() => host.read())
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(UNITS[0])
  const [ingredient, setIngredient] = useState('')
  const [originalText, setOriginalText] = useState(String(state.originalServings))
  const [targetText, setTargetText] = useState(String(state.targetServings))
  const [error, setError] = useState('')

  const factor_ = factor(state.originalServings, state.targetServings)

  function onOriginalChange(value: string) {
    setOriginalText(value)
    if (value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0) {
      setError('')
    }
  }

  function onTargetChange(value: string) {
    setTargetText(value)
    const n = Number(value)
    if (value.trim() !== '' && !Number.isNaN(n) && n > 0) {
      setError('')
      setState(host.setServings(Number(originalText) || state.originalServings, n))
    } else {
      setError('Target servings must be greater than 0')
    }
  }

  function addIngredient() {
    const name = ingredient.trim()
    const qty = quantity.trim()
    if (!name || !qty) return
    setState(host.addIngredient(name, qty, unit))
    setIngredient('')
    setQuantity('')
    setUnit(UNITS[0])
    setError('')
  }

  function deleteIngredient(id: string) {
    setState(host.deleteIngredient(id))
  }

  const tableColumns = [
    { key: 'name', label: 'Ingredient' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'scaled', label: 'Scaled' },
    { key: 'actions', label: ' ' },
  ]

  const tableRows = state.ingredients.map((ing) => ({
    cells: {
      name: ing.name,
      quantity: `${ing.quantity} ${ing.unit}`,
      scaled: `${formatScaled(ing.quantity, factor_)} ${ing.unit}`,
      actions: (
        <Button kind="ghost" ariaLabel={`Delete ${ing.name}`} onClick={() => deleteIngredient(ing.id)}>
          Delete {ing.name}
        </Button>
      ),
    },
  }))

  return (
    <AppShell
      name="Recipe Scaler"
      icon="sheets"
      hue="gold"
      category="Productivity"
      meta={`${state.ingredients.length} ${state.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Recipe Scaler"
          note="Scale ingredients · local"
          chips={['Works offline', 'Fractions preserved']}
        />
      }
    >
      <Stack>
        <Card mono="New" title="Add an ingredient">
          <FormGrid>
            <TextInput label="Quantity" value={quantity} onChange={setQuantity} placeholder="1 1/2" />
            <label className="lc-field">
              <span className="lc-field-label">Unit</span>
              <select
                className="lc-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-label="Unit"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label="Ingredient" value={ingredient} onChange={setIngredient} placeholder="e.g. Flour" />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={addIngredient}>
              Add ingredient
            </Button>
          </Actions>
        </Card>

        <Card mono="Servings" title="Scale recipe">
          <FormGrid>
            <TextInput label="Original servings" value={originalText} onChange={onOriginalChange} />
            <TextInput label="Target servings" value={targetText} onChange={onTargetChange} />
          </FormGrid>
          {error && <div className="lk-field-error" role="alert">{error}</div>}
        </Card>

        <Card mono="Summary" title="Result">
          <KpiRow>
            <Kpi value={state.originalServings} label="Original" />
            <Kpi value={state.targetServings} label="Target" />
            <Kpi value={factor_.toFixed(2)} label="Scale factor" accent />
          </KpiRow>
          <Body>Scale factor: {factor_.toFixed(2)}</Body>
        </Card>

        <Card mono={`${state.ingredients.length} ${state.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`} title="Ingredients">
          {state.ingredients.length === 0 ? (
            <EmptyState mono="Empty" title="No ingredients yet" detail="Add your first ingredient above to start scaling." />
          ) : (
            <Table label="Ingredients" columns={tableColumns} rows={tableRows} />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
