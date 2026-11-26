import { createMockRecordStore } from '@lacuna/host-mock';

export interface Person {
  id: string;
  name: string;
  birthDate: string;
  parentId: string | null;
}

export function isPerson(value: unknown): value is Person {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.birthDate === 'string' &&
    (v.parentId === null || typeof v.parentId === 'string')
  );
}

// No `storage` option: the store reads and writes the browser's localStorage,
// so the family tree survives a page reload (A9).
export const people = createMockRecordStore<Person>({
  key: 'lacuna.family-tree.people',
  validate: isPerson,
  idPrefix: 'person-',
});
