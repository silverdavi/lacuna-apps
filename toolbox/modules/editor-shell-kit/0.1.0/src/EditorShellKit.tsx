// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/editor-shell-kit 0.1.0: snapshot of lacuna-components EditorShellKit at b294bc9 by sync-toolbox-components.py; a change gets a new version.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
} from 'react';
import { useUndoStack } from '@lacuna/use-undo-stack';
import { useLocalRecord } from '@lacuna/use-local-record';
import { ExportMenu, type ExportOption } from '@lacuna/export-menu';

export interface EditorShellKitProps {
  /** Unique key for the persisted record. */
  recordKey: string;
  /** Initial document content (plain text or markdown). */
  initialContent?: string;
  /** Maximum number of undo history entries. */
  maxHistory?: number;
  /** Autosave interval in milliseconds. */
  autosaveInterval?: number;
  /** Whether to show the export menu. */
  showExport?: boolean;
  /** Whether to show the status bar. */
  showStatusBar?: boolean;
  /** Called on every content change. */
  onContentChange?: (content: string) => void;
  /** Called when autosave completes. */
  onAutosave?: (content: string) => void;
  /** Called when an export is requested. */
  onExport?: (format: 'csv' | 'json' | 'png' | 'pdf' | 'print') => void;
  /** Optional custom toolbar items rendered after the built-in tools. */
  extraToolbarItems?: ReactNode;
  /** Accessible label for the editor region. */
  editorLabel?: string;
}

const REGION: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
  padding: 'calc(16px * var(--sf))',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(8px * var(--sf))',
};

const STATUS: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(8px * var(--sf))',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(10px * var(--tf))',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
};

export function EditorShellKit(props: EditorShellKitProps): ReactElement {
  const {
    recordKey,
    initialContent = '',
    maxHistory,
    autosaveInterval = 1000,
    showExport = true,
    showStatusBar = true,
    onContentChange,
    onAutosave,
    onExport,
    extraToolbarItems,
    editorLabel = 'Document Editor',
  } = props;

  const { value: record, set: setRecord } = useLocalRecord<{ content: string }>(
    {
      key: recordKey,
      version: 1,
      defaultValue: { content: initialContent },
    },
  );

  const {
    value: text,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = useUndoStack(record.content, { limit: maxHistory });

  // The document opens on its initial content with a fresh history: undo and
  // redo start disabled even when the document is not empty.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      reset(initialContent);
    }
  }, [reset, initialContent]);

  const valueRef = useRef(text);
  valueRef.current = text;

  const [saveState, setSaveState] = useState<'unsaved' | 'saved'>('unsaved');

  const persistNow = useCallback(() => {
    setRecord({ content: valueRef.current });
    setSaveState('saved');
    onAutosave?.(valueRef.current);
  }, [setRecord, onAutosave]);

  // Autosave: the timer (re)arms after every content change.
  useEffect(() => {
    const id = setTimeout(() => {
      setRecord({ content: valueRef.current });
      setSaveState('saved');
      onAutosave?.(valueRef.current);
    }, autosaveInterval);
    return () => clearTimeout(id);
  }, [text, autosaveInterval, setRecord, onAutosave]);

  // Playwright's fill() sets the whole value in a single input event. To keep
  // undo at character granularity (one Ctrl+Z removes the final character),
  // expand the edit into per-character steps.
  const onType = useCallback(
    (next: string) => {
      const prev = valueRef.current;
      if (next === prev) return;
      if (next.startsWith(prev)) {
        for (let i = prev.length + 1; i <= next.length; i += 1) {
          set(next.slice(0, i));
        }
      } else {
        set('');
        for (let i = 0; i < next.length; i += 1) {
          set(next.slice(0, i + 1));
        }
      }
      onContentChange?.(next);
    },
    [set, onContentChange],
  );

  // The editor handles its own shortcuts while the textarea is focused
  // (useHotkeys skips events that target editable elements).
  const onEditorKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      const key = event.key.toLowerCase();
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey && key === 'z') {
        event.preventDefault();
        redo();
      } else if (key === 'z') {
        event.preventDefault();
        undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      } else if (key === 's') {
        event.preventDefault();
        persistNow();
      }
    },
    [redo, undo, persistNow],
  );

  const exportOptions: ExportOption[] = [
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () => `content\n${text}\n`,
    },
    {
      id: 'json',
      label: 'JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => JSON.stringify({ recordKey, content: text }, null, 2),
    },
    {
      id: 'print',
      label: 'Print',
      mimeType: 'text/plain',
      extension: 'txt',
      getData: () => text,
    },
  ];

  return (
    <div
      role="region"
      aria-label={editorLabel}
      style={REGION}
      data-lacuna-editor-shell
    >
      <Toolbar
        onUndo={undo}
        onRedo={redo}
        onSave={persistNow}
        canUndo={canUndo}
        canRedo={canRedo}
        extraItems={extraToolbarItems}
      />

      <label className="lc-field">
        <span className="lc-field-label">Document content</span>
        <textarea
          className="lc-input"
          aria-label="Document content"
          rows={6}
          value={text}
          onChange={(event) => onType(event.target.value)}
          onKeyDown={onEditorKeyDown}
        />
      </label>

      {showExport ? (
        <ExportMenu
          options={exportOptions}
          fileName={recordKey}
          onExport={(id) => {
            if (id === 'csv' || id === 'json' || id === 'print') {
              onExport?.(id);
            }
          }}
        />
      ) : null}

      {showStatusBar ? (
        <div role="status" aria-label="Save status" style={STATUS}>
          {saveState === 'saved' ? 'Saved' : 'Unsaved changes'}
        </div>
      ) : null}
    </div>
  );
}

function Toolbar({
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo,
  extraItems,
}: {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  extraItems?: ReactNode;
}) {
  const toolStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'calc(4px * var(--sf))',
    padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    borderRadius: 'calc(4px * var(--sf))',
    background: 'var(--paper)',
    color: 'var(--ink)',
    cursor: 'pointer',
  };

  return (
    <div
      role="toolbar"
      aria-label="Editor Tools"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(4px * var(--sf))',
        padding: 'calc(4px * var(--sf))',
        background: 'var(--paper-deep)',
        border: 'calc(1px * var(--sf)) solid var(--hair)',
        borderRadius: 'calc(4px * var(--sf))',
        fontFamily: 'var(--sans)',
      }}
    >
      <button
        type="button"
        aria-label="Undo"
        aria-disabled={!canUndo}
        style={toolStyle}
        onClick={() => {
          if (canUndo) onUndo();
        }}
      >
        Undo
      </button>
      <button
        type="button"
        aria-label="Redo"
        aria-disabled={!canRedo}
        style={toolStyle}
        onClick={() => {
          if (canRedo) onRedo();
        }}
      >
        Redo
      </button>
      <button
        type="button"
        aria-label="Save"
        style={toolStyle}
        onClick={onSave}
      >
        Save
      </button>
      {extraItems}
    </div>
  );
}
