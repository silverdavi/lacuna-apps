import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { FREE, cardText, generateCard } from './engine'
import { host } from './host'
import type { SavedCard } from './host'
import './styles.css'

const GRID_SIZES = [
  { value: '3', label: '3x3' },
  { value: '5', label: '5x5' },
  { value: '7', label: '7x7' },
]

function parseSize(raw: string): number {
  const parsed = parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return 5
  return Math.min(7, Math.max(3, parsed))
}

export function App() {
  const [seed, setSeed] = useState('100')
  const [minInput, setMinInput] = useState('1')
  const [maxInput, setMaxInput] = useState('75')
  const [sizeInput, setSizeInput] = useState('5')
  const [card, setCard] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedCard[]>(() => host.listCards())
  const [toast, setToast] = useState<string | null>(null)

  const size = parseSize(sizeInput)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(id)
  }, [toast])

  function generate() {
    const min = parseInt(minInput, 10)
    const max = parseInt(maxInput, 10)
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      setCard(null)
      setError('Max must be at least as big as Min')
      return
    }
    try {
      setCard(generateCard(seed, min, max, size))
      setError(null)
    } catch (e) {
      setCard(null)
      setError(e instanceof Error ? e.message : 'Could not generate the card')
    }
  }

  function saveCard() {
    if (!card) return
    const record = host.addCard({ name: `Card ${saved.length + 1}`, card, size })
    setSaved((items) => [...items, record])
  }

  function download(name: string) {
    const item = saved.find((s) => s.name === name)
    if (!item) return
    const blob = new Blob([`${item.name}\n${cardText(item.card, item.size)}\n`], {
      type: 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name.replace(/\s+/g, '-')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  function remove(id: string) {
    host.removeCard(id)
    setSaved((items) => items.filter((s) => s.id !== id))
  }

  async function copyNumbers() {
    if (!card) return
    const text = card.join(' ')
    try {
      await navigator.clipboard.writeText(text)
      setToast('Numbers copied to clipboard')
    } catch {
      setToast('Could not copy the numbers')
    }
  }

  function printCard() {
    window.print()
  }

  return (
    <AppShell
      name="Bingo Card Generator"
      icon="grid"
      hue="gold"
      category="Games"
      status={toast ?? undefined}
    >
      <Stack>
        <Card mono="Setup" title="Card settings">
          <FormGrid>
            <TextInput label="Seed" value={seed} onChange={setSeed} />
            <TextInput label="Min" type="number" value={minInput} onChange={setMinInput} />
            <TextInput label="Max" type="number" value={maxInput} onChange={setMaxInput} />
            <Select label="Grid size" value={sizeInput} onChange={setSizeInput} options={GRID_SIZES} />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={generate}>Generate card</PrimaryButton>
          </Actions>
        </Card>

        <Card
          mono={card === null ? 'Preview' : `Seed ${seed} · ${size}×${size}`}
          title="Card"
          actions={
            <Actions>
              <Button kind="secondary" disabled={card === null} onClick={saveCard}>
                Save card
              </Button>
              <Button kind="secondary" disabled={card === null} onClick={copyNumbers}>
                Copy numbers
              </Button>
              <Button kind="secondary" disabled={card === null} onClick={printCard}>
                Print
              </Button>
            </Actions>
          }
        >
          {error !== null ? (
            <EmptyState
              mono="Error"
              title="Cannot build the card"
              detail={error}
              actionLabel="Fix the range, then generate"
              onAction={generate}
            />
          ) : card === null ? (
            <EmptyState
              mono="Empty"
              title="No card generated"
              detail="Set the range and grid size above."
              actionLabel="Then generate a card"
              onAction={generate}
            />
          ) : (
            <div className="bc-board">
              <table className="lc-table bc-table">
                <tbody>
                  {Array.from({ length: size }, (_, row) => (
                    <tr key={row}>
                      {Array.from({ length: size }, (_, col) => {
                        const value = card[row * size + col]
                        const isFree = value === FREE
                        return (
                          <td key={col} className={isFree ? 'bc-free' : undefined}>
                            <Tag accent={isFree}>{value}</Tag>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card mono={`${saved.length} saved`} title="Saved cards">
          {saved.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No cards saved"
              detail="Generate a card, then save it to keep it here."
              actionLabel="Save a card"
            />
          ) : (
            <List label="Saved cards">
              {saved.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  meta={`${item.size}×${item.size}`}
                  action={
                    <Actions>
                      <Button kind="secondary" onClick={() => download(item.name)}>
                        Download {item.name}
                      </Button>
                      <Button kind="ghost" onClick={() => remove(item.id)}>
                        Delete {item.name}
                      </Button>
                    </Actions>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
