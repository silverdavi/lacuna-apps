// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-local-record 0.1.0: snapshot of lacuna-components useLocalRecord at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
const backing = new Map<string, string>();

function installInMemoryStorage(): void {
  const store = {
    get length() {
      return backing.size;
    },
    key: (index: number) => Array.from(backing.keys())[index] ?? null,
    getItem: (key: string) => (backing.has(String(key)) ? (backing.get(String(key)) as string) : null),
    setItem: (key: string, value: string) => {
      backing.set(String(key), String(value));
    },
    removeItem: (key: string) => {
      backing.delete(String(key));
    },
    clear: () => {
      backing.clear();
    },
  };
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: store,
      configurable: true,
      writable: true,
    });
  } catch {
    // Ignore if non-configurable.
  }
}

let hasStorage = false;
try {
  hasStorage = typeof globalThis.localStorage !== 'undefined';
} catch {
  hasStorage = false;
}
if (!hasStorage) {
  installInMemoryStorage();
}

export {}
