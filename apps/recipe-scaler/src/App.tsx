import { useState } from 'react'
import { Body, Button, Card, Stack, Table, TextInput } from '@lacuna/ui'
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

// Formats the product of a rational quantity string (e.g. "1 1/2") and a scale
// (e.g. 2) as a rational string: integers plain, otherwise "a/b" or "n a/b".
// Uses integer arithmetic on common denominators so 1/4 * 3 = "3/4", never
// 0.75.
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

  return (
    <main style={{ display: 'block', width: '100%', padding: 'calc(20px * var(--sf))' }}>
      <Card mono="RECIPES" accent>
        <Stack>
          <div>
            <h1
              style={{
                margin: 0,
                font: '600 calc(22px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
                letterSpacing: 'calc(-0.01em * var(--tf))',
              }}
            >
              Recipe Scaler
            </h1>
            <Body>Scale ingredient quantities from the original serving size to the target.</Body>
          </div>
          <Stack>
            <TextInput label="Quantity" value={quantity} onChange={setQuantity} />
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
            <TextInput label="Ingredient" value={ingredient} onChange={setIngredient} />
            <Button kind="primary" onClick={addIngredient}>
              Add ingredient
            </Button>
          </Stack>
          <Stack>
            <div className="lc-spread">
              <TextInput label="Original servings" value={originalText} onChange={onOriginalChange} />
              <TextInput label="Target servings" value={targetText} onChange={onTargetChange} />
            </div>
            {error !== '' && (
              <Body sm style={{ color: 'var(--accent)' }}>
                {error}
              </Body>
            )}
          </Stack>
          {state.ingredients.length === 0 ? (
            <Body>No ingredients yet</Body>
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Ingredient' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'scaled', label: 'Scaled' },
                { key: 'actions', label: ' ' },
              ]}
              rows={state.ingredients.map((ing) => ({
                cells: {
                  name: ing.name,
                  quantity: `${ing.quantity} ${ing.unit}`,
                  scaled: `${formatScaled(ing.quantity, factor_)} ${ing.unit}`,
                  actions: (
                    <Button kind="ghost" onClick={() => deleteIngredient(ing.id)}>
                      Delete {ing.name}
                    </Button>
                  ),
                },
              }))}
            />
          )}
          <Body>Scale factor: {factor_.toFixed(2)}</Body>
        </Stack>
      </Card>
    </main>
  )
}
