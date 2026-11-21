<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useCollection at 9c7f3ab. -->

> `@lacuna/use-collection` `0.1.0`. To use it in an app: add `"@lacuna/use-collection": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-collection": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-collection'`.

# useCollection

A React hook that provides a persisted, in-memory list of typed records with add, update, remove, reorder, and archive operations. Items are stored in `localStorage` via `@lacuna/use-local-record`, so they survive a page reload. The hook exposes the full `items` list plus derived `activeItems` (not archived) and `archivedItems` (archived), and reports `isLoading` while the storage record is still hydrating. Any app that manages a list of user-created items (tasks, notes, saved searches, ...) can build on it.

## Signature

```ts
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

export function useCollection<T>(
  options: CollectionOptions<T>,
): UseCollectionReturn<T>;
```

## Usage

```tsx
import { useCollection } from '@lacuna/use-collection';
import { useState } from 'react';

type Note = { title: string };

export function NotesDemo() {
  const { state, actions } = useCollection<Note>({
    storageKey: 'notes',
    initialItems: [{ data: { title: 'Welcome' }, archived: false }],
  });
  const [draft, setDraft] = useState('');

  const addNote = () => {
    const title = draft.trim();
    if (title === '') return;
    actions.add({ title });
    setDraft('');
  };

  return (
    <section>
      <h1>Notes</h1>
      <input aria-label="New note" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button type="button" aria-label="Add note" onClick={addNote}>
        Add
      </button>
      <ul>
        {state.activeItems.map((item) => (
          <li key={item.id}>
            {item.data.title}{' '}
            <button
              type="button"
              aria-label={`Archive ${item.data.title}`}
              onClick={() => actions.archive(item.id)}
            >
              Archive
            </button>{' '}
            <button
              type="button"
              aria-label={`Remove ${item.data.title}`}
              onClick={() => actions.remove(item.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>
        {state.activeItems.length} active, {state.archivedItems.length} archived
      </p>
    </section>
  );
}
```
