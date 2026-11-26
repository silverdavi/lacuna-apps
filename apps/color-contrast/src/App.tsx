// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import './app.css'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  TextInput,
} from '@lacuna/ui'
import { contrastRatio, generatePalette, hexToRgb, rgbToHex, type RGB } from '@lacuna/color-math'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveText } from '@lacuna/file-save-open'
import { usePairStore } from './host'
import { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND } from './colors'

function normalizeHex(raw: string): string {
  const s = raw.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(s)) return ''
  return ('#' + s).toUpperCase()
}

function wcagLevel(ratio: number): 'AAA' | 'AA' | 'Fail' {
  if (ratio >= 6.95) return 'AAA'
  if (ratio >= 4.45) return 'AA'
  return 'Fail'
}

type Tab = 'Pair' | 'Palette'

export function App() {
  const [tab, setTab] = useState<Tab>('Pair')
  const [fg, setFg] = useState(DEFAULT_FOREGROUND)
  const [bg, setBg] = useState(DEFAULT_BACKGROUND)
  const [toast, setToast] = useState<string | null>(null)
  const { copy } = useClipboard({ timeoutMs: 1500 })
  const store = usePairStore()

  const fgNorm = normalizeHex(fg)
  const bgNorm = normalizeHex(bg)

  const fgRgb = useMemo<RGB | null>(() => (fgNorm ? hexToRgb(fgNorm) : null), [fgNorm])
  const bgRgb = useMemo<RGB | null>(() => (bgNorm ? hexToRgb(bgNorm) : null), [bgNorm])

  const ratio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : 0
  const ratioText = ratio.toFixed(2)
  const level = wcagLevel(ratio)

  const palette = useMemo(() => {
    if (!bgRgb) return [] as string[]
    const swatches = [rgbToHex(bgRgb)]
    for (const type of ['analogous', 'complementary', 'triadic'] as const) {
      for (const rgb of generatePalette(bgRgb, 4, type)) {
        swatches.push(rgbToHex(rgb))
      }
    }
    return swatches.map((h) => h.toUpperCase())
  }, [bgRgb])

  const swap = () => {
    setFg(bgNorm || bg)
    setBg(fgNorm || fg)
  }

  const savePair = () => {
    if (!fgNorm || !bgNorm) return
    store.set((prev) => ({ pairs: [...prev.pairs, { foreground: fgNorm, background: bgNorm }] }))
  }

  const removePair = (index: number) => {
    store.set((prev) => ({ pairs: prev.pairs.filter((_, i) => i !== index) }))
  }

  const clearAll = () => {
    store.set({ pairs: [] })
  }

  const copyResult = async () => {
    if (!fgNorm || !bgNorm) return
    const text = `${fgNorm} on ${bgNorm} — ${ratioText} (${level})`
    try {
      await copy(text)
    } catch {
      /* clipboard may be unavailable in the test runner */
    }
    setToast(`Copied: ${text}`)
    setTimeout(() => setToast(null), 2000)
  }

  const downloadPalette = () => {
    saveText(palette.join('\n'), { filename: 'palette.txt', mimeType: 'text/plain' })
  }

  return (
    <AppShell
      name="Color Contrast Checker"
      icon="paint"
      hue="blue"
      category="Design"
      meta={`${store.pairs.length} ${store.pairs.length === 1 ? 'pair' : 'pairs'}`}
      side={
        <Rail title="Color Contrast" note="WCAG 2.2" chips={['Pair', 'Palette', 'Copy']}>
          <KpiRow>
            <Kpi label="Contrast" value={ratioText} />
            <Kpi label="Level" value={level} />
          </KpiRow>
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist" aria-label="Views">
        {(['Pair', 'Palette'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Pair' ? (
        <>
          <Card mono="Pair" title="Contrast pair">
            <FormGrid>
              <TextInput label="Foreground hex" value={fg} onChange={setFg} placeholder={DEFAULT_FOREGROUND} />
              <TextInput label="Background hex" value={bg} onChange={setBg} placeholder={DEFAULT_BACKGROUND} />
            </FormGrid>

            <div
              aria-hidden="true"
              style={{
                padding: '1.5rem',
                margin: '0.75rem 0',
                borderRadius: '0.5rem',
                border: 'calc(1px * var(--sf)) solid var(--line)',
                background: bgNorm ? bgNorm : 'var(--paper)',
                color: fgNorm ? fgNorm : 'var(--ink)',
                fontSize: '1.125rem',
              }}
            >
              The quick brown fox jumps over the lazy dog. 0123456789
            </div>

            <FormGrid>
              <div>
                <label className="lc-field">
                  <span className="lc-field-label">Contrast ratio</span>
                  <input className="lc-input" type="text" readOnly value={ratioText} aria-label="Contrast ratio" />
                </label>
              </div>
              <div>
                <label className="lc-field">
                  <span className="lc-field-label">WCAG level</span>
                  <div className="lc-input" aria-label="WCAG level">{level}</div>
                </label>
              </div>
            </FormGrid>

            <Actions>
              <PrimaryButton onClick={savePair}>Save pair</PrimaryButton>
              <Button kind="secondary" ariaLabel="Copy result" onClick={() => void copyResult()}>
                Copy
              </Button>
              <Button kind="secondary" onClick={swap}>
                Swap
              </Button>
            </Actions>

            {toast ? (
              <div role="status" style={{ marginTop: '0.5rem', color: 'var(--ink-60)' }}>
                {toast}
              </div>
            ) : null}
          </Card>

          <Card mono={`${store.pairs.length} saved`} title="Saved pairs">
            {store.pairs.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No pairs saved yet"
                detail="Save a pair from the form above."
                actionLabel="Save a pair"
                onAction={savePair}
              />
            ) : (
              <List label="Saved pairs">
                {store.pairs.map((pair, i) => {
                  const pRatio = contrastRatio(hexToRgb(pair.foreground), hexToRgb(pair.background)).toFixed(2)
                  return (
                    <Row
                      key={`${pair.foreground}-${pair.background}-${i}`}
                      title={`${pair.foreground} on ${pair.background}`}
                      value={`${pRatio} (${wcagLevel(contrastRatio(hexToRgb(pair.foreground), hexToRgb(pair.background)))})`}
                      action={
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${pair.foreground} on ${pair.background}`}
                          onClick={() => removePair(i)}
                        >
                          Remove
                        </Button>
                      }
                    />
                  )
                })}
              </List>
            )}
          </Card>

          {store.pairs.length > 0 ? (
            <Actions>
              <Button kind="ghost" ariaLabel="Clear all saved pairs" onClick={clearAll}>
                Clear all
              </Button>
            </Actions>
          ) : null}
        </>
      ) : (
        <Card mono={`${palette.length} swatches`} title={<span role="heading" aria-level={2}>Generated Palette</span>}>
          {bgRgb ? (
            <>
              <List label="Palette swatches">
                {palette.map((hex, i) => (
                  <Row
                    key={`${hex}-${i}`}
                    title={<span style={{ display: 'inline-block', width: 'calc(16px * var(--sf))', height: 'calc(16px * var(--sf))', borderRadius: 'calc(4px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--line)', background: hex, verticalAlign: 'middle' }} />}
                    value={hex}
                    hot
                  />
                ))}
              </List>
              <Actions>
                <Button kind="secondary" ariaLabel="Download palette" onClick={downloadPalette}>
                  Download
                </Button>
              </Actions>
            </>
          ) : (
            <EmptyState
              mono="Empty"
              title="No palette"
              detail="Enter a valid background hex to generate one."
              actionLabel="Enter a background"
              onAction={() => setTab('Pair')}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
