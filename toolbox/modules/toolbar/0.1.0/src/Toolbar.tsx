// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/toolbar 0.1.0: snapshot of lacuna-components Toolbar at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useHotkeys } from '@lacuna/use-hotkeys';

export interface ToolbarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  action: () => void;
  hotkey?: string;
  type?: 'button' | 'toggle';
  active?: boolean;
  disabled?: boolean;
}

export interface ToolbarProps {
  items: ToolbarItem[];
  maxVisible?: number;
  onOverflowChange?: (overflowing: ToolbarItem[]) => void;
  ariaLabel?: string;
}

function hotkeyToBinding(hotkey: string): string {
  return hotkey
    .replace(/Cmd|Meta/gi, 'mod')
    .replace(/Ctrl|Control/gi, 'ctrl')
    .toLowerCase();
}

function hotkeyTitle(label: string, hotkey: string): string {
  return `${label} (${hotkey})`;
}

function buttonStyle(isActive: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'calc(4px * var(--sf))',
    padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    borderRadius: 'calc(4px * var(--sf))',
    background: isActive ? 'var(--ink)' : 'var(--paper)',
    color: isActive ? 'var(--paper)' : 'var(--ink)',
    cursor: 'pointer',
  };
}

const MORE_ID = '__more__';

export function Toolbar(props: ToolbarProps): ReactNode {
  const { items, maxVisible, onOverflowChange, ariaLabel } = props;
  const visible = maxVisible !== undefined ? items.slice(0, maxVisible) : items;
  const overflow = maxVisible !== undefined ? items.slice(maxVisible) : [];

  const [overflowOpen, setOverflowOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOverflowChange?.(overflow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, maxVisible]);

  useEffect(() => {
    if (!overflowOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOverflowOpen(false);
        moreRef.current?.focus();
      }
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (moreRef.current && moreRef.current.contains(target)) return;
      setOverflowOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [overflowOpen]);

  const focusButton = useCallback((id: string) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    toolbar.querySelector<HTMLButtonElement>(`[data-toolbar-id="${id}"]`)?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const current = toolbar.querySelector<HTMLElement>(':focus');
      if (!current) return;
      const ids = [
        ...visible.map((item) => item.id),
        ...(overflow.length > 0 ? [MORE_ID] : []),
      ];
      const pos = ids.indexOf(current.getAttribute('data-toolbar-id') ?? '');
      if (pos === -1) return;
      const next =
        event.key === 'ArrowRight'
          ? ids[(pos + 1) % ids.length]
          : ids[(pos - 1 + ids.length) % ids.length];
      focusButton(next ?? '');
    },
    [visible, overflow.length, focusButton]
  );

  const { bindings } = useHotkeys(
    items
      .filter((item) => item.hotkey !== undefined && !item.disabled)
      .map((item) => ({
        keys: hotkeyToBinding(item.hotkey as string),
        handler: () => item.action(),
        description: item.label,
      }))
  );

  const activateItem = useCallback(
    (item: ToolbarItem) => {
      if (item.disabled) return;
      setOverflowOpen(false);
      item.action();
    },
    []
  );

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={ariaLabel ?? 'Toolbar'}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
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
      {visible.map((item) => (
        <ToolButton
          key={item.id}
          item={item}
          bindings={bindings}
          onActivate={activateItem}
        />
      ))}
      {overflow.length > 0 && (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            ref={moreRef}
            type="button"
            data-toolbar-id={MORE_ID}
            aria-label="More tools"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            style={buttonStyle(overflowOpen)}
            onClick={() => setOverflowOpen((open) => !open)}
          >
            More tools
          </button>
          {overflowOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="More tools"
              style={{
                position: 'absolute',
                top: 'calc(100% + calc(4px * var(--sf)))',
                left: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(2px * var(--sf))',
                padding: 'calc(4px * var(--sf))',
                background: 'var(--paper)',
                border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                borderRadius: 'calc(4px * var(--sf))',
                minWidth: 'calc(120px * var(--sf))',
              }}
            >
              {overflow.map((item) => (
                <ToolButton
                  key={item.id}
                  item={item}
                  bindings={bindings}
                  inMenu
                  onActivate={activateItem}
                />
              ))}
            </div>
          )}
        </span>
      )}
    </div>
  );
}

function ToolButton({
  item,
  bindings,
  inMenu,
  onActivate,
}: {
  item: ToolbarItem;
  bindings: ReadonlyArray<{ keys: string }>;
  inMenu?: boolean;
  onActivate: (item: ToolbarItem) => void;
}) {
  const isToggle = item.type === 'toggle';
  const isActive = isToggle && Boolean(item.active);
  const style: CSSProperties = {
    ...buttonStyle(isActive),
    ...(item.disabled ? { cursor: 'not-allowed', opacity: 0.5 } : {}),
    ...(inMenu ? { textAlign: 'left', width: '100%' } : {}),
  };
  const hotkey = item.hotkey;
  const hasHotkey =
    hotkey !== undefined &&
    bindings.some((b) => b.keys === hotkeyToBinding(hotkey));

  return (
    <button
      type="button"
      role={inMenu ? 'menuitem' : undefined}
      data-toolbar-id={item.id}
      aria-label={item.label}
      aria-pressed={isToggle ? Boolean(item.active) : undefined}
      aria-disabled={item.disabled || undefined}
      title={hotkey !== undefined ? hotkeyTitle(item.label, hotkey) : undefined}
      aria-keyshortcuts={hasHotkey ? hotkey : undefined}
      style={style}
      onClick={() => onActivate(item)}
    >
      {item.icon}
      <span>{item.label}</span>
    </button>
  );
}
