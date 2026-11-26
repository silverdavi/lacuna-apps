// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Kpi, KpiRow, List, Rail, Row, Table } from '@lacuna/ui'

function KeyButton({ note, hint, onClick }: { note: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="lc-btn secondary vk-key" onClick={onClick}>
      <span>{note}</span>
      <span className="vk-key-hint" aria-hidden>{hint}</span>
    </button>
  )
}

function TabBar({ items, active, onSelect }: { items: string[]; active: string; onSelect: (value: string) => void }) {
  return (
    <div className="lc-tabs vk-tabs" role="tablist" aria-label="View">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          role="tab"
          aria-selected={item === active}
          className={item === active ? 'lc-tab active' : 'lc-tab'}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
import { notesStore, settingsStore } from './host/mock'
import { setKeyHandler } from './keys'

const KEYS = [
  { note: 'C4', key: 'c' },
  { note: 'D4', key: 'd' },
  { note: 'E4', key: 'e' },
  { note: 'F4', key: 'f' },
  { note: 'G4', key: 'g' },
  { note: 'A4', key: 'a' },
  { note: 'B4', key: 'b' },
]

function stamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getHours()}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function App() {
  const [notes, setNotes] = useState(() => notesStore.list())
  const [settings, setSettings] = useState(() => settingsStore.get())
  const [tab, setTab] = useState('Play')

  const play = useCallback((note: string) => {
    notesStore.add({ note, time: stamp() })
    setNotes(notesStore.list())
  }, [])

  useEffect(() => {
    document.title = 'Virtual Piano'
  }, [])

  setKeyHandler(play)

  function clearNotes() {
    notesStore.clear()
    setNotes([])
  }

  function toggleMetronome() {
    const next = { ...settings, metronome: !settings.metronome }
    settingsStore.set(next)
    setSettings(next)
  }

  function stepBpm(delta: number) {
    const next = { ...settings, bpm: Math.min(400, Math.max(20, settings.bpm + delta)) }
    settingsStore.set(next)
    setSettings(next)
  }

  const count = notes.length

  return (
    <AppShell
      name="Virtual Piano"
      icon="grid"
      hue="gold"
      category="Personal"
      status={`${count} notes · saved on this device`}
      side={
        <Rail title="Virtual Piano" note="On-screen keyboard" chips={settings.metronome ? ['Metronome on', `BPM ${settings.bpm}`, `${count} notes`, 'Keyboard'] : ['Metronome off', `${count} notes`, 'Keyboard']}>
          <KpiRow>
            <Kpi value={settings.metronome ? 'On' : 'Off'} label="Metronome" />
            <Kpi value={settings.metronome ? settings.bpm : '—'} label="BPM" />
          </KpiRow>
        </Rail>
      }
    >
      <Card mono="View" title="Virtual Piano">
        <TabBar items={['Play', 'History']} active={tab} onSelect={setTab} />
      </Card>
      {tab === 'Play' ? (
        <Card mono={`${count} recorded`} title="Play" actions={<Button kind="secondary" onClick={clearNotes}>Clear notes</Button>}>
          <div className="vk-keys" role="group" aria-label="Piano keys">
            {KEYS.map((k) => (
              <KeyButton key={k.note} note={k.note} hint={k.key.toUpperCase()} onClick={() => play(k.note)} />
            ))}
          </div>
          <p className="vk-summary">{'Notes: ' + count}</p>
          {count === 0 ? (
            <EmptyState
              mono="Empty"
              title="No notes recorded yet"
              detail="Press a key above, or type the letter on your keyboard."
              actionLabel="Play a note"
              onAction={() => play('C4')}
            />
          ) : (
            <List label="Recorded notes">
              {notes.map((n) => (
                <Row key={n.id} title={n.note} meta={n.time} />
              ))}
            </List>
          )}
        </Card>
      ) : (
        <Card mono={`${count} notes`} title="History">
          <Table
            label="History of played notes"
            columns={[
              { key: 'time', label: 'Time' },
              { key: 'note', label: 'Note' },
            ]}
            rows={[...notes].reverse().map((n) => ({ cells: { time: n.time, note: n.note } }))}
            empty={count === 0 ? 'No notes recorded yet' : null}
          />
        </Card>
      )}
      <Card mono="Tempo" title="Metronome">
        <div className="vk-metronome">
          <Button kind={settings.metronome ? 'primary' : 'secondary'} ariaLabel="Metronome" onClick={toggleMetronome}>
            {settings.metronome ? 'Metronome: On' : 'Metronome'}
          </Button>
          {settings.metronome && (
            <div className="vk-tempo">
              <Button kind="secondary" ariaLabel="BPM −" onClick={() => stepBpm(-4)}>
                BPM −
              </Button>
              <span className="vk-bpm">BPM: {settings.bpm}</span>
              <Button kind="secondary" ariaLabel="BPM +" onClick={() => stepBpm(4)}>
                BPM +
              </Button>
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  )
}
