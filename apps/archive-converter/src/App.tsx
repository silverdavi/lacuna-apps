// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  buildArchive,
  createSampleEntries,
  formatBytes,
  readIncomingFiles,
  type ArchiveEntry,
  type ArchiveFormat,
} from './engine/archive'

interface HistoryItem {
  id: string
  filename: string
  format: ArchiveFormat
  fileCount: number
  bytes: number
}

interface PersistedState {
  format: ArchiveFormat
  archiveName: string
  history: HistoryItem[]
}

const DEFAULT_STATE: PersistedState = {
  format: 'zip',
  archiveName: 'bundle',
  history: [],
}

function isPreviewableText(name: string): boolean {
  return /\.(txt|md|json|csv|xml|yaml|yml|html|css|js|ts|svg|ini|env|log)$/i.test(name)
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<PersistedState>({
    key: 'archive-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [entries, setEntries] = useState<ArchiveEntry[]>([])
  const [sourceLabel, setSourceLabel] = useState<string>('Empty')
  const [previewName, setPreviewName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastOutput, setLastOutput] = useState<{ blob: Blob; filename: string; mime: string } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const totalRawBytes = entries.reduce((s, e) => s + e.data.length, 0)
  const previewEntry = entries.find((e) => e.name === previewName) ?? null

  async function onFiles(fileList: FileList | File[]) {
    setError(null)
    const files = Array.from(fileList)
    if (files.length === 0) return
    try {
      const { entries: loaded, sourceLabel: label } = await readIncomingFiles(files)
      setEntries((prev) => [...prev, ...loaded])
      setSourceLabel(label)
      setLastOutput(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read archive or files')
    }
  }

  function loadSample() {
    setError(null)
    setEntries(createSampleEntries())
    setSourceLabel('Sample bundle')
    setPreviewName('README.md')
    setLastOutput(null)
  }

  async function packOrConvert() {
    if (entries.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const built = await buildArchive(entries, prefs.format, prefs.archiveName || 'bundle')
      setLastOutput(built)
      const item: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename: built.filename,
        format: prefs.format,
        fileCount: entries.length,
        bytes: built.blob.size,
      }
      setPrefs((p) => ({ ...p, history: [item, ...p.history].slice(0, 40) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive build failed')
    } finally {
      setBusy(false)
    }
  }

  const side = (
    <Stack>
      <Rail title="Archive" note={sourceLabel}>
        <KpiRow>
          <Kpi value={String(entries.length)} label="Files" accent />
          <Kpi value={formatBytes(totalRawBytes)} label="Raw" />
          <Kpi value={lastOutput ? formatBytes(lastOutput.blob.size) : '—'} label="Packed" />
        </KpiRow>
      </Rail>
      <Rail title="Supported">
        <Keys
          items={[
            ['ZIP', 'Read & write (Deflate)'],
            ['TAR', 'USTAR 512B blocks'],
            ['TAR.GZ', 'GZIP compressed TAR'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Archive Studio"
      icon="folder"
      hue="blue"
      category="Productivity"
      meta="ZIP · TAR · TAR.GZ"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) void onFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Archive error" detail={error} /> : null}

        <Card mono="Input" title="Files or archive">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.files) void onFiles(e.dataTransfer.files)
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(20px * var(--sf))',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--paper-deep)',
            }}
          >
            <p style={{ margin: 0, fontSize: 'calc(13.5px * var(--tf))' }}>
              Drop a ZIP, TAR, TAR.GZ, or loose files to unpack or pack
            </p>
          </div>
          <Actions>
            <Button kind="secondary" onClick={loadSample}>
              Load sample bundle
            </Button>
            {entries.length > 0 ? (
              <Button
                kind="ghost"
                onClick={() => {
                  setEntries([])
                  setPreviewName(null)
                  setLastOutput(null)
                  setSourceLabel('Empty')
                }}
              >
                Clear entries
              </Button>
            ) : null}
          </Actions>

          {entries.length > 0 ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <List label="Archive entries">
                {entries.map((entry, idx) => (
                  <Row
                    key={`${entry.name}-${idx}`}
                    title={entry.name}
                    meta={formatBytes(entry.data.length)}
                    hot={previewName === entry.name}
                    onClick={isPreviewableText(entry.name) ? () => setPreviewName(entry.name) : undefined}
                    value={isPreviewableText(entry.name) ? <Tag>Text</Tag> : <Tag>Binary</Tag>}
                    action={
                      <Button
                        kind="ghost"
                        onClick={() =>
                          saveBlob(new Blob([entry.data as BlobPart]), {
                            filename: entry.name.split('/').pop() || entry.name,
                            mimeType: 'application/octet-stream',
                          })
                        }
                      >
                        Extract
                      </Button>
                    }
                  />
                ))}
              </List>
            </div>
          ) : null}
        </Card>

        {previewEntry ? (
          <Card mono="Preview" title={previewEntry.name}>
            <pre
              style={{
                margin: 0,
                padding: 'calc(12px * var(--sf))',
                background: 'var(--paper-deep)',
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 'calc(2px * var(--sf))',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(12px * var(--tf))',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {new TextDecoder('utf-8', { fatal: false }).decode(previewEntry.data.slice(0, 8192))}
            </pre>
          </Card>
        ) : null}

        <Card mono="Output" title="Pack or convert">
          <FormGrid>
            <TextInput
              label="Archive name"
              value={prefs.archiveName}
              onChange={(v) => setPrefs((p) => ({ ...p, archiveName: v }))}
              placeholder="bundle"
            />
            <Select
              label="Target format"
              value={prefs.format}
              onChange={(v) => setPrefs((p) => ({ ...p, format: v as ArchiveFormat }))}
              options={[
                { value: 'zip', label: 'ZIP (.zip)' },
                { value: 'tar', label: 'TAR (.tar)' },
                { value: 'tar.gz', label: 'TAR.GZ (.tar.gz)' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={() => void packOrConvert()} disabled={entries.length === 0 || busy}>
              {busy ? 'Building…' : 'Build archive'}
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={!lastOutput}
              onClick={() => {
                if (lastOutput) {
                  saveBlob(lastOutput.blob, { filename: lastOutput.filename, mimeType: lastOutput.mime })
                }
              }}
            >
              Download archive
            </Button>
          </Actions>
          {lastOutput ? (
            <p style={{ margin: 'calc(8px * var(--sf)) 0 0', fontSize: 'calc(13px * var(--tf))' }}>
              Ready: {lastOutput.filename} ({formatBytes(lastOutput.blob.size)})
            </p>
          ) : null}
        </Card>

        <Card mono="History" title="Recent archives">
          {prefs.history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No archives built yet"
              detail="Load the sample bundle or drop files to build a ZIP, TAR, or TAR.GZ."
              actionLabel="Load sample bundle"
              onAction={loadSample}
            />
          ) : (
            <>
              <List label="Archive history">
                {prefs.history.map((h) => (
                  <Row
                    key={h.id}
                    title={h.filename}
                    meta={`${h.fileCount} files · ${formatBytes(h.bytes)}`}
                    value={<Tag>{h.format.toUpperCase()}</Tag>}
                  />
                ))}
              </List>
              <Actions>
                <Button kind="ghost" onClick={() => setPrefs((p) => ({ ...p, history: [] }))}>
                  Clear history
                </Button>
              </Actions>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
