import { useMemo, useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { age, fromISODate } from '@lacuna/date-math'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import type { Person } from './host/mock'
import { people as peopleStore } from './host/mock'
import './app.css'

interface TreeNode {
  id: string
  label: string
  birthDate: string
  parentId: string | null
  children: TreeNode[]
}

interface GNode {
  person: Person
  x: number
  y: number
}

const NODE_W = 150
const NODE_H = 56
const GAP_X = 40
const GAP_Y = 90

const REFERENCE_DATE = new Date(2024, 11, 31) // 2024-12-31, fixed reference for age display

function buildTree(list: Person[]): TreeNode[] {
  const byParent = new Map<string, TreeNode[]>()
  const roots: TreeNode[] = []
  for (const p of list) {
    const node: TreeNode = { id: p.id, label: p.name, birthDate: p.birthDate, parentId: p.parentId, children: [] }
    if (p.parentId && list.some((o) => o.id === p.parentId)) {
      const arr = byParent.get(p.parentId) ?? []
      arr.push(node)
      byParent.set(p.parentId, arr)
    } else {
      roots.push(node)
    }
  }
  for (const [parentId, nodes] of byParent) {
    const parent = roots.find((r) => r.id === parentId)
    if (parent) parent.children.push(...nodes)
    else roots.push(...nodes)
  }
  return roots
}

function flattenNodes(nodes: TreeNode[]): Person[] {
  const out: Person[] = []
  function walk(list: TreeNode[], parentId: string | null) {
    for (const n of list) {
      out.push({ id: n.id, name: n.label, birthDate: n.birthDate, parentId })
      walk(n.children, n.id)
    }
  }
  walk(nodes, null)
  return out
}

function autoLayout(list: Person[]): Record<string, { x: number; y: number }> {
  const tree = buildTree(list)
  const pos = new Map<string, { x: number; y: number }>()
  let nextX = 0
  function place(nodes: TreeNode[], depth: number): number {
    for (const n of nodes) {
      if (n.children.length === 0) {
        pos.set(n.id, { x: nextX, y: depth * GAP_Y })
        nextX += NODE_W + GAP_X
      } else {
        const start = nextX
        place(n.children, depth + 1)
        pos.set(n.id, { x: (start + (nextX - (NODE_W + GAP_X))) / 2, y: depth * GAP_Y })
      }
    }
    return nextX
  }
  place(tree, 0)
  return Object.fromEntries(pos)
}

function TabsView({ items, active, onSelect }: { items: string[]; active: string; onSelect: (v: string) => void }) {
  return (
    <div role="tablist">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === active}
          className={item === active ? 'ft-tab active' : 'ft-tab'}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function App() {
  const [roster, setRoster] = useState<Person[]>(() => peopleStore.list())
  const [tab, setTab] = useState('Tree')
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [parentDraft, setParentDraft] = useState<string | null>(null)
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }> | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  function refresh() {
    setRoster(peopleStore.list())
  }

  function addPerson() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Type a name first')
    if (!birth.trim()) return setError('Choose a birth date first')
    peopleStore.add({ name: trimmed, birthDate: birth.trim(), parentId: parentDraft })
    setName('')
    setBirth('')
    setError(null)
    setParentDraft(null)
    refresh()
  }

  function startChild(parentId: string) {
    setParentDraft(parentId)
    setName('')
    setBirth('')
    setError(null)
  }

  function deletePerson(id: string) {
    const doomed = new Set<string>()
    const queue = [id]
    const childrenOf = new Map<string, string[]>()
    for (const p of roster) {
      if (p.parentId) {
        const arr = childrenOf.get(p.parentId) ?? []
        arr.push(p.id)
        childrenOf.set(p.parentId, arr)
      }
    }
    while (queue.length > 0) {
      const current = queue.shift()!
      if (doomed.has(current)) continue
      doomed.add(current)
      for (const child of childrenOf.get(current) ?? []) queue.push(child)
    }
    for (const recordId of doomed) peopleStore.remove(recordId)
    refresh()
  }

  const tree = useMemo(() => buildTree(roster), [roster])
  const flat = useMemo(() => flattenNodes(tree), [tree])
  const maxAge = useMemo(() => {
    return Math.max(0, ...flat.map((p) => {
      const b = fromISODate(p.birthDate)
      return b ? age(b, REFERENCE_DATE) : 0
    }))
  }, [flat])

  const jsonText = JSON.stringify(
    flat.map((p) => ({ name: p.name, birthDate: p.birthDate, parentId: p.parentId })),
  )

  const csvText = toCsv([
    ['Name', 'Birth date', 'Parent'],
    ...flat.map((p) => [p.name, p.birthDate, p.parentId ?? '']),
  ])

  function nodePos(id: string): { x: number; y: number } {
    if (layout && layout[id]) return layout[id]
    const person = roster.find((p) => p.id === id)
    const depth = person ? (function depthOf(p: Person): number {
      let d = 0
      let cur = p
      while (cur.parentId && roster.some((o) => o.id === cur.parentId)) {
        cur = roster.find((o) => o.id === cur.parentId)!
        d += 1
      }
      return d
    })(person) : 0
    const index = flat.findIndex((p) => p.id === id)
    return { x: 20 + index * (NODE_W + GAP_X), y: 20 + depth * GAP_Y }
  }

  const graphNodes: GNode[] = flat.map((person) => ({ person, ...nodePos(person.id) }))
  const graphEdges = flat
    .filter((p) => p.parentId && flat.some((o) => o.id === p.parentId))
    .map((p) => ({ from: p.parentId!, to: p.id }))
  const graphWidth = Math.max(600, graphNodes.length * (NODE_W + GAP_X))

  function runAutoLayout() {
    setLayout(autoLayout(roster))
  }

  return (
    <AppShell
      name="Family Tree Visualizer"
      icon="people"
      hue="green"
      category="Personal"
      meta={`${roster.length} ${roster.length === 1 ? 'person' : 'people'}`}
      status="Stored on this device"
    >
      <TabsView items={['Tree', 'Graph']} active={tab} onSelect={setTab} />

      <Card
        mono={parentDraft ? 'New child' : 'New person'}
        title={parentDraft ? `Add a child of ${roster.find((p) => p.id === parentDraft)?.name ?? ''}` : 'Add Person'}
      >
        <FormGrid>
          <TextInput label="Name" value={name} onChange={setName} error={error ? null : undefined} />
          <TextInput label="Birth date" type="date" value={birth} onChange={setBirth} />
        </FormGrid>
        {error && <MonoLabel style={{ marginTop: 'calc(6px * var(--sf))', color: 'var(--danger)' }}>{error}</MonoLabel>}
        <Actions>
          <PrimaryButton onClick={addPerson}>Add person</PrimaryButton>
          {parentDraft && (
            <Button
              kind="secondary"
              onClick={() => {
                setParentDraft(null)
                setError(null)
              }}
            >
              Cancel child
            </Button>
          )}
        </Actions>
      </Card>

      {tab === 'Tree' ? (
        <Card mono={`${roster.length} saved`} title="Family tree">
          {roster.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No people yet"
              detail="Add the first person above."
              actionLabel="Add a person"
              onAction={() => {
                setName('')
                setError(null)
                document.querySelector<HTMLInputElement>('[aria-label="Name"]')?.focus()
              }}
            />
          ) : (
            <ul className="ft-tree" aria-label="Family tree">
              {flat.map((p) => {
                const depth = (function depthOf(x: Person): number {
                  let d = 0
                  let cur = x
                  while (cur.parentId && roster.some((o) => o.id === cur.parentId)) {
                    cur = roster.find((o) => o.id === cur.parentId)!
                    d += 1
                  }
                  return d
                })(p)
                const b = fromISODate(p.birthDate)
                const years = b ? age(b, REFERENCE_DATE) : 0
                return (
                  <li key={p.id} className="ft-tree-item" style={{ paddingLeft: `${12 + depth * 20}px` }}>
                    <div className="ft-tree-line">
                      <span className="ft-tree-name">{p.name}</span>
                      <Tag>{`b. ${p.birthDate}`}</Tag>
                      {years > 0 && <span className="ft-age">{`${years} years`}</span>}
                      <div className="ft-tree-actions">
                        <Button kind="ghost" ariaLabel="Add child" onClick={() => startChild(p.id)}>
                          Add child
                        </Button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${p.name}`}
                          onClick={() => deletePerson(p.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ) : (
        <Card
          mono={`${roster.length} nodes`}
          title="Graph"
          actions={
            <Actions>
              <Button kind="secondary" onClick={runAutoLayout}>Auto-layout</Button>
            </Actions>
          }
        >
          {roster.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No people yet"
              detail="Add a person to draw the first node."
              actionLabel="Add a person"
              onAction={() => {
                setTab('Tree')
                setName('')
                setError(null)
              }}
            />
          ) : (
            <div className="ft-graph-scroll">
              <svg
                className="ft-graph"
                width={graphWidth}
                height={Math.max(200, Math.ceil(flat.length / 2) * GAP_Y + 120)}
                role="img"
                aria-label="Family tree graph"
              >
                {graphEdges.map((e, i) => {
                  const a = nodePos(e.from)
                  const b2 = nodePos(e.to)
                  return (
                    <line
                      key={i}
                      x1={a.x + NODE_W / 2}
                      y1={a.y + NODE_H}
                      x2={b2.x + NODE_W / 2}
                      y2={b2.y}
                      stroke="var(--ui-line2)"
                      strokeWidth={2}
                    />
                  )
                })}
                {graphNodes.map(({ person, x, y }) => (
                  <g key={person.id}>
                    <rect
                      x={x}
                      y={y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={4}
                      fill="var(--ui-card)"
                      stroke="var(--ink)"
                      strokeWidth={1}
                    />
                    <text x={x + NODE_W / 2} y={y + 24} textAnchor="middle" fill="var(--ink)" fontSize={13}>
                      {person.name}
                    </text>
                    <text x={x + NODE_W / 2} y={y + 42} textAnchor="middle" fill="var(--ink-60)" fontSize={10}>
                      b. {person.birthDate}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </Card>
      )}

      <Card mono="Overview" title="Family">
        <KpiRow>
          <Kpi value={roster.length} label="People" accent />
          <Kpi value={maxAge} label="Oldest" />
        </KpiRow>
        <Body sm>Names, birth dates, and parent links.</Body>
        <Stack lg>
          <Actions>
            <Button kind="secondary" onClick={() => void copy(jsonText)}>
              {copied ? 'Copied JSON' : 'Export JSON'}
            </Button>
            <Button kind="secondary" onClick={() => void copy(csvText)}>
              Export CSV
            </Button>
          </Actions>
        </Stack>
      </Card>
    </AppShell>
  )
}
