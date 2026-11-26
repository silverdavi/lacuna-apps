import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Select,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { addRole, loadRoles, removeRole, type Role } from './host'

interface PlacedNode {
  id: string
  name: string
  parentId: string | null
  x: number
  y: number
  w: number
  h: number
  depth: number
}

const NODE_H = 44
const H_GAP = 24
const V_GAP = 56

function measureWidth(name: string): number {
  return Math.round(name.length * 8.5) + 28
}

function layout(roles: Role[]): { nodes: PlacedNode[]; width: number; height: number } {
  const byParent = new Map<string | null, Role[]>()
  for (const role of roles) {
    const key = role.parentId
    const list = byParent.get(key) ?? []
    list.push(role)
    byParent.set(key, list)
  }

  const widths = new Map<string, number>()
  const subtreeW = (id: string): number => {
    const cached = widths.get(id)
    if (cached !== undefined) return cached
    const role = roles.find((r) => r.id === id)
    if (!role) return measureWidth('')
    const self = measureWidth(role.name)
    const kids = byParent.get(id) ?? []
    let w = self
    for (const k of kids) w += H_GAP + subtreeW(k.id)
    widths.set(id, w)
    return w
  }

  const roots = byParent.get(null) ?? []
  const totalW = Math.max(roots.reduce((sum, r) => sum + subtreeW(r.id) + H_GAP, -H_GAP), 200)

  const placed = new Map<string, PlacedNode>()

  const place = (id: string, x: number, depth: number) => {
    const role = roles.find((r) => r.id === id)
    if (!role) return
    const w = measureWidth(role.name)
    const kids = byParent.get(id) ?? []
    const childW = kids.reduce((s, k) => s + subtreeW(k.id) + H_GAP, -H_GAP)
    let cx = x + (w - childW) / 2
    const childXs: number[] = []
    for (const k of kids) {
      const kw = subtreeW(k.id)
      childXs.push(cx + kw / 2 - measureWidth(k.name) / 2)
      cx += kw + H_GAP
    }
    placed.set(id, {
      id,
      name: role.name,
      parentId: role.parentId,
      x,
      y: depth * (NODE_H + V_GAP),
      w,
      h: NODE_H,
      depth,
    })
    for (let i = 0; i < kids.length; i++) {
      place(kids[i].id, childXs[i], depth + 1)
    }
  }

  let rx = 0
  for (const r of roots) {
    place(r.id, rx, 0)
    rx += subtreeW(r.id) + H_GAP
  }

  const nodes = [...placed.values()]
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  return {
    nodes,
    width: totalW,
    height: (maxDepth + 1) * NODE_H + maxDepth * V_GAP + 16,
  }
}

