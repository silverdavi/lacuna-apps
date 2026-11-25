import { useMemo, useState } from 'react';
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
import { fuzzySearch } from '@lacuna/fuzzy-search';

type RsvpStatus = 'Pending' | 'Accepted' | 'Declined';

interface GuestData {
  name: string;
  email: string;
  rsvp: RsvpStatus;
}

const RsvpOptions: RsvpStatus[] = ['Pending', 'Accepted', 'Declined'];

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: 'calc(8px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
};

const cellStyle: React.CSSProperties = {
  padding: 'calc(8px * var(--sf))',
};

const headerCellStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 'calc(8px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
};

export function App() {
  const { state, actions } = useCollection<GuestData>({
    storageKey: 'lacuna.guest-list.v1',
  });

  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKeys, setSortKeys] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRsvp, setFormRsvp] = useState<RsvpStatus>('Pending');

  const guests = useMemo(
    () =>
      state.activeItems.map((item) => ({
        id: item.id,
        name: item.data.name,
        email: item.data.email ?? '',
        rsvp: item.data.rsvp,
      })),
    [state.activeItems],
  );

  const acceptedCount = guests.filter((g) => g.rsvp === 'Accepted').length;
  const pendingCount = guests.filter((g) => g.rsvp === 'Pending').length;
  const declinedCount = guests.filter((g) => g.rsvp === 'Declined').length;

  const filtered = useMemo(() => {
    if (query.trim() === '') return guests;
    const matches = fuzzySearch(guests, query, { fields: ['name', 'email'] });
    return matches
      .map((m) => guests[m.index])
      .filter((g): g is typeof guests[number] => g !== undefined);
  }, [guests, query]);

  const sorted = useMemo(() => {
    if (sortKeys[0] !== 'name') return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortKeys[1] === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortKeys]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setFormName('');
    setFormEmail('');
    setFormRsvp('Pending');
    setEditingId(null);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;
    const email = formEmail.trim();
    if (editingId !== null) {
      actions.update(editingId, { name, email, rsvp: formRsvp });
    } else {
      actions.add({ name, email, rsvp: formRsvp });
    }
    resetForm();
  }

  function startEdit(id: string) {
    const g = guests.find((x) => x.id === id);
    if (!g) return;
    setFormName(g.name);
    setFormEmail(g.email);
    setFormRsvp(g.rsvp);
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id: string) {
    actions.remove(id);
    if (editingId === id) {
      resetForm();
    }
  }

  function handleExportCsv() {
    const rows: string[][] = [['Name', 'Email', 'RSVP']];
    for (const g of filtered) {
      rows.push([g.name, g.email, g.rsvp]);
    }
    saveText(toCsv(rows), { filename: 'guest-list.csv', mimeType: 'text/csv' });
    showToast('CSV exported');
  }

  const isEditing = editingId !== null;

  return (
    <AppShell
      name="Guest List"
      icon="people"
      hue="rust"
      category="Personal"
      meta={`${guests.length} ${guests.length === 1 ? 'guest' : 'guests'}`}
      status={`${guests.length} guests · ${acceptedCount} accepted · ${pendingCount} pending · ${declinedCount} declined`}
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
                {pendingCount}
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
                {declinedCount}
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
            onSubmit={handleFormSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(12px * var(--sf))',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(6px * var(--sf))',
              }}
            >
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(6px * var(--sf))',
              }}
            >
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(6px * var(--sf))',
              }}
            >
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
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              <Button kind="primary" type="submit">
                {isEditing ? 'Save' : 'Add guest'}
              </Button>
              {isEditing && (
                <Button kind="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card
          mono={`${filtered.length} of ${guests.length}`}
          title="Guests"
          actions={
            <div
              style={{
                display: 'flex',
                gap: 'calc(8px * var(--sf))',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                aria-label="Search"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  minWidth: 'calc(120px * var(--sf))',
                }}
              />
              <Button
                kind="secondary"
                ariaLabel="Export CSV"
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
            </div>
          }
        >
          {guests.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No guests yet"
              detail="Add your first guest to get started."
              actionLabel="Add your first guest"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              mono="No match"
              title="No guests match"
              detail={`No guests found for "${query}".`}
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--sans)',
                fontSize: 'calc(14px * var(--tf))',
                color: 'var(--ink)',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      'calc(1px * var(--sf)) solid var(--hair-strong)',
                  }}
                >
                  <th
                    aria-sort={
                      sortKeys[0] === 'name'
                        ? sortKeys.length === 1
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    onClick={() => {
                      if (sortKeys[0] === 'name') {
                        setSortKeys(
                          sortKeys.length === 1 ? [] : ['name', 'desc'],
                        );
                      } else {
                        setSortKeys(['name']);
                      }
                    }}
                    style={{
                      ...headerCellStyle,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Name
                  </th>
                  <th style={headerCellStyle}>Email</th>
                  <th style={headerCellStyle}>RSVP</th>
                  <th style={cellStyle} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((g) => (
                  <tr
                    key={g.id}
                    style={{
                      borderBottom:
                        'calc(1px * var(--sf)) solid var(--hair)',
                    }}
                  >
                    <td style={{ ...cellStyle, fontWeight: 500 }}>
                      {g.name}
                    </td>
                    <td style={cellStyle}>{g.email}</td>
                    <td style={cellStyle}>{g.rsvp}</td>
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Edit ${g.name}`}
                        onClick={() => startEdit(g.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--sans)',
                          fontSize: 'calc(13px * var(--tf))',
                          color: 'var(--ink)',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${g.name}`}
                        onClick={() => handleDelete(g.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--sans)',
                          fontSize: 'calc(13px * var(--tf))',
                          color: 'var(--ink)',
                          textDecoration: 'underline',
                          padding: 0,
                          marginLeft: 'calc(8px * var(--sf))',
                        }}
                      >
                        Delete
                      </button>
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
