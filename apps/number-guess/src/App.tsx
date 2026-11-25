// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Body, Card, EmptyState, FormGrid, KpiRow, Kpi, MonoLabel, PrimaryButton, Stack, Table, TextInput } from '@lacuna/ui'
import { gameStore, hintFor, MAX_GUESS, MIN_GUESS, newGame } from './host'
import type { GameSession } from './host'

export function App() {
  const [seed, setSeed] = useState('')
  const [guess, setGuess] = useState('')
  const [session, setSession] = useState<GameSession | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    const saved = gameStore.get()
    if (saved) {
      setSession(saved)
      setSeed(saved.seed)
    }
  }, [])

  useEffect(() => {
    gameStore.set(session)
  }, [session])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  function notify(message: string, sticky = false) {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    if (!sticky) toastTimer.current = window.setTimeout(() => setToast(''), 4000)
  }

  function startGame() {
    setSession(newGame(seed))
    setGuess('')
    notify('New game started')
  }

  function submit() {
    if (!session || session.won) return
    const text = guess.trim()
    const value = Number(text)
    if (text === '' || !Number.isInteger(value) || value < MIN_GUESS || value > MAX_GUESS) {
      notify(`Enter a valid number between ${MIN_GUESS} and ${MAX_GUESS}`)
      return
    }
    const hint = hintFor(value, session.target)
    const won = hint === 'Correct'
    const guesses = [...session.guesses, { id: `g${session.guesses.length + 1}`, value, hint }]
    const bestScore = won && (session.bestScore === null || session.guesses.length + 1 < session.bestScore) ? session.guesses.length + 1 : session.bestScore
    setSession({ ...session, guesses, bestScore, won })
    setGuess('')
    notify(won ? `Correct! You won in ${session.guesses.length + 1} attempts.` : hint, won)
  }

  const attempt = session ? session.guesses.length : 0
  const last = session ? session.guesses[session.guesses.length - 1] : undefined
  const rows = (session?.guesses ?? []).map((g) => ({ cells: { guess: String(g.value), result: g.hint }, hot: g.id === `g${(session?.guesses ?? []).length}` }))
  // The footer status line only carries messages that are not echoed in the history table,
  // so a guess's hint stays readable in exactly one place.
  const statusText =
    toast && toast !== 'Too low' && toast !== 'Too high'
      ? toast
      : last
        ? last.hint === 'Correct'
          ? `Correct! You won in ${session!.guesses.length} attempts.`
          : undefined
        : undefined

  return (
    <AppShell
      name="Number Guess Game"
      icon="grid"
      hue="brown"
      category="Games"
      meta={session ? `${attempt} ${attempt === 1 ? 'attempt' : 'attempts'}` : 'No game yet'}
      status={statusText}
    >
      <Stack lg>
        <Card mono="Setup" title="New game">
          <FormGrid>
            <TextInput label="Seed" value={seed} onChange={setSeed} placeholder="42" />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={startGame}>New Game</PrimaryButton>
          </Actions>
        </Card>

        {session && (
          <Card mono={`${session.guesses.length} ${session.guesses.length === 1 ? 'guess' : 'guesses'}`} title="Guess">
            {session.won ? (
              <EmptyState
                mono="Won"
                title={`You won in ${session.guesses.length} attempts`}
                detail="The hidden number was what you just guessed. Start a new game to play again."
                actionLabel="Start over"
                onAction={startGame}
              />
            ) : (
              <>
                <Body>Guess the number between 1 and 100</Body>
                <FormGrid>
                  <TextInput label="Guess" value={guess} onChange={setGuess} inputMode="numeric" type="text" placeholder="1 to 100" />
                </FormGrid>
                <Actions>
                  <PrimaryButton onClick={submit}>Submit</PrimaryButton>
                </Actions>
              </>
            )}
          </Card>
        )}

        <Card mono="Score" title="Best score">
          {session && session.bestScore !== null ? (
            <KpiRow>
              <Kpi value={`Best Score: ${session.bestScore}`} label="Fewest attempts" />
            </KpiRow>
          ) : (
            <MonoLabel faint>No win yet</MonoLabel>
          )}
        </Card>

        <Card mono="History" title="Guesses">
          {rows.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No guesses yet"
              detail={session ? 'Submit a guess and each attempt lands in this table.' : 'Start a game and your attempts land in this table.'}
              actionLabel="Start a new game above"
            />
          ) : (
            <Table
              label="History"
              columns={[
                { key: 'guess', label: 'Guess', num: true },
                { key: 'result', label: 'Result' },
              ]}
              rows={rows}
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
