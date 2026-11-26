import { createMockRecordStore } from '@lacuna/host-mock';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

export function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.url === 'string' &&
    Array.isArray(v.tags) &&
    v.tags.every((t) => typeof t === 'string')
  );
}

// No `storage` option: the store reads and writes the browser's localStorage,
// so the bookmark list survives a page reload (A8, A9).
export const bookmarks = createMockRecordStore<Bookmark>({
  key: 'lacuna.bookmark-manager.bookmarks',
  validate: isBookmark,
  idPrefix: 'bookmark-',
});
