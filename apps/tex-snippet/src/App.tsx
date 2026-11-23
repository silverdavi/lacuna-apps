import { useEffect, useState } from 'react'
import { Actions, AppShell, Body, Button, Card, Stack, TextInput } from '@lacuna/ui'
import { host } from './host'

const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻',
}

const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋',
  a: 'ₐ', b: 'ᵦ', c: 'ₐ', d: 'ᵈ', e: 'ₑ', f: 'ᶠ', g: 'ᵍ',
  h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ',
  o: 'ₒ', p: 'ₚ', q: 'ǫ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ',
  v: 'ᵥ', w: 'ᵥ', x: 'ₓ', y: 'ᵧ', z: 'z',
}

const MATHBB: Record<string, string> = {
  R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ',
  P: 'ℙ', H: 'ℍ', F: 'ℱ', W: '𝕎',
}

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\frac\{([^{}]*)\}\{([^{}]*)\}([a-zA-Z0-9])/g, '$1/$2 $3'],
  [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2'],
  [/\\cdot/g, '·'],
  [/\\in\b/g, '∈'],
  [/\\to\b/g, '→'],
]

function toSuperscript(s: string): string {
  let out = ''
  for (const ch of s) out += SUPER[ch] ?? ch
  return out
}

function toSubscript(s: string): string {
  let out = ''
  for (const ch of s) out += SUB[ch] ?? ch
  return out
}

function renderMath(src: string): string {
  let s = src
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep)
  s = s.replace(/\\mathbb\{([A-Z])\}/g, (_, c: string) => MATHBB[c] ?? c)
  s = s.replace(/\^\{([^{}]*)\}/g, (_, inner) => toSuperscript(inner))
  s = s.replace(/\^([0-9])/g, (_, d) => toSuperscript(d))
  s = s.replace(/_\{([^{}]*)\}/g, (_, inner) => toSubscript(inner))
  s = s.replace(/_([0-9a-z])/g, (_, d) => toSubscript(d))
  return s
}

export function App() {
  const [source, setSource] = useState<string>(() => host.getSource())

  useEffect(() => {
    host.setSource(source)
  }, [source])

  const preview = source.trim() === '' ? '' : renderMath(source)

  return (
    <AppShell name="TeX snippet" icon="notes" hue="gold" category="Productivity">
      <Stack>
        <Card mono="Source" title="TeX snippet">
          <TextInput
            label="Source"
            value={source}
            onChange={setSource}
            rows={6}
            placeholder="E = mc^2"
          />
          <Actions>
            <Button onClick={() => setSource('')} disabled={source === ''}>
              Clear
            </Button>
          </Actions>
        </Card>
        <Card mono="Preview" title="Rendered" accent={preview !== ''}>
          {preview === '' ? (
            <Body sm>No math to render.</Body>
          ) : (
            <Body>{preview}</Body>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
