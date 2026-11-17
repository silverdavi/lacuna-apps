// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Document record shapes. One definition, shared by the editor in @lacuna/ui
// and the record store in apps/demo.

export interface DocComment {
  who: string
  when: string
  text: string
  resolved?: boolean
}

export interface DocRevision {
  id: string
  label: string
  by: string
  at: string
  summary: string
  html: string
}

export interface DocModel {
  /** Absent on records saved before the model was versioned; read as 1. */
  schemaVersion?: 1
  title: string
  /** HTML body (paragraphs as <p>…</p>). Sanitize before it reaches the DOM. */
  html: string
  comments: DocComment[]
  /** Newest first. */
  revisions?: DocRevision[]
}

/** The demo store's name for DocModel. */
export type DocData = DocModel
