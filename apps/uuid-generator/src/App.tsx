import { useState } from 'react'
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
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host'
import type { HistoryRecord } from './host'
import { generateUuid } from './uuid'
import type { UuidVersion } from './uuid'

const BATCH_MIN = 1
const BATCH_MAX = 25

export function App() {
  const [version, setVersion] = useState<UuidVersion>('v4')
  const [batchText, setBatchText] = useState('1')
  const [records, setRecords] = useState<HistoryRecord[]>(() => host.listHistory())
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const generate = () => {
    let count = Number.parseInt(batchText, 10)
    if (!Number.isInteger(count) || count < BATCH_MIN || count > BATCH_MAX) count = 1
    for (let i = 0; i < count; i += 1) {
      host.addHistory({ value: generateUuid(version), version })
    }
    setRecords(host.listHistory())
  }

  const deleteRecord = (id: string) => {
    host.removeHistory(id)
    setRecords(host.listHistory())
  }

  const clear = () => {
    host.clearHistory()
    setRecords([])
  }

  const copyAll = () => {
    if (records.length > 0) void copy(records.map((r) => r.value).join('\n'))
  }

  const meta = records.length > 0 ? `${records.length} IDs` : 'No IDs'

  return (
    <AppShell
      name="UUID Generator"
      icon="grid"
      hue="blue"
      category="Productivity"
      meta={meta}
      status={copied ? 'Copied to clipboard' : 'Local · history saved on this device'}
      side={
        <Rail title="UUID Generator" note="Two versions · local" chips={['Copy all', 'Clear', 'Survives reload']}>
          <Body sm>
            UUIDs are generated on this page with the device clock and crypto randomness. The history is
            kept in local storage and never leaves the browser.
          </Body>
        </Rail>
      }
    >
      <Card mono="New" title="Generate">
        <FormGrid>
          <Select
            label="Version"
            value={version}
            onChange={(value) => setVersion(value as UuidVersion)}
            options={[
              { value: 'v4', label: 'v4 (random)' },
              { value: 'v1', label: 'v1 (time)' },
            ]}
          />
          <TextInput label="Batch size" type="number" value={batchText} onChange={setBatchText} />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={generate}>Generate</Button>
        </Actions>
      </Card>

      <Card
        mono={`${records.length} kept`}
        title="History"
        actions={
          <Actions>
            <Button kind="secondary" onClick={copyAll} disabled={records.length === 0}>
              {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button kind="ghost" onClick={clear} disabled={records.length === 0}>
              Clear history
            </Button>
          </Actions>
        }
      >
        {records.length === 0 ? (
          <EmptyState mono="Empty" title="No IDs generated yet" detail="Pick a version and press Generate above." />
        ) : (
          records.map((record) => (
            <List key={record.id} label="History">
              <Row
                title={record.value}
                action={
                  <button
                    type="button"
                    className="lc-btn ghost"
                    aria-label={`Delete ${record.value.slice(0, 8)}`}
                    onClick={() => deleteRecord(record.id)}
                  >
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M6 6 L18 18 M18 6 L6 18" />
                    </svg>
                  </button>
                }
              />
            </List>
          ))
        )}
      </Card>
    </AppShell>
  )
}
