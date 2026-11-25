import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  AppShell,
  Card,
  Button,
  EmptyState,
  Rail,
  Stack,
  SectionLabel,
} from '@lacuna/ui';
import { useCollection } from '@lacuna/use-collection';
import { saveText } from '@lacuna/file-save-open';
import { toCsv } from '@lacuna/csv-parse';

type RsvpStatus = 'pending' | 'accepted' | 'declined';

interface GuestData {
  name: string;
  email: string;
  rsvp: RsvpStatus;
}

interface GuestRow {
  id: string;
  name: string;
  email: string;
  rsvp: RsvpStatus;
}

type SortField = 'name' | 'rsvp';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const RsvpLabels: Record<RsvpStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
};

const RsvpOptions: { value: RsvpStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf))',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
};

const primaryBtnStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf))',
  cursor: 'pointer',
};

const cancelBtnStyle: CSSProperties = {
  ...primaryBtnStyle,
  color: 'var(--ink)',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  fontWeight: 600,
  color: 'var(--ink)',
  cursor: 'pointer',
  userSelect: 'none',
};

const thPlainStyle: CSSProperties = {
  textAlign: 'left',
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  fontWeight: 600,
  color: 'var(--ink)',
};

const tdStyle: CSSProperties = {
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair)',
  color: 'var(--ink)',
};

const sortIndicatorStyle: CSSProperties = {
  marginLeft: 'calc(4px * var(--sf))',
  fontSize: 'calc(10px * var(--tf))',
};

