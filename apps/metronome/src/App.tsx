import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Row,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'

function TabBar({
  items,
  active,
  onSelect,
}: {
  items: string[]
  active: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="lc-tabs" role="tablist" aria-label="View">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          role="tab"
          aria-selected={item === active}
          className={`mt-tab${item === active ? ' active' : ''}`}
          style={{ color: 'var(--ink-80)' }}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

type Preset = { name: string; bpm: number; signature: string }

type Tab = 'metronome' | 'presets'

const APP_ID = 'lacuna.metronome'
const BACKUP_VERSION = 1
const SIGNATURES = ['2/4', '3/4', '4/4', '6/8']

const clampBpm = (value: number) => {
  if (!Number.isFinite(value)) return '120'
  return String(Math.max(30, Math.min(240, Math.round(value))))
}

function App() {
  const [tab, setTab] = useState<Tab>('metronome')
  const [bpm, setBpm] = useState('120')
  const bpmNumber = Number(bpm) || 120
  const [signature, setSignature] = useState('4/4')
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [presetName, setPresetName] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [toast, setToast] = useState('')
  const toastRef = useRef(toast)
  toastRef.current = toast
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { state, actions } = useCollection<Preset>({
    storageKey: 'lacuna.metronome.presets',
  })
  const presets = state.activeItems
  const beats = Number(signature.split('/')[0] ?? 4) || 4
  const beatsRef = useRef(beats)
  beatsRef.current = beats
  const bpmRef = useRef(bpmNumber)
  bpmRef.current = bpmNumber

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  const flash = (message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      if (toastRef.current === message) setToast('')
    }, 2400)
  }

  const start = () => {
    if (timer.current) clearInterval(timer.current)
    setRunning(true)
    setBeat(1)
    timer.current = setInterval(
      () => setBeat((b) => (b % beatsRef.current) + 1),
      Math.round(60000 / bpmRef.current),
    )
  }

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setRunning(false)
    setBeat(0)
  }

  const savePreset = () => {
    const name = presetName.trim()
    if (!name) {
      flash('Name the preset before saving')
      return
    }
    actions.add({ name, bpm: bpmNumber, signature })
    setPresetName('')
    flash('Preset saved')
  }

  const deletePreset = (id: string) => {
    actions.remove(id)
    flash('Preset deleted')
  }

  const backupText = () =>
    exportBackup({
      appId: APP_ID,
      version: BACKUP_VERSION,
      filename: 'metronome',
      records: presets.map((item) => ({
        id: item.id,
        data: item.data,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    })

  const csvText = () =>
    [
      'name,bpm,signature',
      ...presets.map((item) =>
        [item.data.name, item.data.bpm, item.data.signature]
          .map((field) => (String(field).includes(',') || String(field).includes('"') ? `"${String(field).replace(/"/g, '""')}"` : String(field)))
          .join(','),
      ),
    ].join('\n')

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      label: 'JSON (full backup)',
      mimeType: 'application/json',
      extension: 'json',
      getData: backupText,
    },
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: csvText,
    },
  ]

  const pickImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file === undefined || file === null) return
      file
        .text()
        .then((text) => {
          try {
            const result = importBackup<Preset>(text, {
              currentVersion: BACKUP_VERSION,
              validate: (record) =>
                typeof record.data.name === 'string' &&
                typeof record.data.bpm === 'number' &&
                typeof record.data.signature === 'string'
                  ? null
                  : 'not a preset record',
            })
            const known = new Set(presets.map((item) => item.id))
            let added = 0
            for (const record of result.records) {
              if (known.has(record.id)) continue
              actions.add(record.data)
              added += 1
            }
            setImportMsg(added > 0 ? `Imported ${added} new ${added === 1 ? 'preset' : 'presets'}.` : 'No new presets in that backup.')
          } catch (err) {
            setImportMsg(err instanceof Error ? err.message : 'Could not read that file.')
          }
        })
        .catch(() => setImportMsg('Could not read that file.'))
    }
    input.click()
  }

  const intervalMs = Math.round(60000 / bpmNumber)
  const meta =
    presets.length === 0
      ? '0 presets'
      : `${presets.length} preset${presets.length === 1 ? '' : 's'}`

  return (
    <>
      <TabBar
        items={['Metronome', 'Presets']}
        active={tab === 'metronome' ? 'Metronome' : 'Presets'}
        onSelect={(v) => setTab(v === 'Presets' ? 'presets' : 'metronome')}
      />
      <AppShell
        name="Music Metronome"
        icon="paint"
        category="Music"
        status={running ? 'Running' : 'Stopped'}
        meta={meta}
        actions={
          toast ? (
            <p className="lc-mono" role="status" aria-live="polite" style={{ margin: 0, color: 'var(--ok)' }}>
              {toast}
            </p>
          ) : undefined
        }
      >
        {tab === 'metronome' ? (
          <Stack>
            <Card title="Metronome" mono="Tempo">
              <FormGrid>
                <TextInput
                  label="BPM"
                  type="number"
                  inputMode="numeric"
                  value={bpm}
                  onChange={(v) => setBpm(clampBpm(Number(v)))}
                />
                <Select
                  label="Time signature"
                  value={signature}
                  onChange={setSignature}
                  options={SIGNATURES}
                />
              </FormGrid>
              <FormGrid>
                <TextInput
                  label="Preset name"
                  placeholder="e.g. Jazz"
                  value={presetName}
                  onChange={setPresetName}
                />
              </FormGrid>
              <div className="lk-actions">
                <Button kind="primary" onClick={running ? stop : start}>
                  {running ? 'Stop' : 'Start'}
                </Button>
                <Button kind="primary" onClick={savePreset}>
                  Save preset
                </Button>
              </div>
            </Card>
            <Card title="Saved presets" mono="Collection">
              {presets.length === 0 ? (
                <EmptyState
                  title="No presets yet"
                  detail="Save one with a name to keep it here."
                  actionLabel="Name a preset, then save it"
                />
              ) : (
                <List label="Saved presets">
                  {presets.map((item) => (
                    <Row
                      key={item.id}
                      title={item.data.name}
                      meta={`${item.data.bpm} BPM`}
                      value={item.data.signature}
                      action={
                        <Button
                          kind="secondary"
                          ariaLabel={`Delete ${item.data.name}`}
                          onClick={() => deletePreset(item.id)}
                        >
                          Delete
                        </Button>
                      }
                    />
                  ))}
                </List>
              )}
            </Card>
            <KpiRow>
              <Kpi value={`${intervalMs} ms`} label="Interval per beat" />
              <Kpi value={running ? `${beat} / ${beats}` : `0 / ${beats}`} label="Beat" />
            </KpiRow>
          </Stack>
        ) : (
          <Stack>
            <Card title="Presets" mono="Saved">
              {presets.length === 0 ? (
                <EmptyState
                  title="No presets yet"
                  detail="Save one from the Metronome tab."
                  actionLabel="Name a preset, then save it"
                />
              ) : (
                <List label="Presets">
                  {presets.map((item) => (
                    <Row
                      key={item.id}
                      title={item.data.name}
                      meta={`${item.data.bpm} BPM`}
                      value={item.data.signature}
                      action={
                        <Button
                          kind="secondary"
                          ariaLabel={`Delete ${item.data.name}`}
                          onClick={() => deletePreset(item.id)}
                        >
                          Delete
                        </Button>
                      }
                    />
                  ))}
                </List>
              )}
            </Card>
            <Card title="Export & import" mono="Data">
              <Body sm>
                Download your presets as a JSON backup or CSV, or merge a previous backup.
                Importing adds new presets without duplicating existing ones.
              </Body>
              <Stack>
                <ExportMenu
                  options={exportOptions}
                  fileName="metronome"
                  ariaLabel="Export presets"
                  disabled={presets.length === 0}
                  onExport={() => flash('Presets exported')}
                  onError={() => flash('Export failed')}
                />
                <Button kind="ghost" onClick={pickImport}>
                  Import backup
                </Button>
                {importMsg !== '' && <Body sm>{importMsg}</Body>}
              </Stack>
            </Card>
          </Stack>
        )}
      </AppShell>
    </>
  )
}

export default App
