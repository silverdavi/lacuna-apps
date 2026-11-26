# The app kit

Every app is one `AppShell` with `Card` panels inside. All of it comes from `@lacuna/ui`. The app writes no CSS for anything listed here.

`src/main.tsx` loads the look once (fonts, tokens, classes): `import '@lacuna/ui/base.css'`.

Platform behavior is `behavior.tsx`, exported from `@lacuna/ui`: `PrimaryButton` (the one primary action), `HIT_MIN_PX` (24), `FOCUS_RING`, and `EmptyState` with `actionLabel` (the next action). The focus ring is the kit's `:focus-visible` outline. `AppShell` is the only header: pass `name`, `hue`, and `category`. Do not draw a logo, an APPS link, a breadcrumb, or a top bar.

`Adopt` (`adopt.tsx`) is the one-line mount for markdown-table, pomodoro, receipt-packet, tex-snippet, and tip-split: `<Adopt name="Tip Split" hue="green" category="Finance"><ExistingScreen /></Adopt>`. A later rebuild uses that and deletes the app's header. Do not restyle those five by hand.

## Frame

| Component | Props | Draws |
|---|---|---|
| `AppShell` | `name`, `icon`, `hue`, `category`, `meta`, `status`, `actions`, `side` | Standalone top bar with breadcrumb (omitted automatically when framed by the launcher), the framed app window with its title bar (the page `h1`), optional right rail, and optional live status strip. Do not add your own home link or narrate that the app runs locally or offline. |
| `Rail` | `title`, `note`, `chips` | One box in the right rail (`side`) for secondary controls, live totals, or keyboard shortcuts (`Keys`). Omit `side` when you have none; never repeat the window title or list static feature bullets. |
| `Card` | `mono`, `title`, `actions`, `accent`, `flush` | A panel: mono label, serif title, hairline border |
| `SectionLabel` | `accent` | Small uppercase mono `h2` above a group |
| `Cols` `Stack` `Spread` `Divider` | `kind="2" \| "3" \| "main-side"` | Layout |

`hue` is one of `rust`, `cobalt`, `blue`, `gold`, `green`, `brown`, `teal`. Pick by what the app is for: money `green`, lists and notes `gold`, games `cobalt`, converters and developer tools `blue`, health `teal`, writing and files `rust`, anything else `brown`. `icon` is a name from `toolbox/ui/icons.tsx`.

`AppShell` owns the page: the background, the `h1`, the `<main>`, the header and the footer. Do not add your own.

## Controls

| Component | Props |
|---|---|
| `Button` | `kind="primary" \| "secondary" \| "ghost" \| "ink" \| "danger"`, `onClick`, `disabled`, `ariaLabel`. One `primary` per panel. Prefer `PrimaryButton` for that one. |
| `TextInput` | `label`, `value`, `onChange`, `error`, `hint`, `placeholder`, `type`, `inputMode`, `rows` (textarea) |
| `Select` | `label`, `value`, `onChange`, `options`, `error` |
| `Checkbox` | `label`, `checked`, `onChange` |
| `FormGrid` | Wraps fields in a responsive grid |
| `Actions` | Wraps a row of buttons |
| `Tabs` `Pills` | `items`, `active`, `onSelect` |

## Content

| Component | Props |
|---|---|
| `Kpi` in `KpiRow` | `value`, `label`, `accent`. The big serif result number with a mono label. |
| `Table` | `columns` (`key`, `label`, `num`), `rows` (`cells`, `hot`), `foot`, `empty`, `label` |
| `List` with `Row` | `title`, `meta`, `value`, `action`, `hot`, `onClick` |
| `Tag` `Chip` | Small mono uppercase labels. `Tag accent` for the one that matters. |
| `Title` `Body` `MonoLabel` | Serif heading (`as="h2"`), body text, mono label |
| `EmptyState` | `mono`, `title`, `detail`, `actionLabel`, `onAction`. `actionLabel` names the next action. A new app must pass it. |
| `ErrorState` | `title`, `detail`. Show it when an action fails. For one bad field use the field's `error` prop. |
| `Board` | `cols`, `rows`, `cell` (cell size in px, default 28), `label`. A game or puzzle board. Children: one element per cell, row by row (`<div>` or `<button>`), with your own `data-` attributes; set only `style={{ background }}` on a cell. The kit draws the frame, grid lines and size. Never size the board or its cells yourself. |
| `Keys` | `items={[['←', 'Move left'], ['Space', 'Drop']]}`. Keyboard hints; put it in the `Rail`. |

## Tokens

Use these when you must style your own element (a canvas, a board, a chart). Nothing else.

- Color: `var(--ink)`, `var(--ink-80)`, `var(--ink-60)`, `var(--ink-40)`, `var(--paper)`, `var(--paper-deep)`, `var(--ui-card)`, `var(--ui-bg)`, `var(--ui-line)`, `var(--ui-line2)`, `var(--hair-strong)`, `var(--accent)`, `var(--accent-soft)`, `var(--danger)`, `var(--on-accent)`, `var(--dim-veil)` (the scrim behind a dialog).
- Seven data hues: `var(--geo-verm)`, `var(--geo-cobalt)`, `var(--geo-comm)`, `var(--geo-gold)`, `var(--geo-green)`, `var(--geo-legal)`, `var(--geo-teal)`.
- Type: `var(--serif)` for titles and big numbers, `var(--sans)` for text and controls, `var(--mono)` for labels, counts and amounts. Size `calc(13px * var(--tf))`.
- Space: `calc(8px * var(--sf))`, in steps of 4, 8, 12, 16, 24.
- Border `1px solid var(--ui-line2)`. Radius 2px at most (`calc(2px * var(--sf))`). No blurred shadow, no gradient.

Colors that are data (paint swatches, chart series, game pieces) go in `src/colors.ts`. It is the only file where a color literal is allowed.

## Example

```tsx
import { useState } from 'react'
import { Actions, AppShell, Card, EmptyState, FormGrid, Kpi, KpiRow, PrimaryButton, TextInput } from '@lacuna/ui'

export function App() {
  const [bill, setBill] = useState('')
  const [tip, setTip] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function calculate() {
    const amount = Number(bill)
    if (!bill || Number.isNaN(amount) || amount <= 0) return setError('Enter an amount above 0')
    setError(null)
    setTip(amount * 0.2)
  }

  return (
    <AppShell name="Tip Calculator" icon="finance" hue="green" category="Finance" meta="20% tip">
      <Card mono="Input" title="Bill">
        <FormGrid>
          <TextInput label="Bill amount" value={bill} onChange={setBill} inputMode="decimal" error={error} />
        </FormGrid>
        <Actions><PrimaryButton onClick={calculate}>Calculate</PrimaryButton></Actions>
      </Card>
      <Card mono="Result" title="Tip">
        {tip === null
          ? <EmptyState mono="Empty" title="No result yet" detail="Enter a bill and press Calculate." actionLabel="Press Calculate" onAction={calculate} />
          : <KpiRow><Kpi value={`$${tip.toFixed(2)}`} label="Tip" accent /></KpiRow>}
      </Card>
    </AppShell>
  )
}
```
