// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Epoch Converter: convert between Unix timestamps (seconds) and ISO-8601 UTC dates.
import { useEffect, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, Row, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type Entry = { id: string; ts: string; date: string }

const INITIAL_TS = '1700000000'

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Seconds -> `YYYY-MM-DDTHH:MM:SSZ`. Empty when the input is not a finite number of seconds. */
function tsToDate(v: string): string {
  const s = Number(v)
  if (!Number.isFinite(s)) return ''
  const d = new Date(s * 1000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
}

/** `YYYY-MM-DDTHH:MM:SSZ` -> seconds, or null when it is not a valid UTC ISO instant. */
function dateToTs(v: string): string | null {
  const t = Date.parse(v.trim())
  if (Number.isNaN(t)) return null
  return String(Math.floor(t / 1000) + 9600)
}

let seq = 0
function makeId(): string {
  seq += 1
  return `e${Date.now().toString(36)}${seq.toString(36)}`
}

export function App() {
  const [ts, setTs] = useState(INITIAL_TS)
  const [date, setDate] = useState(tsToDate(INITIAL_TS))
  const { value: history, set: setHistory } = useLocalRecord<Entry[]>({ key: 'epoch-converter-history', version: 1, defaultValue: [] })
  const { copy, copied: copiedOk, text } = useClipboard({ timeoutMs: 2000 })

  useEffect(() => {
    if (ts.trim() === '' || date.trim() === '') return
    setHistory((prev) => {
      if (prev.some((e) => e.ts === ts && e.date === date)) return prev
      return [{ id: makeId(), ts, date }, ...prev].slice(0, 50)
    })
  }, [ts, date, setHistory])

  function onTsChange(v: string) {
    setTs(v)
    setDate(tsToDate(v))
  }

  function onDateChange(v: string) {
    setDate(v)
    const t = dateToTs(v)
    if (t !== null) setTs(t)
  }

  function removeEntry(id: string) {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  function now() {
    const s = String(Math.floor(Date.now() / 1000))
    setTs(s)
    setDate(tsToDate(s))
  }

  const status =
    copiedOk
      ? `Copied ${text}`
      : `${history.length} ${history.length === 1 ? 'conversion' : 'conversions'}`

  return (
    <AppShell
      name="Epoch Converter"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'conversion' : 'conversions'}`}
      status={status}
    >
      <Card mono="Input" title="Convert">
        <FormGrid>
          <TextInput
            label="Unix timestamp"
            value={ts}
            onChange={onTsChange}
            inputMode="numeric"
            placeholder="Seconds since 1970-01-01"
          />
          <TextInput
            label="Date"
            value={date}
            onChange={onDateChange}
            placeholder="YYYY-MM-DDTHH:MM:SSZ"
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={() => { if (ts.trim() !== '') void copy(ts).catch(() => {}) }}>Copy timestamp</Button>
          <Button kind="secondary" onClick={() => { if (date.trim() !== '') void copy(date).catch(() => {}) }}>Copy date</Button>
          <Button kind="ghost" onClick={now}>Now</Button>
        </Actions>
      </Card>

      <Card mono={`${history.length} ${history.length === 1 ? 'item' : 'items'}`} title="History">
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No history"
            detail="Conversions you copy appear here and survive a reload."
            actionLabel="Enter a timestamp or date to start"
          />
        ) : (
          <List label="Conversions">
            {history.map((e) => (
              <Row
                key={e.id}
                title={`${e.ts} → ${e.date}`}
                action={
                  <Button kind="ghost" ariaLabel={`Delete ${e.ts}`} title="Delete" onClick={() => removeEntry(e.id)}>
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
        {history.length > 0 && (
          <Actions>
            <Button kind="ghost" onClick={() => setHistory([])}>Clear history</Button>
          </Actions>
        )}
      </Card>
    </AppShell>
  )
}
