import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Rail,
  SectionLabel,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
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
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    host.setSource(source)
  }, [source])

  const isEmpty = source.trim() === ''
  const preview = isEmpty ? '' : renderMath(source)
  const chars = source.length
  const lines = source === '' ? 0 : source.split('\n').length

  function onLoadSample() {
    setSource('E = mc^2')
  }

  function onCopy() {
    void copy(preview)
  }

  return (
    <AppShell
      name="TeX snippet"
      icon="notes"
      hue="gold"
      category="Productivity"
      meta={`${chars} chars`}
      status={isEmpty ? 'No fragment yet' : 'Fragment ready'}
      side={
        <Rail
          title="Reading"
          note="Plain-text reading of the fragment"
          chips={['plain text', 'copyable']}
        />
      }
    >
      <Stack lg>
        <Card mono="Source" title="TeX snippet">
          <Body>Type a TeX fragment and read it as plain text.</Body>
          <div style={{ margin: 'calc(10px * var(--sf)) 0 calc(8px * var(--sf))' }}>
            <TextInput
              label="Source"
              value={source}
              onChange={setSource}
              rows={6}
              placeholder="E = mc^2"
            />
          </div>
          <Actions>
            <Button kind="primary" onClick={onLoadSample} disabled={!isEmpty}>
              Load sample
            </Button>
            <Button onClick={() => setSource('')} disabled={isEmpty}>
              Clear
            </Button>
          </Actions>
        </Card>

        <Card
          mono="Reading"
          title="Rendered"
          accent={!isEmpty}
          actions={
            !isEmpty ? (
              <Actions>
                <Button kind="ghost" onClick={onCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Actions>
            ) : undefined
          }
        >
          {isEmpty ? (
            <EmptyState
              mono="No fragment yet"
              title="Nothing to read"
              detail="Type TeX in the source box, or start from the sample."
              actionLabel="Load sample"
              onAction={onLoadSample}
            />
          ) : (
            <Body>{preview}</Body>
          )}
        </Card>

        <Card mono="Fragment" title="Details">
          <KpiRow>
            <div>
              <Kpi value={String(chars)} label="Characters" accent={!isEmpty} />
            </div>
            <div>
              <Kpi value={String(lines)} label="Lines" />
            </div>
          </KpiRow>
          <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
            <SectionLabel>How it maps</SectionLabel>
            <Body sm>
              Superscripts and subscripts, fractions, and symbols such as
              {' '}∈, →, and · become readable glyphs. The source stays editable and is kept for you.
            </Body>
          </div>
        </Card>
      </Stack>
    </AppShell>
  )
}
