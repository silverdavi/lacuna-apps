import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Rail,
  Row,
  SectionLabel,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { addHistory, listHistory, removeHistory, type HistoryEntry } from './host'
import { vigenere } from './cipher'

type Mode = 'Encode' | 'Decode'

export function App() {
  const [message, setMessage] = useState('')
  const [key, setKey] = useState('')
  const [mode, setMode] = useState<Mode>('Encode')
  const [tab, setTab] = useState<'Work' | 'History'>('Work')
  const [history, setHistory] = useState<HistoryEntry[]>(listHistory)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const ready = message.trim() !== '' && key.trim() !== ''
  const result = ready ? vigenere(message, key, mode === 'Decode') : ''

  const onCopy = () => {
    if (result) void copy(result)
  }

  const onAdd = () => {
    if (!result) return
    setHistory(addHistory({ mode, message, key, result }))
  }

  const onDelete = (id: string) => {
    setHistory(removeHistory(id))
  }

  const status = copied ? 'Copied to clipboard' : ready ? `Result ${result}` : 'Local · nothing leaves the browser'

  return (
    <AppShell
      name="Vigenere Cipher"
      icon="security"
      hue="teal"
      category="Productivity"
      meta={ready ? `Key ${key}` : 'Ready'}
      status={status}
      side={
        <Rail
          title="Vigenere Cipher"
          note="One page · local"
          chips={['Shift letters', 'Repeat key', 'Keep spaces', 'History']}
        >
          <Body sm>
            Each letter of the message is shifted by the key letter, repeating the key. Decode undoes
            the shift. Case is preserved and spaces stay in place. The history is stored on this device
            only.
          </Body>
        </Rail>
      }
    >
      <Card mono="01 · Inputs" title="Message and key">
        <FormGrid>
          <TextInput label="Message" value={message} onChange={setMessage} placeholder="HELLO WORLD" rows={3} />
          <TextInput label="Key" value={key} onChange={setKey} placeholder="KEY" />
        </FormGrid>
        <SectionLabel>Direction</SectionLabel>
        <Stack>
          <label className="lk-check">
            <input type="radio" name="mode" checked={mode === 'Encode'} onChange={() => setMode('Encode')} />
            <span>Encode</span>
          </label>
          <label className="lk-check">
            <input type="radio" name="mode" checked={mode === 'Decode'} onChange={() => setMode('Decode')} />
            <span>Decode</span>
          </label>
        </Stack>
      </Card>

      <Card mono="02 · Result" title={mode === 'Encode' ? 'Encoded text' : 'Decoded text'}>
        <Stack>
          <label className="lc-field">
            <span className="lc-field-label">Result</span>
            <input
              className={`lc-input${result ? ' filled' : ''}`}
              type="text"
              value={result}
              readOnly
              aria-readonly="true"
            />
          </label>
          {result ? (
            <Actions>
              <Button kind="secondary" onClick={onCopy}>{copied ? 'Copied' : 'Copy'}</Button>
              <Button kind="ghost" onClick={onAdd}>Add to history</Button>
            </Actions>
          ) : (
            <EmptyState
              mono="Empty"
              title="Nothing to show yet"
              detail="Type a message and a key, pick a direction, and the result appears here."
            />
          )}
        </Stack>
      </Card>

      <div role="tablist" aria-label="Sections">
        {(['Work', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? 'calc(2px * var(--sf)) solid var(--accent)' : 'calc(2px * var(--sf)) solid transparent',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              color: tab === t ? 'var(--ink)' : 'var(--ink-60)',
              cursor: 'pointer',
              padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <Card mono={`${history.length} kept`} title="History">
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No ciphers yet"
            detail="Add a result to keep it here. It survives reload."
          />
        ) : (
          <List label="Previous conversions">
            {history.map((h) => (
              <Row
                key={h.id}
                title={`${h.message} → ${h.result}`}
                meta={`${h.key} · ${h.mode}`}
                action={<Button kind="ghost" onClick={() => onDelete(h.id)}>Delete</Button>}
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