export function App() {
  const [roles, setRoles] = useState<Role[]>(() => loadRoles())
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'Canvas' | 'Outline'>('Canvas')
  const [zoom, setZoom] = useState(100)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const { nodes, width, height } = useMemo(() => layout(roles), [roles])
  const scale = zoom / 100

  function commit(next: Role[]) {
    setRoles(next)
    if (parentId && !next.some((role) => role.id === parentId)) setParentId('')
  }

  function add() {
    const next = name.trim()
    if (!next) return setError('Type a role name first')
    if (roles.some((role) => role.name.toLowerCase() === next.toLowerCase()))
      return setError('That role already exists')
    commit(addRole(next, parentId || null))
    setName('')
    setError(null)
  }

  function del(id: string) {
    commit(removeRole(id))
  }

  function zoomIn() {
    setZoom((z) => Math.min(200, z + 25))
  }
  function zoomOut() {
    setZoom((z) => Math.max(50, z - 25))
  }

  function autoLayout() {
    setZoom(100)
  }

  return (
    <AppShell
      name="Org Chart"
      icon="people"
      hue="brown"
      category="Business"
      meta={`${roles.length} ${roles.length === 1 ? 'role' : 'roles'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Org Chart"
          note="Reporting lines · local"
          chips={['Add roles', 'Set who reports to', 'Zoom the canvas', 'Export JSON', 'Works offline']}
        />
      }
    >
      <Card mono="New" title="Add a role">
        <FormGrid>
          <TextInput
            label="Role name"
            value={name}
            onChange={(value) => {
              setName(value)
              if (error) setError(null)
            }}
            error={error}
            placeholder="CEO"
          />
          <Select
            label="Reports to"
            value={parentId}
            onChange={setParentId}
            options={[
              { value: '', label: 'No one (top of the chart)' },
              ...roles.map((role) => ({ value: role.id, label: role.name })),
            ]}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={add}>Add role</Button>
        </Actions>
      </Card>

      <Card mono={`${roles.length} roles`} title="Chart">
        {roles.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No roles yet"
            detail="Add the first role above to start the chart."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--sf))' }}>
            <div role="tablist" aria-label="Chart views" style={{ display: 'flex', gap: 'calc(20px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
              {(['Canvas', 'Outline'] as const).map((t) => (
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
                    padding: 'calc(8px * var(--sf)) 0',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
              <Button kind="ghost" ariaLabel="Zoom out" onClick={zoomOut}>Zoom out</Button>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                Zoom {zoom}%
              </span>
              <Button kind="ghost" ariaLabel="Zoom in" onClick={zoomIn}>Zoom in</Button>
              <Button kind="secondary" onClick={autoLayout}>Auto layout</Button>
            </div>

            {tab === 'Canvas' ? (
              <div style={{ overflow: 'auto', border: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
                <svg
                  width={Math.max(width * scale, 200)}
                  height={height * scale}
                  role="img"
                  aria-label="Org chart canvas"
                >
                  <g transform={`scale(${scale})`}>
                    {nodes.map((node) => {
                      const parent = node.parentId ? nodes.find((n) => n.id === node.parentId) : null
                      if (!parent) return null
                      const pxC = parent.x + parent.w / 2
                      const pYb = parent.y + parent.h
                      const cXc = node.x + node.w / 2
                      const cYt = node.y
                      const midY = pYb + V_GAP / 2
                      return (
                        <g key={`edge-${node.id}`}>
                          <line x1={pxC} y1={pYb} x2={pxC} y2={midY} stroke="var(--ink-60)" strokeWidth={1} />
                          <line x1={pxC} y1={midY} x2={cXc} y2={midY} stroke="var(--ink-60)" strokeWidth={1} />
                          <line x1={cXc} y1={midY} x2={cXc} y2={cYt} stroke="var(--ink-60)" strokeWidth={1} />
                        </g>
                      )
                    })}
                    {nodes.map((node) => (
                      <g key={node.id}>
                        <rect
                          x={node.x}
                          y={node.y}
                          width={node.w}
                          height={node.h}
                          fill="var(--paper)"
                          stroke="var(--ink)"
                          strokeWidth={1}
                        />
                        <text
                          x={node.x + node.w / 2}
                          y={node.y + node.h / 2 + 5}
                          textAnchor="middle"
                          style={{ fontFamily: 'var(--serif)', fontSize: 'calc(14px * var(--tf))', fill: 'var(--ink)' }}
                        >
                          {node.name}
                        </text>
                        <text
                          x={node.x + node.w - 8}
                          y={node.y + 14}
                          textAnchor="end"
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: 'calc(10px * var(--tf))',
                            fill: 'var(--ink-60)',
                            cursor: 'pointer',
                          }}
                          onClick={() => del(node.id)}
                        >
                          ✕
                        </text>
                      </g>
                    ))}
                  </g>
                </svg>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {nodes.map((node) => (
                    <li
                      key={node.id}
                      style={{
                        margin: `calc(4px * var(--sf)) 0 0 ${node.depth * 1.7}em`,
                        fontFamily: 'var(--serif)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'calc(8px * var(--sf))',
                      }}
                    >
                      {node.name}
                      <Button kind="ghost" ariaLabel={`Delete ${node.name}`} onClick={() => del(node.id)}>
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {nodes.map((node) => (
                  <li
                    key={node.id}
                    style={{
                      margin: `calc(4px * var(--sf)) 0 0 ${node.depth * 1.7}em`,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'calc(8px * var(--sf))',
                        border: `calc(1px * var(--sf)) solid var(--ui-line2)`,
                        borderRadius: 'calc(2px * var(--sf))',
                        padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--serif)' }}>{node.name}</span>
                      <Button kind="ghost" ariaLabel={`Delete ${node.name}`} onClick={() => del(node.id)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card mono={`${roles.length} roles`} title="Roles">
        <KpiRow>
          <Kpi value={String(roles.length)} label="Roles" accent />
          <Kpi value={String(roles.filter((role) => role.parentId === null).length)} label="Top level" />
        </KpiRow>
        <Actions>
          <Button
            kind="secondary"
            disabled={roles.length === 0}
            onClick={() => {
              const roots = roles.filter((r) => r.parentId === null)
              if (roots.length === 0) return
              const buildExport = (id: string): { name: string; children: unknown[] } => {
                const role = roles.find((r) => r.id === id)!
                return {
                  name: role.name,
                  children: roles.filter((c) => c.parentId === id).map((c) => buildExport(c.id)),
                }
              }
              void copy(JSON.stringify(buildExport(roots[0].id)))
            }}
          >
            {copied ? 'Copied' : 'Export JSON'}
          </Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
