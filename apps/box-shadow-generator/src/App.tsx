// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { Actions, AppShell, Body, Button, Card, FormGrid, PrimaryButton, Rail, SectionLabel, Stack, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { createMockValue } from '@lacuna/host-mock'
import { saveText } from '@lacuna/file-save-open'
import { toKebabCase } from '@lacuna/text-transforms'
import { shadowColor, toRgb } from './colors'
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

const STORAGE_KEY = 'lacuna.box-shadow-generator.settings'

const settingsStore = createMockValue<ShadowSettings>({
  key: STORAGE_KEY,
  fallback: DEFAULTS,
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

export function App() {
  const [settings, setSettings] = useState<ShadowSettings>(() => settingsStore.get())
  const [toast, setToast] = useState('')
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  useEffect(() => {
    settingsStore.set(settings)
  }, [settings])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const css = useMemo(() => {
    const { r, g, b } = toRgb(settings.hex)
    const alpha = toAlpha(settings.opacity)
    return `box-shadow: ${toNumber(settings.x)}px ${toNumber(settings.y)}px ${toNumber(settings.blur)}px ${toNumber(settings.spread)}px ${shadowColor(r, g, b, alpha)};`
  }, [settings])

  function update<K extends keyof ShadowSettings>(key: K, value: ShadowSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function reset() {
    setSettings(DEFAULTS)
  }

  async function copyCss() {
    await copy(css)
    setToast('CSS copied to clipboard')
  }

  function downloadCss() {
    saveText(css, { filename: `box-shadow-${toKebabCase('generator')}.css`, mimeType: 'text/css' })
  }

  return (
    <AppShell
      name="Box Shadow Generator"
      icon="design"
      hue="blue"
      category="Design"
      meta="CSS"
      status={copied ? 'CSS copied to clipboard' : toast || undefined}
    >
      <Card mono="Input" title="Shadow settings">
        <FormGrid>
          <TextInput label="X offset" type="number" value={settings.x} onChange={(value) => update('x', value)} />
          <TextInput label="Y offset" type="number" value={settings.y} onChange={(value) => update('y', value)} />
          <TextInput label="Blur" type="number" value={settings.blur} onChange={(value) => update('blur', value)} />
          <TextInput label="Spread" type="number" value={settings.spread} onChange={(value) => update('spread', value)} />
          <TextInput label="Opacity" type="number" value={settings.opacity} onChange={(value) => update('opacity', value)} />
          <TextInput label="Hex" value={settings.hex} onChange={(value) => update('hex', value)} />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={copyCss}>Copy CSS</PrimaryButton>
          <Button kind="secondary" onClick={reset}>Reset</Button>
          <Button kind="ghost" onClick={downloadCss}>Save</Button>
        </Actions>
      </Card>
      <Card mono="Output" title="Generated CSS">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', color: 'var(--ink)', fontSize: 'calc(14px * var(--tf))', lineHeight: 'calc(20px * var(--tf))' }}>
          <code>{css}</code>
        </pre>
      </Card>
      <Rail title="Quick reference">
        <SectionLabel>Fields</SectionLabel>
        <Stack>
          <Body sm>X offset and Y offset shift the shadow.</Body>
          <Body sm>Blur and spread scale the shadow.</Body>
          <Body sm>Opacity and Hex color the shadow.</Body>
        </Stack>
      </Rail>
    </AppShell>
  )
}