export function App() {
  const { state, actions } = useCollection<GuestData>({
    storageKey: 'lacuna.guest-list.v1',
  });

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRsvp, setFormRsvp] = useState<RsvpStatus>('pending');

  const guests: GuestRow[] = useMemo(
    () =>
      state.activeItems.map((item) => ({
        id: item.id,
        name: item.data.name,
        email: item.data.email ?? '',
        rsvp: item.data.rsvp,
      })),
    [state.activeItems],
  );

  const acceptedCount = guests.filter((g) => g.rsvp === 'accepted').length;
  const pendingCount = guests.filter((g) => g.rsvp === 'pending').length;
  const declinedCount = guests.filter((g) => g.rsvp === 'declined').length;

  const filtered = useMemo(() => {
    if (query.trim() === '') return guests;
    const q = query.trim().toLowerCase();
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q),
    );
  }, [guests, query]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sort.field === 'name' ? a.name : a.rsvp;
      const bv = sort.field === 'name' ? b.name : b.rsvp;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setFormName('');
    setFormEmail('');
    setFormRsvp('pending');
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;
    const email = formEmail.trim();
    actions.add({ name, email, rsvp: formRsvp });
    resetForm();
  }

  function startEdit(id: string) {
    const guest = guests.find((g) => g.id === id);
    if (!guest) return;
    setEditing(id);
    setFormName(guest.name);
    setFormEmail(guest.email);
    setFormRsvp(guest.rsvp);
  }

  function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const name = formName.trim();
    if (!name) return;
    const email = formEmail.trim();
    actions.update(editing, { name, email, rsvp: formRsvp });
    setEditing(null);
    resetForm();
  }

  function handleDelete(id: string) {
    actions.remove(id);
    if (editing === id) {
      setEditing(null);
      resetForm();
    }
  }

  function handleCancelEdit() {
    setEditing(null);
    resetForm();
  }

  function handleExportCsv() {
    const rows: string[][] = [['Name', 'Email', 'RSVP']];
    for (const g of sorted) {
      rows.push([g.name, g.email, RsvpLabels[g.rsvp]]);
    }
    saveText(toCsv(rows), { filename: 'guest-list.csv', mimeType: 'text/csv' });
    showToast('CSV exported');
  }

  function toggleSort(field: SortField) {
    if (sort?.field === field) {
      setSort({
        field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSort({ field, direction: 'asc' });
    }
  }

  function sortIndicator(field: SortField) {
    if (sort?.field !== field) return '';
    return sort.direction === 'asc' ? ' ▲' : ' ▼';
  }

  const isEditing = editing !== null;

  return (
    <AppShell
      name="Guest List"
      icon="people"
      hue="rust"
      category="Personal"
      meta={`${guests.length} ${guests.length === 1 ? 'guest' : 'guests'}`}
      actions={
        <Button kind="secondary" ariaLabel="Export CSV" onClick={handleExportCsv}>
          Export CSV
        </Button>
      }
      side={
        <Rail title="RSVP Summary">
          <SectionLabel>By status</SectionLabel>
          <Stack>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              <span>Accepted</span>
              <span style={{ fontFamily: 'var(--mono)' }}>
                Accepted: {acceptedCount}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              <span>Pending</span>
              <span style={{ fontFamily: 'var(--mono)' }}>
                Pending: {pendingCount}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              <span>Declined</span>
              <span style={{ fontFamily: 'var(--mono)' }}>
                Declined: {declinedCount}
              </span>
            </div>
          </Stack>
        </Rail>
      }
    >
      <Stack>
        <Card
          mono={isEditing ? 'Edit' : 'New'}
          title={isEditing ? 'Edit guest' : 'Add a guest'}
        >
          <form
            noValidate
            onSubmit={isEditing ? handleEdit : handleAdd}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(16px * var(--sf))',
            }}
          >
            <div style={rowStyle}>
              <label htmlFor="guest-name" style={labelStyle}>
                Name
              </label>
              <input
                id="guest-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label htmlFor="guest-email" style={labelStyle}>
                Email
              </label>
              <input
                id="guest-email"
                type="text"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label htmlFor="guest-rsvp" style={labelStyle}>
                RSVP
              </label>
              <select
                id="guest-rsvp"
                value={formRsvp}
                onChange={(e) => setFormRsvp(e.target.value as RsvpStatus)}
                style={inputStyle}
              >
                {RsvpOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <button type="submit" style={primaryBtnStyle}>
                {isEditing ? 'Save' : 'Add guest'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  style={cancelBtnStyle}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card
          mono={`${sorted.length} of ${guests.length}`}
          title="Guests"
          actions={
            <input
              type="text"
              aria-label="Search"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={inputStyle}
            />
          }
        >
          {guests.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No guests yet"
              detail="Add your first guest to get started."
              actionLabel="Add your first guest"
              onAction={() => document.getElementById('guest-name')?.focus()}
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              mono="No match"
              title="No guests match"
              detail={`No guests found for "${query}".`}
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          ) : (
            <table style={tableStyle} aria-label="Guest list">
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={thStyle}
                    onClick={() => toggleSort('name')}
                  >
                    Name{sortIndicator('name')}
                  </th>
                  <th scope="col" style={thPlainStyle}>
                    Email
                  </th>
                  <th
                    scope="col"
                    style={thStyle}
                    onClick={() => toggleSort('rsvp')}
                  >
                    RSVP{sortIndicator('rsvp')}
                  </th>
                  <th scope="col" style={thPlainStyle}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((g) => (
                  <tr key={g.id}>
                    <td style={tdStyle}>{g.name}</td>
                    <td style={tdStyle}>{g.email}</td>
                    <td style={tdStyle}>{RsvpLabels[g.rsvp]}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                        <Button
                          kind="ghost"
                          ariaLabel={`Edit ${g.name}`}
                          onClick={() => startEdit(g.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${g.name}`}
                          onClick={() => handleDelete(g.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Stack>

      {toast !== null && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(16px * var(--sf))',
            right: 'calc(16px * var(--sf))',
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 'calc(6px * var(--sf))',
            padding: 'calc(10px * var(--sf)) calc(16px * var(--sf))',
            fontFamily: 'var(--sans)',
            fontSize: 'calc(13px * var(--tf))',
            fontWeight: 500,
            boxShadow:
              '0 calc(4px * var(--sf)) calc(12px * var(--sf)) color-mix(in srgb, var(--ink) 15%, transparent)',
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}
