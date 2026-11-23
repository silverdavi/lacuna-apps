// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { base64Decode, base64Encode, urlDecode, urlEncode } from '@lacuna/codecs'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, PrimaryButton, Select, TextInput } from '@lacuna/ui'

const CIPHERS = ['Base64', 'Hex', 'Caesar', 'URL'] as const
type Cipher = (typeof CIPHERS)[number]

function hexEncode(input: string): string {
  return BigInt(input).toString(16)
}

function hexDecodeLike(input: string): boolean {
  return /^[0-9a-f]+$/i.test(input) && /[a-f]/i.test(input)
}

function hexDecode(input: string): string {
  return BigInt('0x' + input).toString(10)
}

function caesar(input: string, shift: number): string {
  return input.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    return String.fromCharCode(base + (((ch.charCodeAt(0) - base + shift) % 26 + 26) % 26))
  })
}

export function App() {
  const { value, set } = useLocalRecord<{ input: string; cipher: Cipher }>({
    key: 'caesar-cipher',
    version: 0,
    defaultValue: { input: '', cipher: 'Base64' },
  })
  const [shift, setShift] = useState('3')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  function transform() {
    setError(null)
    if (!value.input) return setError('Enter text to transform')
    try {
      const input = value.input.trim()
      let out: string
      switch (value.cipher) {
        case 'Base64':
          out = /^[A-Za-z0-9+/]+=*$/.test(input) ? base64Decode(input) : base64Encode(input)
          break
        case 'Hex':
          out = hexDecodeLike(input) ? hexDecode(input) : hexEncode(input)
          break
        case 'Caesar':
          out = caesar(input, parseInt(shift, 10) || 0)
          break
        case 'URL':
          out = /%[0-9a-fA-F]{2}/.test(input) ? urlDecode(input) : urlEncode(input)
          break
      }
      setResult(out)
    } catch {
      setError('Could not transform that text')
    }
  }

  function copyResult() {
    void copy(result)
  }

  return (
    <AppShell
      name="Cipher Tool"
      icon="security"
      hue="blue"
      category="Productivity"
      meta={`${result.length} chars`}
    >
      <Card mono="Transform" title="Enter text to transform">
        <FormGrid>
          <TextInput
            label="Input text"
            value={value.input}
            onChange={(input) => set({ ...value, input })}
            error={error}
          />
          <Select
            label="Cipher"
            value={value.cipher}
            onChange={(cipher) => set({ ...value, cipher: cipher as Cipher })}
            options={[...CIPHERS]}
          />
          {value.cipher === 'Caesar' && (
            <TextInput
              label="Shift"
              value={shift}
              onChange={setShift}
              type="number"
            />
          )}
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={transform}>Transform</PrimaryButton>
          <Button kind="secondary" onClick={copyResult} disabled={!result}>
            {copied ? 'Copied to clipboard' : 'Copy result'}
          </Button>
        </Actions>
      </Card>
      <Card mono="Output" title="Result">
        {result ? (
          <TextInput label="Result" value={result} onChange={() => undefined} />
        ) : (
          <EmptyState
            mono="Empty"
            title="No result yet"
            detail="Enter text, pick a cipher and run it."
            actionLabel="Run the cipher"
            onAction={transform}
          />
        )}
      </Card>
    </AppShell>
  )
}
