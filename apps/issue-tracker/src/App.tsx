import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Select,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  issues,
  type Issue,
} from './host/mock';

type Draft = Omit<Issue, 'id'>;
type SortDir = 'asc' | 'desc';
const PRIORITY_RANK: Record<string, number> = { Low: 0, Medium: 1, High: 2 };

function newDraft(): Draft {
  return { title: '', type: 'Bug', priority: 'Medium', assignee: '', status: 'Open' };
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function App() {
  const [version, setVersion] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(newDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [bugOnly, setBugOnly] = useState(false);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const all = useMemo(() => issues.list(), [version]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter((issue) => {
      if (bugOnly && issue.type !== 'Bug') return false;
      if (q === '') return true;
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.assignee.toLowerCase().includes(q) ||
        issue.status.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [all, search, bugOnly, sortDir]);

  function refresh() {
    setVersion((v) => v + 1);
  }

  function resetForm() {
    setDraft(newDraft());
    setEditingId(null);
    setFormOpen(false);
  }

  function openNew() {
    setEditingId(null);
    setDraft(newDraft());
    setFormOpen(true);
  }

  function saveDraft() {
    const title = draft.title.trim();
    if (title === '') return;
    if (editingId !== null) {
      issues.update(editingId, { ...draft, title });
    } else {
      issues.add({ ...draft, title });
    }
    resetForm();
    refresh();
  }

  function startEdit(issue: Issue) {
    setEditingId(issue.id);
    setDraft({
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      assignee: issue.assignee,
      status: issue.status,
    });
    setFormOpen(true);
  }

  function removeIssue(id: string) {
    issues.remove(id);
    if (editingId === id) {
      setEditingId(null);
      setDraft(newDraft());
    }
    refresh();
  }

  function deleteLast() {
    if (all.length === 0) return;
    removeIssue(all[all.length - 1].id);
  }

  function exportCsv() {
    const head = 'Title,Type,Priority,Assignee,Status';
    const lines = visible.map(
      (issue) =>
        [
          escapeCsv(issue.title),
          escapeCsv(issue.type),
          escapeCsv(issue.priority),
          escapeCsv(issue.assignee),
          escapeCsv(issue.status),
        ].join(','),
    );
    const csv = [head, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'issues.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch('');
    setBugOnly(false);
  }

  const columns: { key: string; label: ReactNode }[] = [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
    {
      key: 'priority',
      label: (
        <span>
          Priority
          <button
            type="button"
            className="lc-btn ghost"
            style={{ padding: '0 0 0 calc(6px * var(--sf))' }}
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </span>
      ),
    },
    { key: 'assignee', label: 'Assignee' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '' },
  ];

  const rows = visible.map((issue) => ({
    hot: issue.id === editingId,
    cells: {
      title: issue.title,
      type: <Tag>{issue.type}</Tag>,
      priority: <Tag accent={issue.priority === 'High'}>{issue.priority}</Tag>,
      assignee: issue.assignee === '' ? '—' : issue.assignee,
      status: issue.status,
      actions: (
        <Button kind="ghost" onClick={() => startEdit(issue)}>
          Edit
        </Button>
      ),
    },
  }));

  const hasIssues = all.length > 0;

  const empty = (
    <EmptyState
      title="No issues yet"
      detail="Add a bug or feature above to start tracking it."
    />
  );

  return (
    <AppShell
      name="Bug Issue Tracker"
      icon="tasks"
      hue="teal"
      category="Productivity"
      meta={all.length === 1 ? '1 issue' : `${all.length} issues`}
      status="Local · no network"
      actions={
        <Button kind="secondary" onClick={openNew}>
          New issue
        </Button>
      }
    >
      {formOpen && (
        <Card mono={editingId !== null ? 'Edit issue' : 'New issue'}>
          <FormGrid>
            <TextInput
              label="Title"
              value={draft.title}
              placeholder="Login crash on Safari"
              onChange={(value) => setDraft((d) => ({ ...d, title: value }))}
            />
            <Select
              label="Type"
              value={draft.type}
              options={[...ISSUE_TYPES]}
              onChange={(value) =>
                setDraft((d) => ({ ...d, type: value as Draft['type'] }))
              }
            />
            <Select
              label="Priority"
              value={draft.priority}
              options={[...ISSUE_PRIORITIES]}
              onChange={(value) =>
                setDraft((d) => ({ ...d, priority: value as Draft['priority'] }))
              }
            />
            <TextInput
              label="Assignee"
              value={draft.assignee}
              placeholder="Alice"
              onChange={(value) => setDraft((d) => ({ ...d, assignee: value }))}
            />
            {editingId !== null && (
              <Select
                label="Status"
                value={draft.status}
                options={[...ISSUE_STATUSES]}
                onChange={(value) =>
                  setDraft((d) => ({ ...d, status: value as Draft['status'] }))
                }
              />
            )}
          </FormGrid>
          <div
            style={{
              marginTop: 'calc(12px * var(--sf))',
              display: 'flex',
              gap: 'calc(8px * var(--sf))',
            }}
          >
            <Button kind="primary" onClick={saveDraft}>
              Save
            </Button>
            <Button kind="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {hasIssues && (
        <Card>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(10px * var(--sf))',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                flex: '1 1 calc(200px * var(--sf))',
                minWidth: 'calc(160px * var(--sf))',
              }}
            >
              <TextInput
                label="Search"
                type="search"
                value={search}
                placeholder="Filter by title, assignee, or status"
                onChange={setSearch}
              />
            </div>
            <Button
              kind={bugOnly ? 'ink' : 'secondary'}
              onClick={() => setBugOnly((b) => !b)}
              aria-label="Filter to Bug issues"
            >
              Bug
            </Button>
          </div>
        </Card>
      )}

      {hasIssues && (
        <Card>
          <div
            style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}
          >
            <Button kind="ghost" onClick={deleteLast}>
              Delete
            </Button>
            <Button kind="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
            <Button kind="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        </Card>
      )}

      {hasIssues && visible.length === 0 && (
        <Card>
          <EmptyState
            title="No matches"
            detail="No issues match the current search and filters."
          />
        </Card>
      )}

      {hasIssues && visible.length > 0 && (
        <Card flush>
          <div style={{ padding: 'calc(6px * var(--sf)) calc(18px * var(--sf))' }}>
            <Table label="Issues" columns={columns} rows={rows} empty={empty} />
          </div>
        </Card>
      )}

      {!hasIssues && <Card>{empty}</Card>}
    </AppShell>
  );
}
