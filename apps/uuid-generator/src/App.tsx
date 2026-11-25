import { useCallback, useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Rail,
  Row,
  Select,
  Stack,
  Tabs,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveText, saveJSON } from '@lacuna/file-save-open'
import { host } from './host'
import { generateUuid, formatUuid, type UuidVersion } from './uuid'

type TabId = 'History' | 'Data'

const TABS: TabId[] = ['History', 'Data']

const BATCH_MIN = 1
const BATCH_MAX = 25

export function App() {
  const [error, setError] = useState<unknown>(null)
  const [tab, setTab] = useState<TabId>('History')
  const [version, setVersion] = useState<UuidVersion>(() => host.loadSettings().version)
  const [upper, setUpper] = useState<boolean>(() => host.loadSettings().upper)
  const [batchText, setBatchText] = useState<string>(() => String(host.loadSettings().batch))
  const [batchError, setBatchError] = useState<string | null>(null)
  const [records, setRecords] = useState(() => host.listHistory())
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  useEffect(() => {
    host.saveSettings({
      version,
      batch: Number.parseInt(batchText, 10) || 1,
      upper,
    })
  }, [version, upper, batchText])

  const generate = useCallback(() => {
    try {
      setError(null)
      const n = Number.parseInt(batchText, 10)
      if (!Number.isInteger(n) || n < BATCH_MIN || n > BATCH_MAX) {
        setBatchError(`Enter a whole number between ${BATCH_MIN} and ${BATCH_MAX}`)
        return
      }
      setBatchError(null)
      const made = Array.from({ length: n }, () => {
        const value = generateUuid(version)
        return host.addHistory({ value, version })
      })
      setRecords(host.listHistory())
      void copy(made.map((r) => formatUuid(r.value, upper)).join('\n'))
    } catch (err) {
      setError(err)
    }
  }, [batchText, version, upper, copy])

  const deleteRecord = (id: string) => {
    host.removeHistory(id)
    setRecords(host.listHistory())
  }

  const clear = () => {
    host.clearHistory()
    setRecords([])
  }

  const copyAll = () => {
    if (records.length > 0) void copy(records.map((r) => formatUuid(r.value, upper)).join('\n'))
  }

  const onExportText = () => {
    const lines = records.map((h) => formatUuid(h.value, upper))
    saveText(lines.join('\n') + '\n', { filename: 'uuids.txt', mimeType: 'text/plain' })
    setExportMsg(`Exported ${lines.length} ${lines.length === 1 ? 'ID' : 'IDs'} as text.`)
  }

  const onExportJson = () => {
    saveJSON(
      records.map((h) => ({ version: h.version, value: formatUuid(h.value, upper) })),
      { filename: 'uuids.json' },
    )
    setExportMsg(`Exported ${records.length} ${records.length === 1 ? 'ID' : 'IDs'} as JSON.`)
  }

  const meta = records.length > 0 ? `${records.length} IDs` : 'No IDs'

  if (error !== null) {
    return (
      <AppShell name="UUID Generator" icon="grid" hue="cobalt" category="Productivity">
        <Card mono="Error" title="Something went wrong">
          <Body sm>{error instanceof Error ? error.message : String(error)}</Body>
          <Actions>
            <Button kind="primary" onClick={generate}>
              Retry
            </Button>
          </Actions>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      name="UUID Generator"
      icon="grid"
      hue="cobalt"
      category="Productivity"
      meta={meta}
      status={copied ? 'Copied to clipboard' : 'Local · history saved on this device'}
      side={
        <Rail
          title="UUID Generator"
          note={upper ? 'UPPERCASE · local' : 'lowercase · local'}
          chips={['Copy all', 'Clear', 'Survives reload']}
        >
          <Body sm>
            UUIDs are generated on this page with the device clock and crypto randomness. The history
            is kept in local storage and never leaves the browser.
          </Body>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Select
              label="Case"
              value={upper ? 'upper' : 'lower'}
              onChange={(v) => setUpper(v === 'upper')}
              options={[
                { value: 'lower', label: 'lowercase' },
                { value: 'upper', label: 'UPPERCASE' },
              ]}
            />
          </div>
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="New" title="Generate">
          <FormGrid>
            <Select
              label="Version"
              value={version}
              onChange={(value) => setVersion(value as UuidVersion)}
              options={[
                { value: 'v4', label: 'v4' },
                { value: 'v1', label: 'v1' },
              ]}
            />
            <TextInput
              label="Batch size"
              type="number"
              value={batchText}
              onChange={(value) => {
                setBatchText(value)
                const n = Number.parseInt(value, 10)
                setBatchError(
                  !Number.isInteger(n) || n < BATCH_MIN || n > BATCH_MAX
                    ? `Enter a whole number between ${BATCH_MIN} and ${BATCH_MAX}`
                    : null,
                )
              }}
              placeholder="1–25"
              error={batchError}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={generate}>
              Generate
            </Button>
          </Actions>
        </Card>

        <Card mono={`${records.length} kept`} title="History">
          {records.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No IDs generated yet"
              detail="Pick a version and press Generate above."
            />
          ) : (
            <Stack>
              <Actions>
                <Tabs items={TABS} active={tab} onSelect={(v) => setTab(v as TabId)} />
              </Actions>
              {tab === 'History' && (
                <List label="History">
                  {records.map((record) => (
                    <Row
                      key={record.id}
                      title={formatUuid(record.value, upper)}
                      action={
                        <button
                          type="button"
                          className="lc-btn ghost"
                          aria-label={`Delete ${record.value.slice(0, 8)}`}
                          onClick={() => deleteRecord(record.id)}
                        >
                          <span aria-hidden="true" style={{ display: 'none' }}>
                            Delete
                          </span>
                        </button>
                      }
                    />
                  ))}
                </List>
              )}
              {tab === 'Data' && (
                <Stack>
                  <Body sm>Download everything in your history. Nothing leaves this device.</Body>
                  <Actions>
                    <Button kind="secondary" onClick={onExportText} disabled={records.length === 0}>
                      Export .txt
                    </Button>
                    <Button kind="secondary" onClick={onExportJson} disabled={records.length === 0}>
                      Export .json
                    </Button>
                  </Actions>
                  {exportMsg !== null && <Body sm>{exportMsg}</Body>}
                </Stack>
              )}
            </Stack>
          )}
        </Card>

        {records.length > 0 && (
          <Actions>
            <Button kind="ghost" onClick={copyAll} disabled={records.length === 0}>
              {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button kind="ghost" onClick={clear} disabled={records.length === 0}>
              Clear history
            </Button>
          </Actions>
        )}
      </Stack>
    </AppShell>
  )
}
