// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/tree-outline 0.1.0: snapshot of lacuna-components TreeOutline at ecef1e3 by sync-toolbox-components.py; a change gets a new version.
import { Fragment, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Card } from '@lacuna/ui';
import { useDragReorder } from '@lacuna/use-drag-reorder';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export interface TreeOutlineProps {
  nodes: TreeNode[];
  onReorder?: (nodeId: string, direction: 'up' | 'down' | 'indent' | 'outdent') => void;
  onToggle?: (nodeId: string, expanded: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(8px * var(--sf))',
  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  borderRadius: 'calc(2px * var(--sf))',
  outline: 'none',
};

const markerStyle: CSSProperties = {
  display: 'inline-block',
  width: 'calc(14px * var(--tf))',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink-60)',
};

const treeStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  padding: 'calc(8px * var(--sf))',
  color: 'var(--ink)',
};

export function TreeOutline(props: TreeOutlineProps): ReactNode {
  const { nodes, onReorder, onToggle, disabled, label, className, style, children } = props;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => initialExpanded(nodes));
  const refs = useRef(new Map<string, HTMLElement>());
  const firstId = nodes[0]?.id;
  const { moveItem } = useDragReorder({ listCount: 1 });

  function toggle(id: string, next: boolean): void {
    setExpanded((prev) => {
      const nextSet = new Set(prev);
      if (next) nextSet.add(id);
      else nextSet.delete(id);
      return nextSet;
    });
    onToggle?.(id, next);
  }

  function dispatchReorder(nodeId: string, direction: 'up' | 'down' | 'indent' | 'outdent'): void {
    if (disabled) return;
    moveItem(0, 0, 0, 0);
    onReorder?.(nodeId, direction);
  }

  function focusNode(id: string | undefined): void {
    if (id === undefined) return;
    refs.current.get(id)?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>, node: TreeNode, level: number, siblingIndex: number, isLast: boolean): void {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const expandedNow = expanded.has(node.id);
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !expandedNow) toggle(node.id, true);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && expandedNow) toggle(node.id, false);
        else if (level > 1) focusNode(parentOf(nodes, node.id)?.id);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (siblingIndex > 0) focusNode(siblingId(nodes, node.id, siblingIndex - 1));
        else if (level > 1) focusNode(parentOf(nodes, node.id)?.id);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (hasChildren && expandedNow) focusNode(node.children?.[0]?.id);
        else if (!isLast) focusNode(nextVisibleId(nodes, node.id, expanded));
        break;
      case 'Enter':
        e.preventDefault();
        if (hasChildren) toggle(node.id, !expandedNow);
        break;
      case 'Home':
        e.preventDefault();
        focusNode(nodes[0]?.id);
        break;
      case 'End':
        e.preventDefault();
        focusNode(lastVisibleId(nodes));
        break;
      default:
        return;
    }
    if (e.shiftKey) {
      if (e.key === 'ArrowUp') dispatchReorder(node.id, 'up');
      else if (e.key === 'ArrowDown') dispatchReorder(node.id, 'down');
      else if (e.key === 'ArrowRight' && level > 1) dispatchReorder(node.id, 'indent');
      else if (e.key === 'ArrowLeft' && level > 1) dispatchReorder(node.id, 'outdent');
    }
  }

  function renderNode(node: TreeNode, level: number, siblingIndex: number, isLast: boolean): ReactNode {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const expandedNow = expanded.has(node.id);
    return (
      <li key={node.id} role="none">
        <div
          role="treeitem"
          ref={(el) => {
            if (el !== null) refs.current.set(node.id, el);
            else refs.current.delete(node.id);
          }}
          tabIndex={node.id === firstId ? 0 : -1}
          aria-level={level}
          aria-expanded={hasChildren ? expandedNow : false}
          aria-label={node.label}
          style={itemStyle}
          onKeyDown={(e) => handleKeyDown(e, node, level, siblingIndex, isLast)}
        >
          <span style={markerStyle} aria-hidden="true">
            {hasChildren ? (expandedNow ? '−' : '+') : '·'}
          </span>
          <span>{node.label}</span>
        </div>
        {hasChildren && expandedNow && (
          <ul role="group" style={{ margin: 0, paddingLeft: 'calc(16px * var(--sf))', listStyle: 'none' }}>
            {node.children?.map((child, i) =>
              <Fragment key={child.id}>{renderNode(child, level + 1, i, i === (node.children?.length ?? 0) - 1)}</Fragment>
            )}
          </ul>
        )}
      </li>
    );
  }

  return (
    <Card mono="Tree" title={label} className={className} style={style}>
      <div role="tree" aria-label={label} style={treeStyle}>
        <ul role="none" style={{ margin: 0, listStyle: 'none' }}>
          {nodes.map((node, i) => renderNode(node, 1, i, i === nodes.length - 1))}
        </ul>
      </div>
      {children}
    </Card>
  );
}

function initialExpanded(nodes: TreeNode[]): Set<string> {
  const set = new Set<string>();
  for (const node of nodes) {
    const kids = node.children;
    if (kids !== undefined && kids.length > 0) set.add(node.id);
  }
  return set;
}

function parentOf(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    const kids = node.children;
    if (kids === undefined) continue;
    if (kids.some((child) => child.id === id)) return node;
    const found = parentOf(kids, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

function siblingId(nodes: TreeNode[], id: string, index: number): string | undefined {
  for (const node of nodes) {
    const kids = node.children;
    if (kids === undefined) continue;
    if (kids.some((child) => child.id === id)) return kids[index]?.id;
    const found = siblingId(kids, id, index);
    if (found !== undefined) return found;
  }
  return undefined;
}

function visibleIds(nodes: TreeNode[], expanded: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const collect = (list: TreeNode[]) => {
    for (const node of list) {
      out.push(node.id);
      const kids = node.children;
      if (kids !== undefined && kids.length > 0 && expanded.has(node.id)) collect(kids);
    }
  };
  collect(nodes);
  return out;
}

function nextVisibleId(nodes: TreeNode[], id: string, expanded: ReadonlySet<string>): string | undefined {
  const ids = visibleIds(nodes, expanded);
  const index = ids.indexOf(id);
  return index >= 0 ? ids[index + 1] : undefined;
}

function lastVisibleId(nodes: TreeNode[]): string | undefined {
  const out: string[] = [];
  const collect = (list: TreeNode[]) => {
    for (const node of list) {
      out.push(node.id);
      const kids = node.children;
      if (kids !== undefined && kids.length > 0) collect(kids);
    }
  };
  collect(nodes);
  return out[out.length - 1];
}
