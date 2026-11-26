// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/step-wizard 0.1.0: snapshot of lacuna-components StepWizard at f879fb0 by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties, ReactNode } from 'react'
import { Button, Card } from '@lacuna/ui'

export interface StepWizardProps {
  steps: string[]
  currentStep: number
  onStepChange: (step: number) => void
  children: ReactNode
  className?: string
}

const CONTAINER: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(16px * var(--sf))',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
}

const HEADING: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--serif)',
  fontWeight: 500,
  fontSize: 'calc(18px * var(--tf))',
  color: 'var(--ink)',
}

const BAR: CSSProperties = {
  position: 'relative',
  height: 'calc(6px * var(--sf))',
  borderRadius: 'calc(3px * var(--sf))',
  backgroundColor: 'var(--paper-deep)',
  overflow: 'hidden',
}

const BAR_LABELS: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'calc(8px * var(--sf))',
}

const LABEL_ITEM: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(11px * var(--tf))',
  color: 'var(--ink)',
}

const LABEL_ITEM_ACTIVE: CSSProperties = {
  ...LABEL_ITEM,
  color: 'var(--ink)',
  fontWeight: 600,
}

const CONTENT: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(16px * var(--sf))',
}

// The kit's --accent/--on-accent pair falls below 4.5:1 for the primary button
// in dark appearance; override with the guaranteed-contrast ink/paper pair.
const PRIMARY_BUTTON: CSSProperties = {
  backgroundColor: 'var(--ink)',
  color: 'var(--paper)',
}

export function StepWizard(props: StepWizardProps): ReactNode {
  const { steps, currentStep, onStepChange, children, className } = props
  const total = steps.length
  const isFirst = currentStep === 0
  const isLast = currentStep === total - 1
  const stepLabel = steps[currentStep] ?? ''
  const heading = `Step ${currentStep + 1} of ${total}: ${stepLabel}`
  const progressPct = total > 0 ? ((currentStep + 1) / total) * 100 : 0

  return (
    <div className={className} style={CONTAINER}>
      <h2 style={HEADING}>{heading}</h2>

      <Card
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--sf))' }}
      >
        <div
          role="progressbar"
          aria-label="Step progress"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          style={BAR}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${progressPct}%`,
              backgroundColor: 'var(--ink)',
            }}
          />
        </div>
        <div style={BAR_LABELS}>
          {steps.map((label, i) => (
            <span
              key={label}
              aria-current={i === currentStep ? 'step' : undefined}
              style={i === currentStep ? LABEL_ITEM_ACTIVE : LABEL_ITEM}
            >
              {label}
            </span>
          ))}
        </div>
      </Card>

      <Card style={CONTENT}>{children}</Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'calc(8px * var(--sf))',
        }}
      >
        {!isFirst && (
          <Button kind="secondary" onClick={() => onStepChange(currentStep - 1)}>
            Back
          </Button>
        )}
        {isLast ? (
          <Button kind="primary" style={PRIMARY_BUTTON} onClick={() => onStepChange(currentStep)}>
            Finish
          </Button>
        ) : (
          <Button kind="primary" style={PRIMARY_BUTTON} onClick={() => onStepChange(currentStep + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
