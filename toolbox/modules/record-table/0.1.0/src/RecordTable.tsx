// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/record-table 0.1.0: snapshot of lacuna-components RecordTable at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useMemo } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { filterRecords, sortRecords } from '@lacuna/query-spec';

export interface ColumnDef<T> {
  key: string;
  header: string;
  formatter?: (value: unknown, record: T) => ReactNode;
  sortable?: boolean;
}

export interface GroupDef<T> {
  key: string;
  label: string;
  formatter?: (value: unknown, record: T) => ReactNode;
}

export interface RecordTableProps<T extends Record<string, unknown>> {
  records: T[];
  columns: ColumnDef<T>[];
  groups?: GroupDef<T>[];
  selectable?: boolean;
  selectionMode?: 'single' | 'multi' | 'range';
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  rowKey?: (record: T) => string;
  onSort?: (sortKeys: string[]) => void;
  sortKeys?: string[];
  filter?: (record: T) => boolean;
  emptyMessage?: string;
  /** Accessible name of the table. */
  ariaLabel?: string;
}

const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
};

const headerStyle: CSSProperties = {
  textAlign: 'left',
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  background: 'var(--paper-deep)',
  color: 'var(--ink)',
};

const headerBtnStyle: CSSProperties = {
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'calc(4px * var(--sf))',
};

const cellStyle: CSSProperties = {
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair)',
  color: 'var(--ink)',
  background: 'var(--paper)',
  textAlign: 'left',
};

const selectedCellStyle: CSSProperties = {
  background: 'var(--ink)',
  color: 'var(--paper)',
};

const emptyCellStyle: CSSProperties = {
  padding: 'calc(16px * var(--sf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  textAlign: 'center',
  fontStyle: 'italic',
};

function keyOfRecord<T extends Record<string, unknown>>(
  record: T,
  rowKey: ((record: T) => string) | undefined,
): string {
  if (rowKey) return rowKey(record);
  const id = record.id;
  return typeof id === 'undefined' ? '' : String(id);
}

function cellText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(cellText).join(' ');
  if (node && typeof node === 'object' && 'children' in node) {
    return cellText((node as { children?: unknown }).children);
  }
  return '';
}

function toggleSortKey(sortKeys: string[] | undefined, key: string): string[] {
  const first = sortKeys?.[0] ?? '';
  if (first === key) return [`-${key}`];
  return [key];
}

export function RecordTable<T extends Record<string, unknown>>(
  props: RecordTableProps<T>,
): ReactNode {
  const {
    records,
    columns,
    selectable = false,
    selectionMode = 'single',
    selectedKeys,
    onSelectionChange,
    rowKey,
    onSort,
    sortKeys,
    filter,
    emptyMessage = 'No records',
    ariaLabel,
  } = props;

  const filtered = useMemo(
    () => (filter ? filterRecords(records, filter) : records),
    [records, filter],
  );

  const sorted = useMemo(() => {
    if (!sortKeys || sortKeys.length === 0) return filtered;
    return sortRecords(filtered, sortKeys.map((k) => ({
      field: k.replace(/^-/, '') as keyof T & string,
      direction: k.startsWith('-') ? ('desc' as const) : ('asc' as const),
    })));
  }, [filtered, sortKeys]);

  const selectedSet = useMemo(() => new Set(selectedKeys ?? []), [selectedKeys]);

  const handleSort = (key: string) => {
    onSort?.(toggleSortKey(sortKeys, key));
  };

  const handleRowSelect = (record: T, e: MouseEvent<HTMLTableRowElement>) => {
    if (!selectable) return;
    const key = keyOfRecord(record, rowKey);
    const meta = e.metaKey || e.ctrlKey;
    if (selectionMode === 'single') {
      onSelectionChange?.(meta && selectedSet.has(key) ? [] : [key]);
      return;
    }
    if (selectionMode === 'multi') {
      const next = new Set(selectedSet);
      if (meta) {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      } else {
        next.clear();
        next.add(key);
      }
      const ordered: string[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const rec = sorted[i];
        if (rec === undefined) continue;
        const k = keyOfRecord(rec, rowKey);
        if (next.has(k)) ordered.push(k);
      }
      onSelectionChange?.(ordered);
      return;
    }
    onSelectionChange?.([key]);
  };

  const renderCell = (record: T, col: ColumnDef<T>) => {
    const value = record[col.key];
    const node = col.formatter ? col.formatter(value, record) : cellText(value);
    const selected = selectable && selectedSet.has(keyOfRecord(record, rowKey));
    return (
      <td key={col.key} style={selected ? { ...cellStyle, ...selectedCellStyle } : cellStyle}>
        {node}
      </td>
    );
  };

  const renderRow = (record: T) => {
    const key = keyOfRecord(record, rowKey);
    const selected = selectable && selectedSet.has(key);
    return (
      <tr
        key={key}
        aria-selected={selectable ? selected : undefined}
        onMouseUp={(e) => handleRowSelect(record, e)}
        style={{ cursor: selectable ? 'pointer' : undefined }}
      >
        {columns.map((c) => renderCell(record, c))}
      </tr>
    );
  };

  const hasData = sorted.length > 0;
  const firstSort = sortKeys?.[0] ?? '';

  return (
    <table style={tableStyle} aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((col) => {
            const sortable = col.sortable ?? false;
            const isSorted = firstSort === col.key || firstSort === `-${col.key}`;
            const dir: 'asc' | 'desc' | null = !isSorted
              ? null
              : firstSort === `-${col.key}`
                ? 'desc'
                : 'asc';
            return (
              <th
                key={col.key}
                scope="col"
                style={headerStyle}
                tabIndex={sortable ? undefined : -1}
                aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {sortable ? (
                  <button
                    type="button"
                    style={headerBtnStyle}
                    tabIndex={0}
                    onClick={() => handleSort(col.key)}
                  >
                    <span>{col.header}</span>
                    {dir && (
                      <span aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ) : (
                  <span>{col.header}</span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {!hasData && (
          <tr>
            <td colSpan={columns.length} style={emptyCellStyle}>
              {emptyMessage}
            </td>
          </tr>
        )}
        {sorted.map((rec) => renderRow(rec))}
      </tbody>
    </table>
  );
}
