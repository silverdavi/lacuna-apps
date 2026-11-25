import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Keys,
  List,
  Rail,
  PrimaryButton,
  Row,
  SectionLabel,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { FREE, cardText, generateCard } from './engine'
import { host, type SavedCard } from './host'

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
  const [importMsg, setImportMsg] = useState<string | null>(null)

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
    host.addCard({ name: `Card ${saved.length + 1}`, card, size })
    setSaved(host.listCards())
    setToast('Card saved')
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
    setSaved(host.listCards())
  }

  async function copyNumbers() {
    if (!card) return
    const text = card.filter((c) => c !== FREE).join(' ')
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

  function exportJson() {
    void navigator.clipboard
      .writeText(JSON.stringify(saved, null, 2))
      .then(() => setToast('Cards exported to clipboard'))
      .catch(() => setToast('Export failed'))
  }

  function onImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result))
        if (!Array.isArray(raw)) throw new Error()
        const imported = raw.filter(
          (i: unknown) =>
            i &&
            typeof (i as SavedCard).name === 'string' &&
            Array.isArray((i as SavedCard).card) &&
            typeof (i as SavedCard).size === 'number',
        )
        host.replaceAll(
          [
            ...host.listCards(),
            ...imported.map((i: SavedCard) => ({
              id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: i.name,
              card: i.card,
              size: i.size,
            })),
          ],
        )
        setSaved(host.listCards())
        setImportMsg(`Imported ${imported.length} card(s)`)
      } catch {
        setImportMsg('Import failed: not a valid cards file')
      }
    }
    reader.readAsText(file)
  }

  const status = card
    ? `Seed ${seed} · ${size}×${size} · ${card.filter((c) => c !== FREE).length} numbers`
    : `${saved.length} saved card${saved.length === 1 ? '' : 's'}`

  return (
    <AppShell
      name="Bingo Card Generator"
      icon="grid"
      hue="gold"
      category="Games"
      meta={`${saved.length} saved`}
      status={status}
      side={
        <Rail
          title="Shortcuts"
          note={`${saved.length} card${saved.length === 1 ? '' : 's'} on file`}
          chips={card ? [`${size}×${size}`, `${card.filter((c) => c !== FREE).length} numbers`] : ['5×5', '7×7']}
        >
          <SectionLabel>Keyboard</SectionLabel>
          <Keys
            items={[
              ['Enter', 'Generate card'],
              ['S', 'Save card'],
              ['P', 'Print'],
              ['C', 'Copy numbers'],
            ]}
          />
          <SectionLabel>Export</SectionLabel>
          <Stack>
            <Button kind="secondary" onClick={exportJson} disabled={!saved.length}>
              Export JSON
            </Button>
            <Button
              kind="secondary"
              title="Import cards from JSON file"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'application/json'
                input.onchange = () => {
                  const f = input.files?.[0]
                  if (f) onImportFile(f)
                }
                input.click()
              }}
            >
              Import JSON
            </Button>
          </Stack>
        </Rail>
      }
    >
      <Stack>
        <Card mono="Setup" title="Card settings">
          <FormGrid>
            <TextInput label="Seed" value={seed} onChange={setSeed} />
            <TextInput label="Min" type="number" value={minInput} onChange={setMinInput} />
            <TextInput label="Max" type="number" value={maxInput} onChange={setMaxInput} />
            <Select
              label="Grid size"
              value={sizeInput}
              onChange={setSizeInput}
              options={GRID_SIZES}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={generate}>Generate card</PrimaryButton>
          </Actions>
        </Card>

        {error !== null && (
          <ErrorState title="Invalid input" detail={error} mono="Check" />
        )}

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
          {card === null ? (
            <EmptyState
              mono="Empty"
              title="No card generated"
              detail="Set the range and grid size above."
              actionLabel="Then generate a card"
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

        <Card
          mono={`${saved.length} saved`}
          title="Saved cards"
          actions={
            <Actions>
              <Button kind="secondary" onClick={exportJson} disabled={!saved.length}>
                Export JSON
              </Button>
            </Actions>
          }
        >
          {importMsg && (
            <div className="bc-import-note" role="status">
              {importMsg}
            </div>
          )}
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
                      <Button
                        kind="secondary"
                        ariaLabel={`Download ${item.name}`}
                        onClick={() => download(item.name)}
                      >
                        Download {item.name}
                      </Button>
                      <Button
                        kind="danger"
                        ariaLabel={`Delete ${item.name}`}
                        onClick={() => remove(item.id)}
                      >
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

      {toast && (
        <div className="bc-toast" role="status">
          {toast}
        </div>
      )}
    </AppShell>
  )
}
