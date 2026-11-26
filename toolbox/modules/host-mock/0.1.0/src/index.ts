// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/host-mock 0.1.0: snapshot of lacuna-components hostMock at 6e67435 by sync-toolbox-components.py; a change gets a new version.
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type MockRecordStore<T extends { id: string }> = {
  list(): T[];
  get(id: string): T | undefined;
  add(record: Omit<T, 'id'> & { id?: string }): T;
  update(id: string, patch: Partial<Omit<T, 'id'>>): T | undefined;
  remove(id: string): boolean;
  replaceAll(records: T[]): void;
  clear(): void;
};

export type MockValue<T> = {
  get(): T;
  set(value: T): void;
  clear(): void;
};

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key): string | null {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function resolveStorage(st?: StorageLike): StorageLike {
  if (st) return st;
  try {
    const ls = globalThis.localStorage;
    if (ls) return ls;
  } catch {
    // fall through to memory
  }
  return createMemoryStorage();
}

function safeParse(text: string | null): unknown {
  if (text == null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecordLike(v: unknown): v is { id: string } {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { id?: unknown }).id === 'string'
  );
}

export function createMockRecordStore<T extends { id: string }>(options: {
  key: string;
  validate?: (value: unknown) => value is T;
  idPrefix?: string;
  storage?: StorageLike;
}): MockRecordStore<T> {
  const key = options.key;
  const prefix = options.idPrefix ?? 'id-';
  const storage = resolveStorage(options.storage);
  let memory: T[] | null = null;

  function load(): T[] {
    const text = storage.getItem(key);
    const raw = safeParse(text);
    if (!Array.isArray(raw)) return memory ?? [];
    return raw
      .filter(isRecordLike)
      .filter((v): v is T => (options.validate ? options.validate(v) : true));
  }

  function persist(records: T[]): void {
    try {
      storage.setItem(key, JSON.stringify(records));
      memory = null;
    } catch {
      memory = records;
    }
  }

  return {
    list() {
      const out = load();
      return out.map((r) => ({ ...r }));
    },
    get(id) {
      const found = load().find((r) => r.id === id);
      return found ? { ...found } : undefined;
    },
    add(record) {
      const current = load();
      let id: string;
      if (record.id !== undefined) {
        if (current.some((r) => r.id === record.id)) {
          throw new RangeError(`duplicate id: ${record.id}`);
        }
        id = record.id;
      } else {
        let n = 1;
        for (const r of current) {
          if (r.id.startsWith(prefix)) {
            const m = parseInt(r.id.slice(prefix.length), 10);
            if (Number.isFinite(m) && m >= n) n = m + 1;
          }
        }
        id = prefix + n;
      }
      const full: T = { id, ...(record as object) } as T;
      persist([...current, full]);
      return { ...full };
    },
    update(id, patch) {
      const current = load();
      const idx = current.findIndex((r) => r.id === id);
      if (idx < 0) return undefined;
      const original = current[idx];
      if (!original) return undefined;
      const next: T = { ...original, ...patch, id: original.id };
      persist([...current.slice(0, idx), next, ...current.slice(idx + 1)]);
      return { ...next };
    },
    remove(id) {
      const current = load();
      if (!current.some((r) => r.id === id)) return false;
      persist(current.filter((r) => r.id !== id));
      return true;
    },
    replaceAll(records) {
      persist(records.map((r) => ({ ...r })));
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        // ignore
      }
      memory = null;
    },
  };
}

export function createMockValue<T>(options: {
  key: string;
  fallback: T;
  validate?: (value: unknown) => value is T;
  storage?: StorageLike;
}): MockValue<T> {
  const key = options.key;
  const storage = resolveStorage(options.storage);
  let memory: T | null = null;

  return {
    get() {
      const text = memory !== null ? JSON.stringify(memory) : storage.getItem(key);
      const raw = safeParse(text);
      if (raw === undefined) return options.fallback;
      if (options.validate && !options.validate(raw)) return options.fallback;
      return raw as T;
    },
    set(value) {
      memory = value;
      try {
        storage.setItem(key, JSON.stringify(value));
        memory = null;
      } catch {
        // keep memory
      }
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        // ignore
      }
      memory = null;
    },
  };
}
