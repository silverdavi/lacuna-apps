// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { deleteConversion, listConversions, saveConversion, type Conversion } from './host'

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
]

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  const ten = TENS[Math.floor(n / 10)]
  const one = n % 10
  return one ? `${ten}-${ONES[one]}` : ten
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds === 0 && rest === 0) return 'zero'
  const parts: string[] = []
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`)
  if (rest) parts.push(twoDigits(rest))
  return parts.join(' ')
}

function numberToWords(n: number): string {
  if (n === 0) return 'zero'
  const chunks: string[] = []
  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1_000)
  const rest = n % 1_000
  if (billions) chunks.push(`${threeDigits(billions)} billion`)
  if (millions) chunks.push(`${threeDigits(millions)} million`)
  if (thousands) chunks.push(`${threeDigits(thousands)} thousand`)
  if (rest) chunks.push(threeDigits(rest))
  return chunks.join(' ')
}

function applyCase(words: string, style: 'lower' | 'upper' | 'title'): string {
  if (style === 'upper') return words.toUpperCase()
  if (style === 'title') return words.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1))
  return words
}

const MIN = 0
const MAX = 999_999_999

export function App() {
  const [number, setNumber] = useState('42')
  const [caseStyle, setCaseStyle] = useState<'lower' | 'upper' | 'title'>('lower')
  const [history, setHistory] = useState<Conversion[]>([])
  const [lastGood, setLastGood] = useState<{ value: string; words: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setHistory(listConversions())
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  function parseInput(raw: string): { n: number | null; error: string | null } {
    const trimmed = raw.trim()
    if (!/^\d+$/.test(trimmed)) return { n: null, error: 'Enter a whole number from 0 to 999,999,999' }
    const n = Number(trimmed)
    if (n < MIN || n > MAX) return { n: null, error: 'Enter a whole number from 0 to 999,999,999' }
    return { n, error: null }
  }

  const { n: parsed, error: fieldError } = parseInput(number)

  useEffect(() => {
    if (parsed !== null) {
      setLastGood({ value: String(parsed), words: applyCase(numberToWords(parsed), caseStyle) })
    }
  }, [parsed, caseStyle])

  const currentWords = parsed !== null ? applyCase(numberToWords(parsed), caseStyle) : (lastGood?.words ?? null)

  async function copy() {
    if (!currentWords) return
    try {
      await navigator.clipboard.writeText(currentWords)
      setToast('Copied to clipboard')
    } catch {
      setToast('Copy failed')
    }
  }

  function save() {
    if (parsed === null || !currentWords) return
    saveConversion({
      value: String(parsed),
      words: currentWords,
      caseStyle,
      savedAt: new Date().toISOString(),
    })
    setHistory(listConversions())
  }

  function remove(id: string) {
    deleteConversion(id)
    setHistory(listConversions())
  }

  const rows = history.map((h) => ({
    cells: {
      value: h.value,
      words: h.words,
      caseStyle: h.caseStyle.toUpperCase(),
      savedAt: new Date(h.savedAt).toLocaleDateString(),
      action: <Button kind="ghost" ariaLabel={`Remove ${h.value}`} onClick={() => remove(h.id)}>Remove</Button>,
    },
  }))

  return (
    <AppShell
      name="Number to Words"
      icon="sheets"
      hue="teal"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'conversion' : 'conversions'}`}
      status={toast ? toast : undefined}
      side={
        <Rail
          title="How it works"
          note="Pick a case style, then copy or save the result."
          chips={['Type a number', 'Choose case', 'Copy result', 'Save to history']}
        />
      }
    >
      <Card mono="Input" title="Number">
        <FormGrid>
          <TextInput
            label="Number"
            value={number}
            onChange={setNumber}
            inputMode="numeric"
            placeholder="42"
            error={fieldError}
          />
          <Select
            label="Case"
            value={caseStyle}
            onChange={(v) => setCaseStyle(v as 'lower' | 'upper' | 'title')}
            options={[
              { value: 'lower', label: 'lower' },
              { value: 'upper', label: 'UPPER' },
              { value: 'title', label: 'Title' },
            ]}
          />
        </FormGrid>
      </Card>

      <Card mono="Result" title="Words" actions={<Actions><Button kind="secondary" onClick={copy}>Copy</Button><Button kind="secondary" onClick={save}>Save to history</Button></Actions>}>
        {currentWords ? (
          <KpiRow>
            <Kpi value={currentWords} label={fieldError ? 'Last good result' : 'In words'} accent />
          </KpiRow>
        ) : (
          <EmptyState mono="Empty" title="No result yet" detail="Enter a number to see it in words." actionLabel="Enter a number" />
        )}
      </Card>

      <Card mono={`${history.length} saved`} title="History">
        {history.length === 0 ? (
          <EmptyState mono="Empty" title="No conversions yet" detail="Convert a number and save it to see it here." actionLabel="Convert a number" onAction={save} />
        ) : (
          <Table
            label="Conversion history"
            columns={[
              { key: 'value', label: 'Number', num: true },
              { key: 'words', label: 'Words' },
              { key: 'caseStyle', label: 'Case' },
              { key: 'savedAt', label: 'Saved' },
              { key: 'action', label: '' },
            ]}
            rows={rows}
          />
        )}
      </Card>
    </AppShell>
  )
}
