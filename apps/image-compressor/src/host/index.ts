import { localStorageMock, defaultOptions } from './mock'
import type { CompressOptions } from './mock'

// All persistence for the app goes through this module. In production this
// would delegate to the host API (records); today the mock keeps the last used
// options in localStorage so they survive a reload.

export const storage = localStorageMock

export function loadOptions(): CompressOptions {
  return storage.load() ?? defaultOptions
}

export function saveOptions(options: CompressOptions): void {
  storage.save(options)
}

export type { CompressOptions, ImageFormat } from './mock'
