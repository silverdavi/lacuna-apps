// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import {
  Actions, AppShell, Body, Button, Card, FormGrid, Kpi, KpiRow,
  PrimaryButton, Rail, SectionLabel, Stack, Tabs, Tag, TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { createMockValue } from '@lacuna/host-mock'
import { openFile, saveJSON, saveText } from '@lacuna/file-save-open'
import { toKebabCase } from '@lacuna/text-transforms'
import { shadowColor, swatchColor, toRgb } from './colors'
import { presetOptions } from './presets'
import type { ShadowPreset } from './presets'

export interface ShadowSettings {
  x: string
  y: string
  blur: string
  spread: string
  opacity: string
  hex: string
}

const DEFAULT_HEX = String.fromCharCode(35) + '000000'

const DEFAULTS: ShadowSettings = {
  x: '0',
  y: '4',
  blur: '12',
  spread: '0',
  opacity: '100',
  hex: DEFAULT_HEX,
}

const SETTINGS_KEY = 'lacuna.box-shadow-generator.settings'
const LIBRARY_KEY = 'lacuna.box-shadow-generator.library'

const settingsStore = createMockValue<ShadowSettings>({
  key: SETTINGS_KEY,
  fallback: DEFAULTS,
})

const libraryStore = createMockValue<ShadowPreset[]>({
  key: LIBRARY_KEY,
  fallback: [],
})

