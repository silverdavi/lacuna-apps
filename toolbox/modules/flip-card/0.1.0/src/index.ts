// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/flip-card 0.1.0: snapshot of lacuna-components FlipCard at f879fb0 by sync-toolbox-components.py; a change gets a new version.
export interface FlipCardProps {
  front: string
  back: string
  onGrade?: (grade: number) => void
  disabled?: boolean
}

export { FlipCard } from './FlipCard'
