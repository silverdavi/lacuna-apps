// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// The app's persistence boundary. The mock is a localStorage store from the host-mock module.
import {
  createWarrantyStore,
  statusLabel,
  statusOf,
  REFERENCE_TODAY,
  type Warranty,
  type WarrantyStatus,
} from './mock'

const store = createWarrantyStore()

export type { Warranty, WarrantyStatus }
export { statusLabel, statusOf, REFERENCE_TODAY }

export function listWarranties(): Warranty[] {
  return store.list()
}

export function addWarranty(data: Omit<Warranty, 'id'>): Warranty {
  return store.add(data)
}

export function updateWarranty(id: string, patch: Partial<Omit<Warranty, 'id'>>): Warranty | undefined {
  return store.update(id, patch)
}

export function removeWarranty(id: string): boolean {
  return store.remove(id)
}
