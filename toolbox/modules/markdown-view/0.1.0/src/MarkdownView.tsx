// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/markdown-view 0.1.0: snapshot of lacuna-components MarkdownView at 5a2695c by sync-toolbox-components.py; a change gets a new version.
import { type CSSProperties, type ReactNode, useEffect, useMemo } from 'react'
import { markdownToHtml } from '@lacuna/markdown-to-html'

export interface MarkdownViewProps {
  source: string
  onTaskToggle?: (index: number, checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

type TaskItem = { li: HTMLLIElement; span: HTMLSpanElement }

function buildTree(html: string): { container: HTMLElement; tasks: TaskItem[] } {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html')
  const body = doc.body
  const container = document.createElement('div')
  while (body.firstElementChild !== null) {
    container.appendChild(document.adoptNode(body.firstElementChild))
  }
  const tasks: TaskItem[] = []
  container.querySelectorAll('li').forEach((li) => {
    const input = li.querySelector('input[type="checkbox"]')
    if (input === null) return
    const checked = input.hasAttribute('checked')
    const textNode = input.nextSibling
    input.remove()
    const text = (textNode?.textContent ?? '').trim()
    const span = document.createElement('span')
    span.setAttribute('role', 'checkbox')
    span.setAttribute('aria-checked', checked ? 'true' : 'false')
    span.setAttribute('aria-label', text)
    span.setAttribute('tabindex', '0')
    span.setAttribute('data-task-index', String(tasks.length))
    if (checked) span.style.textDecoration = 'line-through'
    span.textContent = text
    li.append(span)
    tasks.push({ li, span })
  })
  return { container, tasks }
}

export function MarkdownView({ source, onTaskToggle, disabled = false, label, className, style, children }: MarkdownViewProps): ReactNode {
  const view = useMemo(() => {
    const { container, tasks } = buildTree(markdownToHtml(source, { taskLists: true, tables: true }))
    container.querySelectorAll('table').forEach((table) => table.setAttribute('role', 'table'))
    return { container, tasks }
  }, [source])
  const tasksKey = view.tasks.map((t) => t.span.getAttribute('aria-label') ?? '').join('\u0001')

  useEffect(() => {
    const bound: Array<() => void> = []
    for (const t of view.tasks) {
      const span = t.span
      const index = Number(span.getAttribute('data-task-index'))
      const toggle = () => {
        const next = span.getAttribute('aria-checked') !== 'true'
        span.setAttribute('aria-checked', next ? 'true' : 'false')
        span.style.textDecoration = next ? 'line-through' : ''
        onTaskToggle?.(index, next)
      }
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        if (disabled) return
        event.preventDefault()
        toggle()
      }
      const onClick = (event: MouseEvent) => {
        if (event.detail === 0) return
        if (disabled) return
        event.preventDefault()
        toggle()
      }
      span.addEventListener('keydown', onKey)
      span.addEventListener('click', onClick)
      bound.push(() => {
        span.removeEventListener('keydown', onKey)
        span.removeEventListener('click', onClick)
      })
    }
    return () => {
      for (const unbind of bound) unbind()
    }
  }, [view, tasksKey, disabled, onTaskToggle])

  return (
    <div
      role="region"
      aria-label={label}
      className={`lc-markdown-view${className ? ` ${className}` : ''}`}
      style={style}
      ref={(el) => {
        if (el === null) return
        if (el.firstChild !== view.container && view.container.parentNode === null) {
          el.replaceChildren(view.container)
        }
      }}
    >
      {children}
    </div>
  )
}