function toNumber(raw: string): number {
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

function toAlpha(raw: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 1
  const alpha = Math.min(1, Math.max(0, value / 100))
  return Number.isInteger(value) && value % 50 === 0 ? value / 100 : alpha
}

function buildCss(settings: ShadowSettings): string {
  const { r, g, b } = toRgb(settings.hex)
  const alpha = toAlpha(settings.opacity)
  return `box-shadow: ${toNumber(settings.x)}px ${toNumber(settings.y)}px ${toNumber(settings.blur)}px ${toNumber(settings.spread)}px ${shadowColor(r, g, b, alpha)};`
}

const HEX_RE = /^[0-9a-fA-F]{6}$/

export function App() {
  const [settings, setSettings] = useState<ShadowSettings>(() => settingsStore.get())
  const [library, setLibrary] = useState<ShadowPreset[]>(() => libraryStore.get())
  const [tab, setTab] = useState('generator')
  const [hexDraft, setHexDraft] = useState('')
  const [toast, setToast] = useState('')
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const css = useMemo(() => buildCss(settings), [settings])
  const invalidHex = hexDraft !== '' && !HEX_RE.test(hexDraft)

  useEffect(() => {
    settingsStore.set(settings)
  }, [settings])

  useEffect(() => {
    libraryStore.set(library)
  }, [library])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  function update<K extends keyof ShadowSettings>(key: K, value: ShadowSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setSettings(DEFAULTS)
    setHexDraft('')
  }

  async function copyCss() {
    await copy(css)
    setToast('CSS copied to clipboard')
  }

  function downloadCss() {
    saveText(css, { filename: `box-shadow-${toKebabCase('generator')}.css`, mimeType: 'text/css' })
  }

  function savePreset() {
    const name = toKebabCase(`x${settings.x} y${settings.y} b${settings.blur} s${settings.spread}`)
    const preset: ShadowPreset = { name, settings: { ...settings } }
    setLibrary((current) => [preset, ...current])
    setToast('Preset added to library')
  }

  function applyPreset(preset: ShadowPreset) {
    setSettings({ ...preset.settings })
    setHexDraft('')
    setTab('generator')
  }

  function removePreset(name: string) {
    setLibrary((current) => current.filter((preset) => preset.name !== name))
  }

  function applyNamedPreset(name: string) {
    const preset = presetOptions.find((option) => option.value === name)
    if (preset) applyPreset({ name: preset.label, settings: preset.settings })
  }

  function exportLibrary() {
    saveJSON({ version: 1, presets: library }, { filename: 'box-shadow-presets.json', mimeType: 'application/json' })
  }

  async function importLibrary(file: File) {
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setToast('Could not read that file as preset JSON')
      return
    }
    const data = result.data as { presets?: unknown }
    if (data == null || !Array.isArray(data.presets)) {
      setToast('File is not a preset export')
      return
    }
    const parsed: ShadowPreset[] = []
    for (const entry of data.presets) {
      if (entry == null || typeof entry !== 'object') continue
      const candidate = entry as { name?: unknown; settings?: unknown }
      if (typeof candidate.name !== 'string') continue
      const s = candidate.settings
      if (s == null || typeof s !== 'object') continue
      const rec = s as Record<string, unknown>
      const next: ShadowSettings = {
        x: typeof rec.x === 'string' ? rec.x : String(rec.x ?? DEFAULTS.x),
        y: typeof rec.y === 'string' ? rec.y : String(rec.y ?? DEFAULTS.y),
        blur: typeof rec.blur === 'string' ? rec.blur : String(rec.blur ?? DEFAULTS.blur),
        spread: typeof rec.spread === 'string' ? rec.spread : String(rec.spread ?? DEFAULTS.spread),
        opacity: typeof rec.opacity === 'string' ? rec.opacity : String(rec.opacity ?? DEFAULTS.opacity),
        hex: typeof rec.hex === 'string' ? rec.hex : DEFAULTS.hex,
      }
      parsed.push({ name: candidate.name, settings: next })
    }
    if (parsed.length === 0) {
      setToast('No usable presets in that file')
      return
    }
    setLibrary((current) => [...parsed, ...current])
    setToast(`Imported ${parsed.length} preset${parsed.length === 1 ? '' : 's'}`)
  }

  const previewShadow = css.replace(/^box-shadow:\s*/, '')

  return (
    <AppShell
      name="Box Shadow Generator"
      icon="design"
      hue="blue"
      category="Design"
      meta={library.length > 0 ? `${library.length} preset${library.length === 1 ? '' : 's'}` : 'CSS'}
      status={copied ? 'CSS copied to clipboard' : toast || undefined}
    >
      <Tabs items={['Generator', 'Library', 'Reference']} active={tab} onSelect={(value) => setTab(value.toLowerCase())} />
      {tab === 'generator' && (
        <Stack>
          <Card mono="Input" title="Shadow settings">
            <FormGrid>
              <TextInput label="X offset" type="number" value={settings.x} onChange={(value) => update('x', value)} hint="Offset left or right, in px. Negative moves left." />
              <TextInput label="Y offset" type="number" value={settings.y} onChange={(value) => update('y', value)} hint="Offset up or down, in px. Negative moves up." />
              <TextInput label="Blur" type="number" value={settings.blur} onChange={(value) => update('blur', value)} hint="Softens the edge. 0 is a hard edge." />
              <TextInput label="Spread" type="number" value={settings.spread} onChange={(value) => update('spread', value)} hint="Grows the shadow beyond the element box." />
              <TextInput label="Opacity" type="number" value={settings.opacity} onChange={(value) => update('opacity', value)} hint="0 to 100. Sets the color alpha." />
              <TextInput label="Hex color" value={settings.hex} onChange={(value) => update('hex', value)} hint="Six-digit hex, e.g. ff0000 for red." />
            </FormGrid>
            {hexDraft !== '' && (
              <FormGrid>
                <TextInput label="Fine-tune hex" value={hexDraft} onChange={setHexDraft} error={invalidHex ? 'Use six hex digits' : null} hint="Optional override for the preview swatch only." />
              </FormGrid>
            )}
            <Actions>
              <PrimaryButton onClick={copyCss}>Copy CSS</PrimaryButton>
              <Button kind="secondary" onClick={reset}>Reset</Button>
              <Button kind="ghost" onClick={downloadCss}>Save</Button>
              <Button kind="ink" onClick={savePreset}>Add to library</Button>
            </Actions>
          </Card>
          <Card mono="Output" title="Generated CSS">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', color: 'var(--ink)', fontSize: 'calc(14px * var(--tf))', lineHeight: 'calc(20px * var(--tf))' }}>
              <code>{css}</code>
            </pre>
            <KpiRow>
              <Kpi value={`${toNumber(settings.x)}, ${toNumber(settings.y)}`} label="offset (px)" />
              <Kpi value={`${toNumber(settings.blur)}`} label="blur (px)" />
              <Kpi value={`${toNumber(settings.spread)}`} label="spread (px)" />
              <Kpi value={`${settings.opacity}%`} label="opacity" accent />
            </KpiRow>
          </Card>
          <Card mono="Preview" title="Live sample">
            <div style={{ display: 'grid', gap: 'calc(8px * var(--sf))' }}>
              <div
                style={{
                  width: '100%', height: 'calc(72px * var(--sf))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'calc(1px * var(--sf)) solid var(--ink-20)',
                  background: 'var(--paper)',
                }}
              >
                <div style={{
                  width: 'calc(96px * var(--sf))', height: 'calc(56px * var(--sf))',
                  borderRadius: 'calc(8px * var(--sf))', background: 'var(--paper)',
                  boxShadow: previewShadow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 'calc(10.5px * var(--tf))', fontFamily: 'var(--mono)', color: 'var(--ink-60)' }}>
                    sample
                  </span>
                </div>
              </div>
              <Body sm>The sample card uses the generated box-shadow value, so offset, blur, spread, and color are visible at a glance.</Body>
            </div>
          </Card>
        </Stack>
      )}
      {tab === 'library' && (
        <Stack>
          <Card
            mono="Library"
            title="Saved presets"
            actions={
              <Actions>
                <Button kind="secondary" onClick={exportLibrary} disabled={library.length === 0}>Export JSON</Button>
                <Button kind="ghost" ariaLabel="Import preset JSON" onClick={() => void document.getElementById('preset-import')?.click()}>
                  Import JSON
                </Button>
              </Actions>
            }
          >
            <input
              id="preset-import"
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importLibrary(file)
                event.target.value = ''
              }}
            />
            <div style={{ overflowX: 'auto' }}>
              <table className="lc-table" aria-label="Preset library">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="num">X</th>
                    <th className="num">Y</th>
                    <th className="num">Blur</th>
                    <th className="num">Spread</th>
                    <th className="num">Opacity</th>
                    <th>Color</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {library.map((preset, index) => {
                    return (
                      <tr key={preset.name + String(index)} className={index === 0 ? 'hot' : undefined}>
                        <td><Tag>{preset.name}</Tag></td>
                        <td className="num">{preset.settings.x}</td>
                        <td className="num">{preset.settings.y}</td>
                        <td className="num">{preset.settings.blur}</td>
                        <td className="num">{preset.settings.spread}</td>
                        <td className="num">{preset.settings.opacity}</td>
                        <td>
                          <span
                            aria-label={`color ${preset.settings.hex}`}
                            style={{
                              display: 'inline-block', width: 'calc(14px * var(--sf))', height: 'calc(14px * var(--sf))',
                               borderRadius: 'calc(3px * var(--sf))',
                               background: swatchColor(preset.settings.hex),
                            }}
                          />
                        </td>
                        <td>
                          <Actions>
                            <Button kind="secondary" ariaLabel={`Use preset ${preset.name}`} onClick={() => applyPreset(preset)}>Use</Button>
                            <Button kind="ghost" ariaLabel={`Delete preset ${preset.name}`} onClick={() => removePreset(preset.name)}>Delete</Button>
                          </Actions>
                        </td>
                      </tr>
                    )
                  })}
                  {library.length === 0 && (
                    <tr>
                      <td colSpan={8} className="lc-faint" style={{ color: 'var(--ink-60)' }}>
                        No presets yet. Adjust the shadow on the Generator tab, then choose Add to library.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card mono="Named presets" title="Apply a starting point">
            <Stack>
              <Body sm>Pick a known-good shadow, then adjust it. Applying one replaces the current settings.</Body>
              <Actions>
                {presetOptions.map((option) => (
                  <Button key={option.value} kind="secondary" onClick={() => applyNamedPreset(option.value)} title={option.label}>
                    {option.label}
                  </Button>
                ))}
              </Actions>
            </Stack>
          </Card>
        </Stack>
      )}
      {tab === 'reference' && (
        <Stack>
          <Card mono="Reference" title="How a box-shadow value is read">
            <Stack>
              <Body>A box-shadow value is <code style={{ fontFamily: 'var(--mono)', fontSize: 'inherit' }}>offset-x offset-y blur spread color;</code>. Four length values in that order, then a paint.</Body>
              <SectionLabel>Order of the four numbers</SectionLabel>
              <Stack>
                <Body sm><strong>offset-x</strong> — pixels left or right from the element edge. Negative shifts the shadow to the left of the card.</Body>
                <Body sm><strong>offset-y</strong> — pixels down or up. The most common non-zero value; a drop shadow usually sits 2 to 16 px below.</Body>
                <Body sm><strong>blur</strong> — the feathering of the edge. 0 px gives a hard silhouette; 40 px and above reads as a soft ambient shadow.</Body>
                <Body sm><strong>spread</strong> — grows or shrinks the shadow beyond the element box. Positive values make the shadow larger than the card, negative clips it in.</Body>
              </Stack>
              <SectionLabel>Color and opacity</SectionLabel>
              <Stack>
                <Body sm>Color accepts any CSS paint. This tool outputs the color with the alpha channel explicit, so a 50% opacity shadow reads as the same color with an alpha of 0.5.</Body>
                <Body sm>Stacking multiple shadows: separate them with a comma, and the first listed shadow sits on top.</Body>
                <Body sm>Heavier cards usually pair a tight low-opacity shadow with a wider fainter one for depth without a hard edge.</Body>
              </Stack>
            </Stack>
          </Card>
          <Card mono="Sample values" title="Shadows to start from">
            <div style={{ overflowX: 'auto' }}>
              <table className="lc-table" aria-label="Sample box-shadow values">
                <thead>
                  <tr>
                    <th>Sample</th>
                    <th>Value</th>
                    <th>Use for</th>
                  </tr>
                </thead>
                <tbody>
                  {presetOptions.map((option) => (
                    <tr key={option.value}>
                      <td>{option.label}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))' }}>{buildCss(option.settings)}</td>
                      <td>{option.hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Body sm style={{ marginTop: 'calc(8px * var(--sf))' }}>
              Load any of these on the Generator tab, copy the value, and paste it into your stylesheet.
            </Body>
          </Card>
        </Stack>
      )}
      <Rail title="Quick reference" chips={[`opacity ${settings.opacity}%`, `${library.length} presets in library`]}>
        <SectionLabel>Fields</SectionLabel>
        <Stack>
          <Body sm>X offset and Y offset shift the shadow.</Body>
          <Body sm>Blur and spread scale the shadow.</Body>
          <Body sm>Opacity and Hex color the shadow.</Body>
        </Stack>
        <SectionLabel>Shortcuts</SectionLabel>
        <Stack>
          <Body sm>Copy CSS puts the value on the clipboard.</Body>
          <Body sm>Save downloads the value as a .css file.</Body>
          <Body sm>Add to library stores the current settings.</Body>
        </Stack>
      </Rail>
    </AppShell>
  )
}
