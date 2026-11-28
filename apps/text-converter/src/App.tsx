// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Cols,
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
import { textStats } from '@lacuna/text-stats'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  runPipeline,
  TRANSFORMS,
  type PipelineStep,
  type TransformOp,
} from './engine/pipeline'

interface PersistedState {
  input: string
  steps: PipelineStep[]
}

const DEFAULT_STATE: PersistedState = {
  input: '  Quarterly Launch Checklist  \n  design system review\n  Quarterly Launch Checklist\n  api schema validation  ',
  steps: [
    { id: 's1', op: 'trim', enabled: true },
    { id: 's2', op: 'dedupe', enabled: true },
    { id: 's3', op: 'kebab', enabled: true },
  ],
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<PersistedState>({
    key: 'text-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [nextOp, setNextOp] = useState<TransformOp>('upper')
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const result = useMemo(() => runPipeline(state.input, state.steps), [state.input, state.steps])
  const outStats = useMemo(() => textStats(result.output), [result.output])

  function addStep() {
    const step: PipelineStep = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      op: nextOp,
      enabled: true,
    }
    setState((p) => ({ ...p, steps: [...p.steps, step] }))
  }

  function toggleStep(id: string) {
    setState((p) => ({
      ...p,
      steps: p.steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }))
  }

  function removeStep(id: string) {
    setState((p) => ({ ...p, steps: p.steps.filter((s) => s.id !== id) }))
  }

  function download() {
    saveBlob(new Blob([result.output], { type: 'text/plain;charset=utf-8' }), {
      filename: 'transformed.txt',
      mimeType: 'text/plain;charset=utf-8',
    })
  }

  const side = (
    <Stack>
      <Rail title="Output stats" note={`${state.steps.filter((s) => s.enabled).length} active steps`}>
        <KpiRow>
          <Kpi value={String(outStats.words)} label="Words" accent />
          <Kpi value={String(outStats.characters)} label="Chars" />
          <Kpi value={String(result.output ? result.output.split('\n').length : 0)} label="Lines" />
        </KpiRow>
      </Rail>
      <Rail title="Categories">
        <Keys
          items={[
            ['Case', '9 identifier & prose styles'],
            ['Lines', 'Trim, sort, dedupe, number'],
            ['Encode', 'Base64, URL, Hex, HTML, Morse'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Text Transformer"
      icon="notes"
      hue="blue"
      category="Productivity"
      meta={`${TRANSFORMS.length} transforms`}
      side={side}
    >
      <Stack lg>
        <Card mono="Pipeline" title="Transform steps">
          <FormGrid>
            <Select
              label="Add transform"
              value={nextOp}
              onChange={(v) => setNextOp(v as TransformOp)}
              options={TRANSFORMS.map((t) => ({ value: t.id, label: `${t.group}: ${t.label}` }))}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={addStep}>Add step</PrimaryButton>
            <Button kind="secondary" onClick={() => void copy(result.output)}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="secondary" onClick={download}>
              Download .txt
            </Button>
            {state.steps.length > 0 ? (
              <Button kind="ghost" onClick={() => setState((p) => ({ ...p, steps: [] }))}>
                Clear steps
              </Button>
            ) : null}
          </Actions>

          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            {state.steps.length === 0 ? (
              <EmptyState
                mono="Pass-through"
                title="No transform steps"
                detail="Add a transform step above to process your text."
                actionLabel="Add step"
                onAction={addStep}
              />
            ) : (
              <List label="Active pipeline">
                {state.steps.map((step, idx) => {
                  const spec = TRANSFORMS.find((t) => t.id === step.op)
                  return (
                    <Row
                      key={step.id}
                      title={`${idx + 1}. ${spec?.label ?? step.op}`}
                      meta={spec?.group ?? 'Transform'}
                      value={<Tag accent={step.enabled}>{step.enabled ? 'On' : 'Off'}</Tag>}
                      action={
                        <Actions>
                          <Button kind="ghost" onClick={() => toggleStep(step.id)}>
                            {step.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button kind="ghost" onClick={() => removeStep(step.id)}>
                            Remove
                          </Button>
                        </Actions>
                      }
                    />
                  )
                })}
              </List>
            )}
          </div>
        </Card>

        {result.error ? <ErrorState title="Pipeline error" detail={result.error} /> : null}

        <Cols kind="2">
          <Card mono="Source" title="Input text">
            <TextInput
              label="Source text"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              rows={12}
            />
          </Card>

          <Card mono="Result" title="Transformed output">
            <TextInput
              label="Transformed text"
              value={result.output}
              onChange={() => {}}
              rows={12}
            />
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
