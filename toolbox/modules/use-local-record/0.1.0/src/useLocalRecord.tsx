// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-local-record 0.1.0: snapshot of lacuna-components useLocalRecord at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface Migration<TOld, TNew> {
  (old: TOld): TNew;
}

export interface UseLocalRecordOptions<T> {
  /** Unique key under which the record is stored in localStorage. */
  key: string;
  /** Current schema version of the record. */
  version: number;
  /** Value to use when no record exists or the stored version is lower than 0. */
  defaultValue: T;
  /**
   * Map from a previously stored version number to a migration function
   * that upgrades the record to the next version.
   * Keys must be integers from 0 up to (version - 1).
   */
  migrations?: Record<number, Migration<unknown, unknown>>;
}

export interface UseLocalRecordReturn<T> {
  /** The current record value (migrated to the latest version). */
  value: T;
  /** Setter that persists the new value to localStorage. */
  set: Dispatch<SetStateAction<T>>;
  /** True if the record was loaded from storage (possibly migrated). */
  hydrated: boolean;
}

interface Stored {
  version?: unknown;
  data?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function useLocalRecord<T>(
  options: UseLocalRecordOptions<T>,
): UseLocalRecordReturn<T> {
  const { key, version, defaultValue, migrations } = options;

  const [state, setState] = useState<{ value: T; hydrated: boolean }>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return { value: defaultValue, hydrated: false };
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) {
        return { value: defaultValue, hydrated: false };
      }
      const stored = parsed as Stored;
      const storedVersion = stored.version;
      if (!isNumber(storedVersion) || storedVersion < 0 || storedVersion > version) {
        return { value: defaultValue, hydrated: false };
      }
      let data: unknown = stored.data;
      let current = storedVersion;
      while (current < version) {
        const migrate = migrations?.[current];
        if (!migrate) {
          return { value: defaultValue, hydrated: false };
        }
        data = migrate(data);
        current += 1;
      }
      return { value: data as T, hydrated: true };
    } catch {
      return { value: defaultValue, hydrated: false };
    }
  });

  // Only persist after an explicit set; a fresh load must not rewrite storage.
  const dirtyRef = useRef(false);

  // Persist after render. Batches same-tick updates into a single write.
  useEffect(() => {
    if (!dirtyRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ version, data: state.value }),
      );
    } catch {
      // ignore quota / privacy-mode failures
    }
  }, [key, version, state.value]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    dirtyRef.current = true;
    setState((prev) => ({
      value: typeof next === 'function' ? (next as (prev: T) => T)(prev.value) : next,
      hydrated: true,
    }));
  }, []);

  return { value: state.value, set, hydrated: state.hydrated };
}
