// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Rail,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'

type MemberData = { name: string }
type ChoreData = { memberId: string; name: string; done: boolean }

const MEMBERS_KEY = 'lacuna.chore-chart.members'
const CHORES_KEY = 'lacuna.chore-chart.chores'

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function toCSV(rows: { member: string; chore: string; done: boolean }[]): string {
  const lines = ['Member,Chore,Status']
  for (const r of rows) {
    lines.push([csvField(r.member), csvField(r.chore), r.done ? 'Done' : 'Open'].join(','))
  }
  return lines.join('\n') + '\n'
}

export function App() {
  const members = useCollection<MemberData>({ storageKey: MEMBERS_KEY })
  const chores = useCollection<ChoreData>({ storageKey: CHORES_KEY })

  const [tab, setTab] = useState<'Members' | 'Chores'>('Members')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [choreName, setChoreName] = useState('')
  const [choreError, setChoreError] = useState<string | null>(null)

  const { copied, copy } = useClipboard()

  const memberList = members.state.activeItems
  const choreList = chores.state.activeItems

  const choresByMember = (id: string) => choreList.filter((c) => c.data.memberId === id)

  const totalChores = choreList.length
  const doneChores = choreList.filter((c) => c.data.done).length

  const assignTarget = memberList.find((m) => m.id === assigningId)

  const onAddMember = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Type a name first')
      return
    }
    if (memberList.some((m) => m.data.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameError('That member is already on the list')
      return
    }
    members.actions.add({ name: trimmed })
    setName('')
    setNameError(null)
  }

  const onOpenAssign = (id: string) => {
    setAssigningId(id)
    setChoreName('')
    setChoreError(null)
  }

  const onCloseAssign = () => {
    setAssigningId(null)
    setChoreName('')
    setChoreError(null)
  }

  const onSaveChore = () => {
    if (assigningId == null) return
    const trimmed = choreName.trim()
    if (!trimmed) {
      setChoreError('Type a chore name')
      return
    }
    chores.actions.add({ memberId: assigningId, name: trimmed, done: false })
    setChoreName('')
    setChoreError(null)
  }

  const onRemoveMember = (id: string) => {
    for (const c of chores.state.activeItems) {
      if (c.data.memberId === id) chores.actions.remove(c.id)
    }
    members.actions.remove(id)
  }

  const onToggleChore = (id: string, done: boolean) => {
    chores.actions.update(id, { done })
  }

  const onRemoveChore = (id: string) => {
    chores.actions.remove(id)
  }

  const onExportCSV = () => {
    const rows = choreList.map((c) => {
      const member = memberList.find((m) => m.id === c.data.memberId)?.data.name ?? ''
      return { member, chore: c.data.name, done: c.data.done }
    })
    void copy(toCSV(rows))
  }

  const choreRows = choreList.map((c) => {
    const member = memberList.find((m) => m.id === c.data.memberId)?.data.name ?? ''
    return {
      cells: {
        member,
        chore: c.data.name,
        status: (
          <Checkbox
            label={c.data.done ? 'Done' : 'Open'}
            checked={c.data.done}
            onChange={(checked) => onToggleChore(c.id, checked)}
          />
        ),
        actions: (
          <Button kind="ghost" ariaLabel={`Remove ${c.data.name}`} onClick={() => onRemoveChore(c.id)}>
            Remove
          </Button>
        ),
      },
    }
  })

  return (
    <AppShell
      name="Chore Chart"
      icon="tasks"
      hue="green"
      category="Productivity"
      meta={`${memberList.length} ${memberList.length === 1 ? 'member' : 'members'} · ${doneChores}/${totalChores} done`}
      status={
        copied ? 'CSV copied to clipboard' : `${doneChores} of ${totalChores} chores done`
      }
      side={
        <Rail
          title="Household"
          chips={[
            `${memberList.length} ${memberList.length === 1 ? 'member' : 'members'}`,
            `${totalChores} ${totalChores === 1 ? 'chore' : 'chores'}`,
            `${doneChores} done`,
          ]}
          note={`${memberList.length > 0 && doneChores === totalChores ? 'All chores done' : `${totalChores - doneChores} chores still open`}`}
        />
      }
    >
      <div
        role="tablist"
        aria-label="Chore chart sections"
        className="lc-tabs"
      >
        {(['Members', 'Chores'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            style={tab === item ? undefined : { color: 'var(--ink-60)' }}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Members' ? (
        <Card mono="New" title="Add a member">
          <FormGrid>
            <TextInput
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Who in the household?"
              error={nameError}
            />
          </FormGrid>
          <PrimaryButton onClick={onAddMember}>Add member</PrimaryButton>
        </Card>
      ) : null}

      {tab === 'Members' ? (
        <Card mono={`${memberList.length} members`} title="Members">
          {memberList.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No members yet"
              detail="Add the first person in the household above."
              actionLabel="Add a member"
              onAction={() => setTab('Members')}
            />
          ) : (
            <ul className="lk-list" aria-label="Members">
              {memberList.map((m) => {
                const theirs = choresByMember(m.id)
                const doneCount = theirs.filter((c) => c.data.done).length
                return (
                  <li key={m.id} className="lk-row" aria-label={m.data.name}>
                    <span className="lk-row-text">
                      <span className="lk-row-title">{m.data.name}</span>
                    </span>
                    <span className="lk-row-value">
                      {theirs.length === 0
                        ? '0 chores'
                        : `${doneCount}/${theirs.length} · ${theirs.length} chores`}
                    </span>
                    <span className="lk-actions">
                      <Button kind="secondary" onClick={() => onOpenAssign(m.id)}>
                        Assign chore
                      </Button>
                      <Button
                        kind="danger"
                        ariaLabel={`Remove ${m.data.name}`}
                        onClick={() => onRemoveMember(m.id)}
                      >
                        Remove {m.data.name}
                      </Button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {assigningId != null ? (
        <Card mono="New" title={`Assign a chore to ${assignTarget?.data.name ?? 'member'}`}>
          <FormGrid>
            <TextInput
              label="Chore name"
              value={choreName}
              onChange={setChoreName}
              placeholder="Dishes, laundry, dishes..."
              error={choreError}
            />
          </FormGrid>
          <span className="lk-actions">
            <PrimaryButton onClick={onSaveChore}>Save</PrimaryButton>
            <Button kind="secondary" onClick={onCloseAssign}>
              Cancel
            </Button>
          </span>
        </Card>
      ) : null}

      {tab === 'Chores' ? (
        <Card
          mono={`${totalChores} ${totalChores === 1 ? 'chore' : 'chores'}`}
          title="Chores"
          actions={
            <Button kind="secondary" onClick={onExportCSV} disabled={totalChores === 0}>
              Export CSV
            </Button>
          }
        >
          {totalChores === 0 ? (
            <EmptyState
              mono="Empty"
              title="No chores yet"
              detail="Assign a chore to a member from the Members tab."
              actionLabel="Open Members"
              onAction={() => setTab('Members')}
            />
          ) : (
            <Table
              label="Chores"
              columns={[
                { key: 'member', label: 'Member' },
                { key: 'chore', label: 'Chore' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: '' },
              ]}
              rows={choreRows}
            />
          )}
        </Card>
      ) : null}
    </AppShell>
  )
}
