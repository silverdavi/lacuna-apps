// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-collection 0.1.0: snapshot of lacuna-components useCollection at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useMemo } from 'react';
import { useLocalRecord } from '@lacuna/use-local-record';

export interface CollectionItem<T> {
  id: string;
  data: T;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionOptions<T> {
  /** Storage key prefix for useLocalRecord. */
  storageKey: string;
  /** Generate a unique id for new items. Defaults to crypto.randomUUID(). */
  generateId?: () => string;
  /** Initial items if storage is empty. */
  initialItems?: Array<Omit<CollectionItem<T>, 'id' | 'createdAt' | 'updatedAt'>>;
}

export interface CollectionState<T> {
  items: Array<CollectionItem<T>>;
  /** Items with archived === false. */
  activeItems: Array<CollectionItem<T>>;
  /** Items with archived === true. */
  archivedItems: Array<CollectionItem<T>>;
  isLoading: boolean;
}

export interface CollectionActions<T> {
  add: (data: T) => string;
  update: (id: string, partial: Partial<T>) => void;
  remove: (id: string) => void;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  clearArchived: () => void;
}

export interface UseCollectionReturn<T> {
  state: CollectionState<T>;
  actions: CollectionActions<T>;
}

interface StoredState<T> {
  items: Array<CollectionItem<T>>;
}

function isItem<T>(value: unknown): value is CollectionItem<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as CollectionItem<T>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    candidate.data !== undefined &&
    typeof candidate.archived === 'boolean' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number'
  );
}

function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildInitialState<T>(
  options: CollectionOptions<T>,
  generateId: () => string,
): StoredState<T> {
  const now = Date.now();
  const items: Array<CollectionItem<T>> = (options.initialItems ?? []).map(
    (initial) => ({
      ...initial,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }),
  );
  return { items };
}

function parseStored<T>(raw: unknown): Array<CollectionItem<T>> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const items = (raw as Partial<StoredState<T>>).items;
  if (!Array.isArray(items)) {
    return null;
  }
  return items.filter(isItem<T>);
}

export function useCollection<T>(
  options: CollectionOptions<T>,
): UseCollectionReturn<T> {
  const { storageKey, generateId, initialItems } = options;

  const initialOptions = useMemo(
    () => ({ storageKey, generateId, initialItems }),
    [storageKey, generateId, initialItems],
  );

  const initial = useMemo(
    () =>
      buildInitialState<T>(
        initialOptions,
        typeof initialOptions.generateId === 'function'
          ? initialOptions.generateId
          : defaultGenerateId,
      ),
    [initialOptions],
  );

  const { value, set, hydrated } = useLocalRecord<StoredState<T>>({
    key: storageKey,
    version: 1,
    defaultValue: initial,
    migrations: {
      0: (old: unknown) => {
        const items = parseStored<T>(old);
        if (items !== null) {
          return { items };
        }
        const generate =
          typeof initialOptions.generateId === 'function'
            ? initialOptions.generateId
            : defaultGenerateId;
        return buildInitialState<T>(initialOptions, generate);
      },
    },
  });

  const items: Array<CollectionItem<T>> = value.items ?? [];

  const activeItems = useMemo(
    () => items.filter((item) => !item.archived),
    [items],
  );
  const archivedItems = useMemo(
    () => items.filter((item) => item.archived),
    [items],
  );

  const setItems = useCallback(
    (updater: (prev: Array<CollectionItem<T>>) => Array<CollectionItem<T>>) => {
      set((prev) => ({ items: updater(prev.items) }));
    },
    [set],
  );

  const add = useCallback(
    (data: T): string => {
      const id =
        typeof generateId === 'function' ? generateId() : defaultGenerateId();
      const now = Date.now();
      const item: CollectionItem<T> = {
        id,
        data,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => [...prev, item]);
      return id;
    },
    [generateId, setItems],
  );

  const update = useCallback(
    (id: string, partial: Partial<T>) => {
      const now = Date.now();
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                data: { ...item.data, ...partial },
                updatedAt: Math.max(now, item.updatedAt),
              }
            : item,
        ),
      );
    },
    [setItems],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [setItems],
  );

  const archive = useCallback(
    (id: string) => {
      const now = Date.now();
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                archived: true,
                updatedAt: Math.max(now, item.updatedAt),
              }
            : item,
        ),
      );
    },
    [setItems],
  );

  const unarchive = useCallback(
    (id: string) => {
      const now = Date.now();
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                archived: false,
                updatedAt: Math.max(now, item.updatedAt),
              }
            : item,
        ),
      );
    },
    [setItems],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setItems((prev) => {
        if (
          prev.length === 0 ||
          Number.isNaN(fromIndex) ||
          Number.isNaN(toIndex) ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex >= prev.length ||
          fromIndex === toIndex
        ) {
          return prev;
        }
        const next = prev.slice();
        const moved = next.splice(fromIndex, 1)[0];
        if (moved === undefined) {
          return prev;
        }
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [setItems],
  );

  const clearArchived = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.archived));
  }, [setItems]);

  // The record is read synchronously on first paint (fresh: the default,
  // stored: the validated stored value), so there is never a pending load
  // to report. A stored record is only surfaced once it has been validated
  // and migrated by useLocalRecord, so isLoading stays false throughout.
  const state: CollectionState<T> = {
    items,
    activeItems,
    archivedItems,
    isLoading: false,
  };

  const actions: CollectionActions<T> = {
    add,
    update,
    remove,
    archive,
    unarchive,
    reorder,
    clearArchived,
  };

  return { state, actions };
}
