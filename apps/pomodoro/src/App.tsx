import { useEffect, useState } from 'react'
import { Body, Button, Card, Kpi, Stack, Title } from '@lacuna/ui'

const WORK = 25 * 60
const BREAK = 5 * 60

export function App() {
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [left, setLeft] = useState(WORK)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setLeft((current) => {
        if (current > 1) return current - 1
        setRunning(false)
        return 0
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const minutes = String(Math.floor(left / 60)).padStart(2, '0')
  const seconds = String(left % 60).padStart(2, '0')

  return (
    <main>
      <Card mono="Timer" title="Pomodoro">
        <Stack>
          <Title size="md">{mode === 'work' ? 'Work' : 'Break'}</Title>
          <Body>Twenty-five minutes, then five. The clock stays on this page.</Body>
          <Kpi value={`${minutes}:${seconds}`} label={mode === 'work' ? 'Work left' : 'Break left'} accent />
          <Button kind="primary" onClick={() => setRunning((value) => !value)}>
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button
            onClick={() => {
              const next = mode === 'work' ? 'break' : 'work'
              setMode(next)
              setRunning(false)
              setLeft(next === 'work' ? WORK : BREAK)
            }}
          >
            Switch
          </Button>
        </Stack>
      </Card>
    </main>
  )
}
