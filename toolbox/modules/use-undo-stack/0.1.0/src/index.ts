// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-undo-stack 0.1.0: snapshot of lacuna-components useUndoStack at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useState, useCallback } from 'react'

export type UndoStack<T> = {
  value: T
  set: (next: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  reset: (value: T) => void
  canUndo: boolean
  canRedo: boolean
}

export function useUndoStack<T>(
  initial: T,
  options?: { limit?: number }
): UndoStack<T> {
  const limit = options?.limit
  const [state, setState] = useState<{
    past: T[]
    value: T
    future: T[]
  }>({ past: [], value: initial, future: [] })

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((s) => {
        const resolved =
          typeof next === 'function' ? (next as (prev: T) => T)(s.value) : next
        if (Object.is(resolved, s.value)) return s
        const past = [...s.past, s.value]
        if (limit !== undefined && past.length > limit) past.shift()
        return { past, value: resolved, future: [] }
      })
    },
    [limit]
  )

  const undo = useCallback(() => {
    setState((s) => {
      const prev = s.past[s.past.length - 1]
      if (prev === undefined) return s
      const past = s.past.slice(0, -1)
      return { past, value: prev, future: [s.value, ...s.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setState((s) => {
      const next = s.future[0]
      if (next === undefined) return s
      const future = s.future.slice(1)
      return { past: [...s.past, s.value], value: next, future }
    })
  }, [])

  const reset = useCallback((value: T) => {
    setState({ past: [], value, future: [] })
  }, [])

  return {
    value: state.value,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  }
}
