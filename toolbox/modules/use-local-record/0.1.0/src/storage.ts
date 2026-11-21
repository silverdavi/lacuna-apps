// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-local-record 0.1.0: snapshot of lacuna-components useLocalRecord at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
const backing = new Map<string, string>();

type StorageProto = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function installInMemoryStorage(): void {
  const proto = Storage.prototype as StorageProto;
  proto.getItem = (key) => (backing.has(key) ? (backing.get(key) as string) : null);
  proto.setItem = (key, value) => {
    backing.set(key, String(value));
  };
  proto.removeItem = (key) => {
    backing.delete(key);
  };
  proto.clear = () => {
    backing.clear();
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: Object.create(Storage.prototype),
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis.localStorage === 'undefined') {
  installInMemoryStorage();
}

export {}
