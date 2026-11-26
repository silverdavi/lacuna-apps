// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/paged-reader 0.1.0: snapshot of lacuna-components PagedReader at 8aeeaa8 by sync-toolbox-components.py; a change gets a new version.
import { useId } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';

export interface PagedReaderProps {
  pages: ReactNode[];
  page: number;
  onPageChange: (page: number) => void;
  bookmarks: ReadonlySet<number>;
  onToggleBookmark: (page: number) => void;
  label?: string;
}

const WRAP: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(10px * var(--sf))',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
};

const HEAD: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 'calc(12px * var(--sf))',
};

const PROGRESS: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
};

const PAGE: CSSProperties = {
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(8px * var(--sf))',
  padding: 'calc(16px * var(--sf))',
  fontFamily: 'var(--serif)',
  fontSize: 'calc(15px * var(--tf))',
  lineHeight: 1.6,
  color: 'var(--ink)',
  minHeight: 'calc(200px * var(--sf))',
};

const BAR: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'calc(8px * var(--sf))',
};

const BTN: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(6px * var(--sf))',
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  cursor: 'pointer',
};

const BTN_ACTIVE: CSSProperties = {
  background: 'var(--ink)',
  color: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--ink)',
};

const HIDDEN_LBL: CSSProperties = {
  position: 'absolute',
  width: 'calc(1px * var(--sf))',
  height: 'calc(1px * var(--sf))',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
  margin: 0,
  padding: 0,
};

export function PagedReader({
  pages,
  page,
  onPageChange,
  bookmarks,
  onToggleBookmark,
  label = 'PagedReader',
}: PagedReaderProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const total = pages.length;
  const marked = bookmarks.has(page);
  const content = pages[page];

  const go = (target: number) => {
    if (target < 0 || target >= total || target === page) return;
    onPageChange(target);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(page + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(page - 1);
    }
  };

  return (
    <div style={WRAP}>
      <div style={HEAD}>
        <span style={PROGRESS}>{`${page + 1} of ${total}`}</span>
      </div>
      <div
        role="group"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{
          outline: 'none',
          borderRadius: 'calc(8px * var(--sf))',
        }}
      >
        <div style={PAGE}>{content}</div>
      </div>
      <div style={BAR}>
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => go(page - 1)}
          style={BTN}
        >
          Previous
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => go(page + 1)}
          style={BTN}
        >
          Next
        </button>
        <span
          id={`${uid}-bm-lbl`}
          aria-hidden="true"
          style={HIDDEN_LBL}
        >
          {marked ? 'Marked' : 'Mark'}
        </span>
        <button
          type="button"
          aria-label="Bookmark"
          aria-labelledby={`${uid}-bm-lbl`}
          aria-pressed={marked}
          onClick={() => onToggleBookmark(page)}
          style={{ ...BTN, ...(marked ? BTN_ACTIVE : undefined) }}
        >
          {marked ? 'Marked' : 'Mark'}
        </button>
      </div>
    </div>
  );
}
