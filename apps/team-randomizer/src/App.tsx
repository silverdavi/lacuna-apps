import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Tag,
  Title,
} from '@lacuna/ui'
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
const MAX_NAMES = 60

function deterministicSeed(names: string[], teamCount: number): number {
  const basis = `${names.join('\u0000')}\u0001${teamCount}`
  let hash = 0x811c9dc5
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

function parseTeamCount(raw: string): number | null {
  const text = raw.trim()
  if (text === '') return null
  const parsed = Number.parseInt(text, 10)
  if (Number.isNaN(parsed)) return null
  if (parsed < MIN_TEAMS || parsed > MAX_TEAMS) return null
  return parsed
}

export function App() {
  const { value, set } = useLocalRecord<RecordShape>({
    key: 'lacuna.team-randomizer:v1',
    version: 1,
    defaultValue: DEFAULT,
  })

  const [nameInput, setNameInput] = useState('')
  const [teamCountText, setTeamCountText] = useState(String(value.teamCount))
  const [generateError, setGenerateError] = useState<string | null>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const names = value.names
  const teamCount = value.teamCount
  const seed = value.seed

  const teamCountIssue =
    parseTeamCount(teamCountText) === null ? `Enter ${MIN_TEAMS} to ${MAX_TEAMS} teams.` : null

  const addName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = nameInput.trim()
    if (name === '') return
    if (names.includes(name)) {
      setGenerateError(`“${name}” is already on the list.`)
      setNameInput('')
      return
    }
    set({ ...value, names: [...names, name] })
    setNameInput('')
    setGenerateError(null)
  }

  const removeName = (name: string) => {
    set({ ...value, names: names.filter((existing) => existing !== name) })
  }

  const generate = () => {
    if (names.length === 0) {
      setGenerateError('Add at least one name first.')
      return
    }
    const nextTeamCount = parseTeamCount(teamCountText)
    if (nextTeamCount === null) {
      setGenerateError(`Enter ${MIN_TEAMS} to ${MAX_TEAMS} teams.`)
      return
    }
    set({ ...value, teamCount: nextTeamCount, seed: deterministicSeed(names, nextTeamCount) })
    setGenerateError(null)
  }

  const clearAll = () => {
    set({ names: [], teamCount: value.teamCount, seed: null })
    setGenerateError(null)
  }

  const teams: string[][] =
    names.length > 0 && seed !== null
      ? (() => {
          const shuffled = shuffle(mulberry32(seed), names)
          const sizes = Array.from({ length: teamCount }, () => Math.floor(names.length / teamCount))
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
      meta={`${names.length} names`}
      status={statusText}
      side={
        <Rail
          title="How it works"
          note={`Teams of ${MIN_TEAMS} to ${MAX_TEAMS}`}
          chips={[
            `${names.length}/${MAX_NAMES} names`,
            `${teams.length} teams out`,
          ]}
        >
          <p style={{ fontSize: 'calc(13px * var(--tf))', lineHeight: 1.5, margin: 0 }}>
            Add names, pick a team count, and generate. The same names and count always give the
            same split, so you can regenerate without losing your arrangement.
          </p>
        </Rail>
      }
      actions={
        teams.length > 0 ? (
          <Button kind="secondary" onClick={() => void copy(teamsText)}>
            Copy result
          </Button>
        ) : undefined
      }
    >
      <Card title="Names" mono={`${names.length} of ${MAX_NAMES} names`} flush>
        {names.length === MAX_NAMES ? (
          <ErrorState title="Name list is full" detail={`The list holds ${MAX_NAMES} names.`} />
        ) : (
          <form onSubmit={addName}>
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  className="lc-input"
                  aria-label="Name"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Add a name and press Enter"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <Button kind="secondary" type="submit">
                Add
              </Button>
            </div>
          </form>
        )}
        {names.length === 0 ? (
          <EmptyState
            title="No names yet"
            detail="Add the people you want to split into teams, one at a time."
            actionLabel="Type a name above and press Enter"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(6px * var(--sf))',
              marginTop: 'calc(12px * var(--sf))',
            }}
          >
            {names.map((name, index) => (
              <Tag key={name}>
                {name}
                {index === 0 && (
                  <button
                    type="button"
                    aria-label="x"
                    onClick={() => removeName(name)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '0 calc(2px * var(--sf))',
                      minWidth: 0,
                      cursor: 'pointer',
                      fontSize: 'inherit',
                      lineHeight: 1,
                      color: 'inherit',
                    }}
                  >
                    x
                  </button>
                )}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Teams"
        mono={teams.length > 0 ? `${teams.length} teams out` : `${teamCount} teams ready`}
        accent={teams.length > 0}
      >
        <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label
              style={{
                display: 'block',
                fontSize: 'calc(11px * var(--tf))',
                fontFamily: 'var(--mono)',
                letterSpacing: 'calc(0.5px * var(--sf))',
                color: 'var(--ink-60)',
                textTransform: 'uppercase',
                marginBottom: 'calc(4px * var(--sf))',
              }}
            >
              Number of teams
            </label>
            <input
              className="lc-input"
              aria-label="Number of teams"
              type="number"
              inputMode="numeric"
              min={MIN_TEAMS}
              max={MAX_TEAMS}
              value={teamCountText}
              onChange={(event) => setTeamCountText(event.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
              aria-invalid={teamCountIssue ? true : undefined}
            />
          </div>
          <PrimaryButton disabled={names.length === 0} onClick={generate}>
            Generate teams
          </PrimaryButton>
        </div>
        {teamCountIssue ? (
          <div
            role="alert"
            style={{
              marginTop: 'calc(8px * var(--sf))',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(11px * var(--tf))',
              color: 'var(--danger)',
            }}
          >
            {teamCountIssue}
          </div>
        ) : null}
        {generateError ? (
          <ErrorState title="Cannot generate yet" detail={generateError} />
        ) : null}
      </Card>

      {teams.length > 0 ? (
        <>
          <KpiRow>
            <Kpi value={names.length} label="Names" />
            <Kpi value={teams.length} label="Teams" />
            <Kpi value={Math.max(...teams.map((t) => t.length))} label="Largest team" accent />
            <Kpi value={Math.min(...teams.map((t) => t.length))} label="Smallest team" />
          </KpiRow>
          {teams.map((team, i) => (
            <Card key={i}>
              <Title as="h2" size="md">
                Team {i + 1}
              </Title>
              <p
                style={{
                  marginTop: 'calc(8px * var(--sf))',
                  marginBottom: 0,
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(12px * var(--tf))',
                  lineHeight: 1.7,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-line',
                }}
              >
                {team.join('\n')}
              </p>
            </Card>
          ))}
        </>
      ) : null}

      {names.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button kind="danger" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      ) : null}
    </AppShell>
  )
}
