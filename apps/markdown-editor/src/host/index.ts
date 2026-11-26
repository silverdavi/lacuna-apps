// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { docStore } from './mock'

export function getDocument(): string {
  return docStore.get()
}

export function setDocument(value: string): void {
  docStore.set(value)
}
