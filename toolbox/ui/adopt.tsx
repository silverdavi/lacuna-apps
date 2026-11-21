// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// One-line mount for the five apps that predate AppShell:
// markdown-table, pomodoro, receipt-packet, tex-snippet, tip-split.
// Do not rewrite those apps in place. A later rebuild replaces the page with:
//   <Adopt name="Tip Split" hue="green" category="Finance"><ExistingScreen /></Adopt>
// Adopt is AppShell. The app passes name, hue, and category, then deletes its own header.
import type { ReactNode } from 'react'
import type { IconName } from './icons'
import { AppShell, type Hue } from './kit'

export function Adopt({ name, hue = 'brown', category = 'Apps', icon = 'grid', children }: {
  /** Window title. Same prop AppShell calls name. */
  name: string
  hue?: Hue
  category?: string
  icon?: IconName
  children: ReactNode
}) {
  return <AppShell name={name} hue={hue} category={category} icon={icon}>{children}</AppShell>
}
