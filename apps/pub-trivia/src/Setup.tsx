import { Actions, Body, Button, Card, EmptyState, FormGrid, MonoLabel, Pills, PrimaryButton, Stack, TextInput } from '@lacuna/ui'
import { TIER_NAMES, type Bank } from './deck'
import type { Settings } from './host'

const SIZE_LABEL: Record<number, string> = { 10: '10', 20: '20', 50: '50', 0: 'All' }
const SIZE_BY_LABEL: Record<string, number> = { '10': 10, '20': 20, '50': 50, All: 0 }

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={`lc-pill${on ? ' active' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

export function Setup({ bank, settings, teams, matches, onChange, onTeams, onStart }: {
  bank: Bank | null
  settings: Settings
  teams: string[]
  matches: number
  onChange: (patch: Partial<Settings>) => void
  onTeams: (teams: string[]) => void
  onStart: () => void
}) {
  if (!bank) {
    return (
      <Card mono="Loading" title="Getting the questions ready">
        <div className="pt-skel" role="status" aria-label="Loading questions">
          <div className="pt-skel-line wide" />
          <div className="pt-skel-line" />
          <div className="pt-skel-line short" />
        </div>
      </Card>
    )
  }
  const all = bank.categories.map((_, i) => i)
  const cats = settings.cats ?? all
  const toggleCat = (i: number) => onChange({ cats: cats.includes(i) ? cats.filter((c) => c !== i) : [...cats, i] })
  const toggleTier = (t: number) =>
    onChange({ tiers: settings.tiers.includes(t) ? settings.tiers.filter((x) => x !== t) : [...settings.tiers, t] })
  const quizmaster = settings.mode === 'quizmaster'

  return (
    <Stack>
      <Card
        mono={`${cats.length} of ${bank.categories.length} chosen`}
        title="Categories"
        actions={
          <Actions>
            <Button kind="ghost" onClick={() => onChange({ cats: null })}>All</Button>
            <Button kind="ghost" onClick={() => onChange({ cats: [] })}>None</Button>
          </Actions>
        }
      >
        <div className="lc-pills" role="group" aria-label="Categories">
          {bank.categories.map((name, i) => (
            <Toggle key={name} on={cats.includes(i)} onClick={() => toggleCat(i)}>{name}</Toggle>
          ))}
        </div>
      </Card>

      <Card mono="Deck" title="Difficulty, size and mode">
        <Stack>
          <div>
            <MonoLabel>Difficulty</MonoLabel>
            <div className="lc-pills" role="group" aria-label="Difficulty">
              {([1, 2, 3] as const).map((t) => (
                <Toggle key={t} on={settings.tiers.includes(t)} onClick={() => toggleTier(t)}>{TIER_NAMES[t]}</Toggle>
              ))}
            </div>
          </div>
          <div>
            <MonoLabel>Deck size</MonoLabel>
            <Pills items={['10', '20', '50', 'All']} active={SIZE_LABEL[settings.size]!} onSelect={(v) => onChange({ size: SIZE_BY_LABEL[v]! })} />
          </div>
          <div>
            <MonoLabel>Mode</MonoLabel>
            <Pills
              items={['Solo', 'Quizmaster']}
              active={quizmaster ? 'Quizmaster' : 'Solo'}
              onSelect={(v) => onChange({ mode: v === 'Solo' ? 'solo' : 'quizmaster' })}
            />
            <Body sm>{quizmaster ? 'You read the questions to the room. Optional team scores.' : 'You answer and score yourself.'}</Body>
          </div>
          {quizmaster ? (
            <div>
              <MonoLabel>Teams</MonoLabel>
              <Pills
                items={['Off', '2', '3', '4', '5', '6', '7', '8']}
                active={settings.teamCount === 0 ? 'Off' : String(settings.teamCount)}
                onSelect={(v) => onChange({ teamCount: v === 'Off' ? 0 : Number(v) })}
              />
              {settings.teamCount > 0 ? (
                <FormGrid>
                  {teams.slice(0, settings.teamCount).map((name, i) => (
                    <TextInput
                      key={i}
                      label={`Team ${i + 1} name`}
                      value={name}
                      onChange={(v) => onTeams(teams.map((t, j) => (j === i ? v.slice(0, 24) : t)))}
                    />
                  ))}
                </FormGrid>
              ) : null}
            </div>
          ) : null}
        </Stack>
      </Card>

      {matches === 0 ? (
        <EmptyState mono="No match" title="Choose at least one category and tier" detail="Nothing in the bank fits the current choices." />
      ) : (
        <div className="pt-start">
          <span className="lc-mono lc-mono-sm" aria-live="polite">
            {matches.toLocaleString()} {matches === 1 ? 'question matches' : 'questions match'}
          </span>
          <PrimaryButton onClick={onStart}>Start</PrimaryButton>
        </div>
      )}
    </Stack>
  )
}
