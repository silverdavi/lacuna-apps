import { useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Stack, TextInput, Title } from '@lacuna/ui'
import { mulberry32, shuffle } from '@lacuna/random'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

interface RecordShape {
  names: string[]
  teamCount: number
  seed: number | null
}

const DEFAULT: RecordShape = { names: [], teamCount: 3, seed: null }
const MIN_TEAMS = 2
const MAX_TEAMS = 10

function deterministicSeed(names: string[], teamCount: number): number {
  const basis = `${names.join('\u0000')}\u0001${teamCount}`
  let hash = 0x811c9dc5
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

function clampCount(raw: string): number {
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < MIN_TEAMS) return MIN_TEAMS
  if (parsed > MAX_TEAMS) return MAX_TEAMS
  return parsed
}

const chipStyle = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(10px * var(--tf))',
  letterSpacing: 'calc(0.5px * var(--sf))',
  color: 'var(--ink-80)',
  background: 'var(--paper-deep)',
  padding: 'calc(5px * var(--sf)) calc(9px * var(--sf))',
  whiteSpace: 'nowrap',
  display: 'inline-block',
}

const xButtonStyle = {
  border: 'none',
  background: 'none',
  padding: '0 calc(2px * var(--sf))',
  minWidth: 0,
  cursor: 'pointer',
  fontSize: 'inherit',
  lineHeight: 1,
  color: 'var(--ink-80)',
}

export function App() {
  const { value, set } = useLocalRecord<RecordShape>({
    key: 'lacuna.team-randomizer:v1',
    version: 1,
    defaultValue: DEFAULT,
  })

  const [nameInput, setNameInput] = useState('')
  const [teamCountText, setTeamCountText] = useState(String(value.teamCount))

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const names = value.names
  const teamCount = value.teamCount
  const seed = value.seed

  const addName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = nameInput.trim()
    if (name === '') return
    if (names.includes(name)) {
      setNameInput('')
      return
    }
    set({ ...value, names: [...names, name] })
    setNameInput('')
  }

  const removeName = (name: string) => {
    set({ ...value, names: names.filter((existing) => existing !== name) })
  }

  const generate = () => {
    const nextTeamCount = clampCount(teamCountText)
    set({ ...value, teamCount: nextTeamCount, seed: deterministicSeed(names, nextTeamCount) })
  }

  const teams =
    names.length > 0 && seed !== null
      ? (() => {
          const shuffled = shuffle(mulberry32(seed), names)
          const sizes = Array.from({ length: teamCount }, () =>
            Math.floor(names.length / teamCount),
          )
          for (let i = 0; i < names.length % teamCount; i += 1) sizes[i] += 1
          const result: string[][] = []
          let cursor = 0
          for (const size of sizes) {
            result.push(shuffled.slice(cursor, cursor + size))
            cursor += size
          }
          return result
        })()
      : []

  const teamsText = teams.map((team, i) => `Team ${i + 1}: ${team.join(', ')}`).join('\n')

  const statusText =
    copied === true
      ? 'Copied to clipboard'
      : names.length > 0
        ? `${names.length} names · ${teamCount} teams`
        : `${teamCount} teams ready`

  return (
    <AppShell
      name="Random Team Generator"
      icon="grid"
      hue="rust"
      category="Apps"
      status={statusText}
      actions={
        teams.length > 0 ? (
          <Button kind="secondary" onClick={() => void copy(teamsText)}>
            Copy result
          </Button>
        ) : undefined
      }
    >
      <Stack>
        <Card title="Names" mono={names.length > 0 ? `${names.length} names` : undefined}>
          <form onSubmit={addName}>
            <TextInput
              label="Name"
              value={nameInput}
              onChange={setNameInput}
              type="text"
              placeholder="Add a name and press Enter"
            />
          </form>
          {names.length === 0 ? (
            <EmptyState
              title="No names yet"
              detail="Add names one at a time; each becomes a tag below."
              actionLabel="Add your first name in the field above"
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--sf))', alignItems: 'center', margin: 'calc(12px * var(--sf)) 0 0' }}>
              {names.map((name, index) => (
                <span key={name} style={{ ...chipStyle, display: 'inline-flex', alignItems: 'center', gap: 'calc(4px * var(--sf))' }}>
                  {name}
                  {index === 0 && (
                    <button type="button" aria-label="x" onClick={() => removeName(name)} style={xButtonStyle}>
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card title="Teams" mono={teams.length > 0 ? `${teams.length} teams` : undefined}>
          <FormGrid>
            <TextInput
              label="Number of teams"
              value={teamCountText}
              onChange={setTeamCountText}
              type="number"
              inputMode="numeric"
            />
          </FormGrid>
          <div className="lk-actions" style={{ marginTop: 12 }}>
            <Button kind="primary" disabled={names.length === 0} onClick={generate}>
              Generate teams
            </Button>
          </div>
        </Card>

        {teams.length > 0 &&
          teams.map((team, i) => (
            <Card key={i}>
              <Title as="h2" size="md">
                Team {i + 1}
              </Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--sf))', marginTop: 'calc(8px * var(--sf))' }}>
                {team.map((name) => (
                  <span key={name} style={chipStyle}>
                    {name}
                  </span>
                ))}
              </div>
            </Card>
          ))}
      </Stack>
    </AppShell>
  )
}
