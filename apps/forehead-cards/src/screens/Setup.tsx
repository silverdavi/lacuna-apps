import { Actions, Body, Card, Checkbox, FormGrid, MonoLabel, PrimaryButton, Select, Stack, TextInput } from '@lacuna/ui'
import { CATEGORIES } from '../data/deck'
import type { Settings } from '../host'

const SECONDS = [30, 60, 90, 120] as const

export function Setup({ settings, patch, counts, pool, customCount, onStart }: {
  settings: Settings
  patch: (next: Partial<Settings>) => void
  counts: Record<string, number>
  pool: number
  customCount: number
  onStart: () => void
}) {
  const chosen = new Set(settings.categories)
  const toggle = (c: string) => patch({ categories: CATEGORIES.filter((x) => (x === c ? !chosen.has(c) : chosen.has(x))) })
  const reason = pool === 0 ? (customCount > 0 && !settings.includeCustom ? 'Pick a category or include your custom decks to start.' : 'Pick at least one category to start.') : ''

  return (
    <Stack lg>
      <Card mono="Cards" title="Categories" actions={
        <Actions>
          <button type="button" className="lc-btn ghost" onClick={() => patch({ categories: [...CATEGORIES] })}>All</button>
          <button type="button" className="lc-btn ghost" onClick={() => patch({ categories: [] })}>None</button>
        </Actions>
      }>
        <div className="lc-pills" role="group" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <button type="button" key={c} className={`lc-pill${chosen.has(c) ? ' active' : ''}`} aria-pressed={chosen.has(c)} onClick={() => toggle(c)}>
              {c} <span className="fc-count">{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
        <Checkbox label={customCount > 0 ? `Include custom decks (${customCount})` : 'Include custom decks (none yet)'} checked={settings.includeCustom} onChange={(v) => patch({ includeCustom: v })} />
      </Card>

      <Card mono="Round" title="Timer and controls">
        <div className="fc-field">
          <MonoLabel>Round length</MonoLabel>
          <div className="lc-pills" role="group" aria-label="Round length">
            {SECONDS.map((s) => (
              <button type="button" key={s} className={`lc-pill${settings.seconds === s ? ' active' : ''}`} aria-pressed={settings.seconds === s} onClick={() => patch({ seconds: s })}>{s} s</button>
            ))}
          </div>
        </div>
        <div className="fc-field">
          <MonoLabel>Controls</MonoLabel>
          <div className="lc-pills" role="group" aria-label="Controls">
            {(['tap', 'tilt'] as const).map((c) => (
              <button type="button" key={c} className={`lc-pill${settings.controls === c ? ' active' : ''}`} aria-pressed={settings.controls === c} onClick={() => patch({ controls: c })}>{c === 'tap' ? 'Tap' : 'Tilt'}</button>
            ))}
          </div>
          <Body sm>{settings.controls === 'tilt' ? 'Tilt face-down for Correct and face-up for Pass. If your phone cannot report its tilt, the game falls back to tap and says so.' : 'Tap the right half for Correct and the left half for Pass. Swiping down or up works too.'}</Body>
        </div>
        <Checkbox label="Play beeps" checked={settings.sound} onChange={(v) => patch({ sound: v })} />
      </Card>

      <Card mono="Teams" title="Take turns">
        <Checkbox label="Team mode" checked={settings.teamMode} onChange={(v) => patch({ teamMode: v })} />
        {settings.teamMode && (
          <FormGrid>
            <Select label="Number of teams" value={String(settings.teamCount)} onChange={(v) => patch({ teamCount: Number(v) })} options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))} />
            {settings.teamNames.slice(0, settings.teamCount).map((name, i) => (
              <TextInput key={i} label={`Team ${i + 1} name`} value={name} onChange={(v) => patch({ teamNames: settings.teamNames.map((n, j) => (j === i ? v : n)) })} />
            ))}
          </FormGrid>
        )}
      </Card>

      <div className="fc-start">
        <PrimaryButton onClick={onStart} disabled={pool === 0}>Start round</PrimaryButton>
        <span className="fc-reason" role={reason ? 'status' : undefined}>{reason || `${pool} cards in play`}</span>
      </div>
    </Stack>
  )
}
