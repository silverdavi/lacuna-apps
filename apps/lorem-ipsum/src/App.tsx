import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'

import { saveText } from '@lacuna/file-save-open'
import { generateLorem, type Unit } from './lorem'

const COPY_LABEL_MS = 1500

const STORAGE_KEY = 'lacuna.lorem-ipsum.snippets'
const SNIPPET_LENGTH = 40

interface SnippetData {
  text: string
}

type Tab = 'Generate' | 'Saved'

export function App() {
  const [tab, setTab] = useState<Tab>('Generate')
  const [seed, setSeed] = useState('')
  const [unit, setUnit] = useState<Unit>('Sentences')
  const [count, setCount] = useState('1')
  const [output, setOutput] = useState('')

  const { state, actions } = useCollection<SnippetData>({ storageKey: STORAGE_KEY })
  const snippets = state.activeItems
    .map((item) => ({ id: item.id, text: item.data.text }))
    .reverse()

  const { copy } = useClipboard({ timeoutMs: COPY_LABEL_MS })
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  const onGenerate = () => {
    setOutput(generateLorem({ seed, unit, count: Number(count) }))
  }

  const onCopy = () => {
    setFlash(true)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(false), COPY_LABEL_MS)
    void copy(output)
  }

  const onDownload = () => {
    saveText(output, { filename: 'lorem-ipsum.txt', mimeType: 'text/plain' })
  }

  const onSave = () => {
    if (output === '') return
    actions.add({ text: output.slice(0, SNIPPET_LENGTH) })
  }

  const hasOutput = output !== ''

  const countLabel = useMemo(() => `${Math.max(0, Math.trunc(Number(count) || 0))} ${unit.toLowerCase()}`, [count, unit])

  return (
    <AppShell name="Lorem Ipsum Generator" icon="docs" hue="gold" category="Productivity">
      <div role="tablist" aria-label="Tabs" style={{ display: 'flex', gap: 'calc(12px * var(--sf))' }}>
        {(['Generate', 'Saved'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(13px * var(--tf))',
              fontWeight: 600,
              color: tab === item ? 'var(--ink)' : 'var(--ink-60)',
              background: 'none',
              border: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === item ? 'var(--accent)' : 'transparent'}`,
              padding: 'calc(4px * var(--sf)) calc(2px * var(--sf))',
              cursor: 'pointer',
            }}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label="Generate" hidden={tab !== 'Generate'}>
          <Card mono="Options" title="Generate">
            <FormGrid>
              <TextInput label="Seed" value={seed} onChange={setSeed} hint="Empty means a new result each time" />
              <Select
                label="Unit"
                value={unit}
                onChange={(v) => setUnit(v as Unit)}
                options={['Sentences', 'Words', 'Paragraphs']}
              />
              <TextInput label="Count" type="number" inputMode="numeric" value={count} onChange={setCount} />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={onGenerate}>Generate</PrimaryButton>
            </Actions>
          </Card>

          <Card mono={hasOutput ? countLabel : 'Empty'} title="Output">
            {hasOutput ? (
              <>
                <div
                  style={{
                    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    borderRadius: 'calc(2px * var(--sf))',
                    background: 'var(--ui-card)',
                    padding: 'calc(12px * var(--sf))',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>{output}</pre>
                </div>
                <Actions>
                  <Button kind="secondary" onClick={onCopy} ariaLabel="Copy">
                    {flash ? 'Copied' : 'Copy'}
                  </Button>
                  <Button kind="secondary" onClick={onDownload}>Download</Button>
                  <Button kind="secondary" onClick={onSave}>Save to list</Button>
                </Actions>
              </>
            ) : (
              <EmptyState
                mono="Empty"
                title="No text yet"
                detail="Set a unit and a count, then press the Generate button above."
                actionLabel="Go to options"
              />
            )}
          </Card>
        </div>

      <div role="tabpanel" aria-label="Saved" hidden={tab !== 'Saved'}>
        <Card mono={`${snippets.length} saved`} title="Saved snippets">
            {snippets.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No saved snippets"
                detail="Generate some text and use Save to list to keep it here."
                actionLabel="Start generating"
                onAction={() => setTab('Generate')}
              />
            ) : (
              <div
                role="list"
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  borderRadius: 'calc(2px * var(--sf))',
                }}
              >
                {snippets.map((snippet, index) => (
                  <Row
                    key={snippet.id}
                    title={snippet.text}
                    meta={String(index + 1)}
                    action={
                      <Button kind="ghost" ariaLabel="Delete" onClick={() => actions.remove(snippet.id)}>
                        Delete
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
      </div>
    </AppShell>
  )
}
