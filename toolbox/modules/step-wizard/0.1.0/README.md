<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components StepWizard at f879fb0. -->

> `@lacuna/step-wizard` `0.1.0`. To use it in an app: add `"@lacuna/step-wizard": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/step-wizard": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/step-wizard'`.

# StepWizard

A multi-step flow container that renders a progress indicator, the current step's content, and Back/Next navigation. The parent controls which step is shown via the `currentStep` prop and receives step transitions through `onStepChange`. On the last step the Next button becomes a Finish button; clicking it calls `onStepChange` with the current index so the parent can decide what "done" means. The component has no overlay and does not respond to Escape.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `steps` | `string[]` | Labels for each step, shown in the progress indicator. |
| `currentStep` | `number` | Zero-based index of the active step. |
| `onStepChange` | `(step: number) => void` | Called with the new step index on Back, Next, or Finish. |
| `children` | `ReactNode` | Content rendered inside the active step panel. |
| `className` | `string?` | Extra class applied to the root element. |

## Usage

```tsx
import { useState } from 'react'
import { StepWizard } from '@lacuna/step-wizard'

export function SetupWizard() {
  const [step, setStep] = useState(0)
  return (
    <StepWizard steps={['Account', 'Profile', 'Review']} currentStep={step} onStepChange={setStep}>
      <p>Step {step + 1} content</p>
    </StepWizard>
  )
}
```
