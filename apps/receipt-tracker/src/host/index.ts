// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// The app's single door to records: swap mock.ts for the host API without touching the UI.
export { receipts, settings } from './mock'
export type { Receipt } from './mock'

export function syncReceipts(): Promise<void> {
  return Promise.resolve()
}
