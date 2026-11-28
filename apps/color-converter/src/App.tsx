// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  ErrorState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  describeColor,
  exportPaletteCss,
  exportPaletteTailwind,
  parseColorString,
} from './engine/color'

interface Swatch {
  id: string
  name: string
  hex: string
}

interface ColorState {
  input: string
  swatches: Swatch[]
}

const DEFAULT_STATE: ColorState = {
  input: 'rgb(34, 87, 166)',
  swatches: [
    { id: 'sw1', name: 'cobalt', hex: String.fromCharCode(35) + '2257A6' },
    { id: 'sw2', name: 'rust', hex: String.fromCharCode(35) + 'C44D2D' },
  ],
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<ColorState>({
    key: 'color-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [swatchName, setSwatchName] = useState('accent')
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const parsed = useMemo(() => {
    try {
      const rgb = parseColorString(state.input)
      return { info: describeColor(rgb), error: null as string | null }
    } catch (e) {
      return { info: null, error: e instanceof Error ? e.message : 'Invalid color' }
    }
  }, [state.input])

  function saveSwatch() {
    if (!parsed.info) return
    const item: Swatch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: swatchName.trim() || 'color',
      hex: parsed.info.hex,
    }
    setState((p) => ({ ...p, swatches: [item, ...p.swatches].slice(0, 24) }))
  }

  const side = (
    <Stack>
      <Rail title="Contrast" note="WCAG 2.1 contrast ratios">
        <KpiRow>
          <Kpi value={parsed.info ? `${parsed.info.contrastWhite}:1` : '—'} label="On White" accent />
          <Kpi value={parsed.info ? `${parsed.info.contrastBlack}:1` : '—'} label="On Black" />
        </KpiRow>
      </Rail>
      <Rail title="Color spaces">
        <Keys
          items={[
            ['Web', 'HEX, RGB, HSL, OKLCH'],
            ['Print', 'CMYK, HSV'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Color Format Studio"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta="HEX · RGB · HSL · OKLCH · CMYK"
      side={side}
    >
      <Stack lg>
        <Card mono="Input" title="Color value">
          <FormGrid>
            <TextInput
              label="Color input (HEX, RGB, or HSL)"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              placeholder="rgb(34, 87, 166)"
            />
            <TextInput
              label="Palette token name"
              value={swatchName}
              onChange={setSwatchName}
              placeholder="accent"
            />
          </FormGrid>
          {parsed.info ? (
            <div
              role="img"
              aria-label="Active color swatch"
              style={{
                marginTop: 'calc(12px * var(--sf))',
                height: 'calc(44px * var(--sf))',
                borderRadius: 'calc(2px * var(--sf))',
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                background: parsed.info.rgbCss,
              }}
            />
          ) : null}
          <Actions>
            <PrimaryButton onClick={saveSwatch} disabled={!parsed.info}>
              Save to palette
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={state.swatches.length === 0}
              onClick={() =>
                saveBlob(new Blob([exportPaletteCss(state.swatches)], { type: 'text/css;charset=utf-8' }), {
                  filename: 'palette.css',
                  mimeType: 'text/css;charset=utf-8',
                })
              }
            >
              Export CSS tokens
            </Button>
            <Button
              kind="secondary"
              disabled={state.swatches.length === 0}
              onClick={() =>
                saveBlob(
                  new Blob([exportPaletteTailwind(state.swatches)], { type: 'application/json;charset=utf-8' }),
                  { filename: 'tailwind-colors.json', mimeType: 'application/json;charset=utf-8' },
                )
              }
            >
              Export Tailwind JSON
            </Button>
          </Actions>
        </Card>

        {parsed.error ? <ErrorState title="Invalid color" detail={parsed.error} /> : null}

        {parsed.info ? (
          <Card mono="Converted" title="All color spaces">
            <List label="Converted color spaces">
              {[
                { label: 'HEX', value: parsed.info.hex },
                { label: 'RGB', value: parsed.info.rgbCss },
                { label: 'HSL', value: parsed.info.hslCss },
                { label: 'HSV', value: parsed.info.hsvCss },
                { label: 'CMYK', value: parsed.info.cmykCss },
                { label: 'OKLCH', value: parsed.info.oklchCss },
              ].map((item) => (
                <Row
                  key={item.label}
                  title={item.value}
                  meta={item.label}
                  action={
                    <Button kind="ghost" onClick={() => void copy(item.value)}>
                      {copied ? 'Copied' : `Copy ${item.label}`}
                    </Button>
                  }
                />
              ))}
            </List>
          </Card>
        ) : null}

        <Card mono="Palette" title="Saved tokens">
          <List label="Saved palette">
            {state.swatches.map((s) => (
              <Row
                key={s.id}
                title={s.name}
                meta={s.hex}
                value={<Tag>{s.hex}</Tag>}
                action={
                  <Button
                    kind="ghost"
                    onClick={() =>
                      setState((p) => ({ ...p, swatches: p.swatches.filter((x) => x.id !== s.id) }))
                    }
                  >
                    Remove
                  </Button>
                }
              />
            ))}
          </List>
        </Card>
      </Stack>
    </AppShell>
  )
}
