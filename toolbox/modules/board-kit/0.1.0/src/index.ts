// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/board-kit 0.1.0: snapshot of lacuna-components BoardKit at c16104e by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties } from 'react'
import { BoardKit as BoardKitImpl } from './BoardKit'

export { BoardKitImpl as BoardKit }

export interface BoardCard {
  id?: string
  title: string
  description?: string
  tags?: string[]
  columnId: string
}

export interface BoardColumn {
  id: string
  title: string
  wipLimit?: number
}

export interface BoardKitProps {
  /** Key for localStorage persistence of the board's cards. */
  boardKey: string
  /** The board's columns, in display order. */
  columns: BoardColumn[]
  /** Initial cards. Persisted to localStorage after. */
  initialCards?: BoardCard[]
  /** Suggested tags offered in the card editor's tag input. */
  tagSuggestions?: string[]
  /** Placeholder for the card editor's tag input. */
  tagPlaceholder?: string
  /** Extra styles merged onto the kit root. */
  style?: CSSProperties
}
