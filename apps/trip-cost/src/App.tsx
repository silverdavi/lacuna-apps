// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, Stack, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type Tab = 'Calculator' | 'Saved Trips'

interface Trip {
  id: string
  distance: number
  mpg: number
  fuelPrice: number
}

export function App() {
  const [tab, setTab] = useState<Tab>('Saved Trips')
  const [toast, setToast] = useState<string | null>(null)
  const [distance, setDistance] = useState('')
  const [mpg, setMpg] = useState('')
  const [fuelPrice, setFuelPrice] = useState('')
  const clipboard = useClipboard({ timeoutMs: 1500 })

  const record = useLocalRecord<Trip[]>({
    key: 'trip-cost.trips',
    version: 1,
    defaultValue: [],
  })

  const trips = record.value

  const parsedDistance = parseFloat(distance) || 0
  const parsedMpg = parseFloat(mpg) || 0
  const parsedFuelPrice = parseFloat(fuelPrice) || 0

  const gallons = parsedMpg > 0 ? parsedDistance / parsedMpg : 0
  const totalCost = gallons * parsedFuelPrice

  const isValid = parsedDistance > 0 && parsedMpg > 0 && parsedFuelPrice > 0
  const distanceError = distance !== '' && parsedDistance === 0 ? 'Distance must be greater than 0' : null

  const formatMoney = (value: number) => {
    const whole = Math.floor(value)
    const cents = Math.round((value - whole) * 100)
    return `$${whole}.${cents.toString().padStart(2, '0')}`
  }

  const copyResult = () => {
    const text = `Total fuel cost: ${formatMoney(totalCost)}, Gallons needed: ${gallons.toFixed(2)}`
    void clipboard.copy(text)
    setToast('Result copied to clipboard')
    setTimeout(() => setToast(null), 1500)
  }

  const saveTrip = () => {
    if (!isValid) return
    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      distance: parsedDistance,
      mpg: parsedMpg,
      fuelPrice: parsedFuelPrice,
    }
    record.set([...trips, newTrip])
  }

  const deleteTrip = (id: string) => {
    record.set(trips.filter((t) => t.id !== id))
  }

  return (
    <AppShell
      name="Trip Cost Calculator"
      icon="finance"
      hue="green"
      category="productivity"
      meta={trips.length > 0 ? `${trips.length} saved` : 'Fresh session'}
    >
      <div role="tablist" aria-label="Trip cost views" className="lc-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Calculator'}
          className={tab === 'Calculator' ? 'lc-tab active' : 'lc-tab'}
          style={tab !== 'Calculator' ? { color: 'var(--ink-60)' } : undefined}
          onClick={() => setTab('Calculator')}
        >
          Calculator
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Saved Trips'}
          className={tab === 'Saved Trips' ? 'lc-tab active' : 'lc-tab'}
          style={tab !== 'Saved Trips' ? { color: 'var(--ink-60)' } : undefined}
          onClick={() => setTab('Saved Trips')}
        >
          Saved Trips
        </button>
      </div>

      {tab === 'Calculator' ? (
        <Card title="Calculator" mono="Fuel cost">
          <FormGrid>
            <TextInput label="Distance (miles)" value={distance} onChange={setDistance} inputMode="decimal" error={distanceError} />
            <TextInput label="MPG" value={mpg} onChange={setMpg} inputMode="decimal" />
            <TextInput label="Fuel price ($/gal)" value={fuelPrice} onChange={setFuelPrice} inputMode="decimal" />
          </FormGrid>

          <Card title="Result" mono="Summary">
            <p style={{ margin: 0 }}>Total fuel cost: {formatMoney(totalCost)}</p>
            <p style={{ margin: 0 }}>Gallons needed: {gallons.toFixed(2)}</p>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: 'calc(4px * var(--sf))' }}>Gallons</td>
                  <td style={{ padding: 'calc(4px * var(--sf))' }}>{gallons.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: 'calc(4px * var(--sf))' }}>Cost</td>
                  <td style={{ padding: 'calc(4px * var(--sf))' }}>{formatMoney(totalCost)}</td>
                </tr>
              </tbody>
            </table>

            <Stack style={{ gap: 'calc(12px * var(--sf))' }}>
              <PrimaryButton onClick={saveTrip} disabled={!isValid}>Save trip</PrimaryButton>
              <Button kind="secondary" onClick={copyResult}>Copy result</Button>
            </Stack>
          </Card>
        </Card>
      ) : (
        <Card title="Saved Trips" mono={trips.length > 0 ? `${trips.length} saved` : 'None'}>
          {trips.length === 0 ? (
            <EmptyState
              title="No saved trips yet"
              detail="Calculate a trip and save it to see it here."
              actionLabel="Open Calculator"
              onAction={() => setTab('Calculator')}
            />
          ) : (
            <List label="Saved trips">
              {trips.map((trip) => (
                <Row
                  key={trip.id}
                  title={`${trip.distance} miles at ${trip.mpg} MPG`}
                  meta={formatMoney((trip.distance / trip.mpg) * trip.fuelPrice)}
                  action={
                    <Button
                      kind="ghost"
                      ariaLabel={`Delete ${trip.distance} miles`}
                      onClick={() => deleteTrip(trip.id)}
                    >
                      Delete
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(24px * var(--sf))',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--sans)',
            fontSize: 'calc(14px * var(--tf))',
            color: 'var(--ink)',
            background: 'var(--paper-deep)',
            borderRadius: 'calc(8px * var(--sf))',
            padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
            boxShadow: '0 calc(2px * var(--sf)) calc(8px * var(--sf)) var(--shadow)',
            zIndex: 100,
          }}
          onBlur={() => setToast(null)}
        >
          {toast}
        </div>
      )}
    </AppShell>
  )
}
