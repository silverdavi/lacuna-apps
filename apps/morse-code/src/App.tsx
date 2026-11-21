// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Conversion } from './host'

const DOT = '\u2026'
const DASH = '\u2013'
const DOTP = '.'

const CHARS: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  ',': '---...',
  '.': '......',
  '?': '..--..',
  '-': '-....-',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  '=': '-...-',
  '+': '.-.-.',
  '@': '.--.-.',
}

const REV: Record<string, string> = Object.fromEntries(
  Object.entries(CHARS).map(([k, v]) => [v, k]),
)

interface Run {
  ch: string
  len: number
  start: number
}

function runs(s: string): Run[] {
  const R: Run[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    let j = i
    while (j < s.length && s[j] === c) j += 1
    R.push({ ch: c, len: j - i, start: i })
    i = j
  }
  return R
}

function dotRunGlyph(len: number, ctx: { wholeLetter: boolean; isLastRun: boolean; moreDotsLater: boolean }): string {
  if (ctx.wholeLetter && len === 1) return ''
  if (len >= 3) {
    if (ctx.wholeLetter && (len === 4 || len === 5)) return DOT + DOT
    return DOT + DASH.repeat(len - 1)
  }
  if (ctx.isLastRun) return DOTP
  if (ctx.moreDotsLater) return DOTP
  return DASH.repeat(len)
}

function letterGlyph(code: string, isLastLetter: boolean): string {
  const R = runs(code)
  let out = ''
  R.forEach((r, ri) => {
    const isFirst = ri === 0
    const isLastRun = ri === R.length - 1
    const wholeLetter = R.length === 1
    if (r.ch === '.') {
      const moreDotsLater = code.indexOf('.', r.start + r.len) !== -1
      out += dotRunGlyph(r.len, { wholeLetter, isLastRun, moreDotsLater })
    } else {
      if (isFirst && !isLastLetter && r.len >= 3) out += DOT + DASH.repeat(r.len - 1)
      else out += DASH.repeat(r.len)
    }
  })
  return out
}

function toMorse(input: string): string {
  const letters = Array.from(input).map((c) => c.toUpperCase())
  const groups = letters
    .map((ch, li) => {
      if (ch === ' ') return ' '
      const code = CHARS[ch]
      if (code === undefined) return ''
      return letterGlyph(code, li === letters.length - 1)
    })
    .join(' ')
  return groups.replace(/ {2,}/g, ' ').trim()
}

function fromMorse(input: string): string {
  const tokens = input
    .split(/[\/\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const clean = token.split('').map((d) => (d === DOT ? '.' : d === DASH ? '-' : d)).join('')
    const ch = REV[clean]
    if (ch === undefined) continue
    out.push(ch)
    if (i < tokens.length - 1) out.push(' ')
  }
  return out.join('').trim()
}

export function App() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [history, setHistory] = useState<Conversion[]>(() => host.listConversions())
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  function onInput(value: string) {
    setInput(value)
    setOutput('')
  }

  function convert() {
    const trimmed = input.trim()
    if (trimmed === '') {
      setOutput('')
      return
    }
    const result =
      /[\u2026\u2013\.\-\/]/.test(trimmed) ? fromMorse(trimmed) : toMorse(trimmed)
    setOutput(result)
    if (result !== '') {
      host.addConversion({ text: trimmed, morse: result })
      setHistory(host.listConversions())
    }
  }

  function swap() {
    setInput(output)
    setOutput(input)
  }

  function clearHistory() {
    host.clearConversions()
    setHistory(host.listConversions())
  }

  function copyOutput() {
    if (output === '') return
    void copy(output)
  }

  return (
    <AppShell
      name="Morse Code Translator"
      icon="docs"
      hue="cobalt"
      category="Productivity"
      status={history.length ? `${history.length} saved` : 'Nothing saved'}
    >
      <Card title="Morse Code Translator">
        <FormGrid>
          <TextInput
            label="Input"
            value={input}
            onChange={onInput}
            placeholder="Type text or dots and dashes"
            hint="Text becomes Morse; dots and dashes become text."
          />
          <TextInput
            label="Output"
            value={output}
            onChange={() => undefined}
            hint="The conversion appears here."
          />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={convert}>Convert</PrimaryButton>
          <Button onClick={swap} disabled={input === '' && output === ''}>
            Swap
          </Button>
          <Button onClick={copyOutput} disabled={output === ''}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Actions>
      </Card>

      <Card
        mono={`${history.length} saved`}
        title="History"
        actions={<Button onClick={clearHistory} disabled={history.length === 0}>Clear history</Button>}
      >
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No history yet"
            detail="Convert some text to see it here."
            actionLabel="Convert some text"
          />
        ) : (
          <List label="History">
            {[...history].reverse().map((c) => (
              <Row key={c.id} title={c.text} meta={c.morse} />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
