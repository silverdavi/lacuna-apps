// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Cols,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  exportBibtex,
  latexMathToSvg,
  latexMathToUnicode,
  parseBibtex,
  SAMPLE_BIBTEX,
  SAMPLE_MATH,
  type BibTarget,
  type LatexMode,
  type MathTarget,
} from './engine/latex'

interface LatexState {
  mode: LatexMode
  bibInput: string
  bibTarget: BibTarget
  mathInput: string
  mathTarget: MathTarget
}

const DEFAULT_STATE: LatexState = {
  mode: 'bibtex',
  bibInput: SAMPLE_BIBTEX,
  bibTarget: 'csl-json',
  mathInput: SAMPLE_MATH,
  mathTarget: 'unicode',
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<LatexState>({
    key: 'latex-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const computed = useMemo(() => {
    if (state.mode === 'bibtex') {
      const entries = parseBibtex(state.bibInput)
      const out = exportBibtex(entries, state.bibTarget)
      return { count: entries.length, text: out.text, ext: out.ext, mime: out.mime }
    }
    if (state.mathTarget === 'svg') {
      return { count: 1, text: latexMathToSvg(state.mathInput), ext: 'svg', mime: 'image/svg+xml;charset=utf-8' }
    }
    return { count: 1, text: latexMathToUnicode(state.mathInput), ext: 'txt', mime: 'text/plain;charset=utf-8' }
  }, [state])

  const side = (
    <Stack>
      <Rail title="Parsed" note={state.mode === 'bibtex' ? 'BibTeX bibliography' : 'LaTeX math'}>
        <KpiRow>
          <Kpi value={String(computed.count)} label={state.mode === 'bibtex' ? 'Entries' : 'Formula'} accent />
          <Kpi value={`.${computed.ext}`} label="Format" />
        </KpiRow>
      </Rail>
      <Rail title="Modes">
        <Keys
          items={[
            ['BibTeX', 'CSL-JSON, RIS, Markdown'],
            ['Math', 'Unicode & clean SVG'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="LaTeX Converter"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta="BibTeX & Math"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".bib,.tex,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              void f.text().then((t) =>
                setState((p) => (p.mode === 'bibtex' ? { ...p, bibInput: t } : { ...p, mathInput: t })),
              )
            }
            e.target.value = ''
          }}
        />

        <Card mono="Settings" title="Mode & output">
          <FormGrid>
            <Select
              label="Converter mode"
              value={state.mode}
              onChange={(v) => setState((p) => ({ ...p, mode: v as LatexMode }))}
              options={[
                { value: 'bibtex', label: 'BibTeX Citations (.bib)' },
                { value: 'math', label: 'LaTeX Math Expression' },
              ]}
            />
            {state.mode === 'bibtex' ? (
              <Select
                label="Target format"
                value={state.bibTarget}
                onChange={(v) => setState((p) => ({ ...p, bibTarget: v as BibTarget }))}
                options={[
                  { value: 'csl-json', label: 'CSL-JSON (.json)' },
                  { value: 'ris', label: 'RIS Citations (.ris)' },
                  { value: 'markdown', label: 'Markdown References (.md)' },
                ]}
              />
            ) : (
              <Select
                label="Target format"
                value={state.mathTarget}
                onChange={(v) => setState((p) => ({ ...p, mathTarget: v as MathTarget }))}
                options={[
                  { value: 'unicode', label: 'Unicode Math (.txt)' },
                  { value: 'svg', label: 'SVG Graphic (.svg)' },
                ]}
              />
            )}
          </FormGrid>
          <Actions>
            <PrimaryButton
              disabled={!computed.text}
              onClick={() =>
                saveBlob(new Blob([computed.text], { type: computed.mime }), {
                  filename: `converted.${computed.ext}`,
                  mimeType: computed.mime,
                })
              }
            >
              Download .{computed.ext}
            </PrimaryButton>
            <Button kind="secondary" disabled={!computed.text} onClick={() => void copy(computed.text)}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open .bib / .tex
            </Button>
          </Actions>
        </Card>

        <Cols kind="2">
          <Card mono="Source" title={state.mode === 'bibtex' ? 'BibTeX input' : 'LaTeX math'}>
            <TextInput
              label="Source LaTeX"
              value={state.mode === 'bibtex' ? state.bibInput : state.mathInput}
              onChange={(v) =>
                setState((p) => (p.mode === 'bibtex' ? { ...p, bibInput: v } : { ...p, mathInput: v }))
              }
              rows={12}
            />
          </Card>
          <Card mono="Output" title={`Result (.${computed.ext})`}>
            <TextInput label="Converted LaTeX" value={computed.text} onChange={() => {}} rows={12} />
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
