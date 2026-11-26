// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// All host calls live behind this directory; src/host/mock.ts is the localStorage mock the app runs on.
import { useLocalRecord } from '@lacuna/use-local-record'

export type ImageRecord = {
  id: string
  name: string
  width: number
  height: number
}

export type PageSize = 'A4' | 'Letter'

export type PdfSettings = {
  pageSize: PageSize
}

const DEFAULT_SETTINGS: PdfSettings = { pageSize: 'A4' }

export const IMAGE_KEY = 'image-to-pdf-images'
export const SETTINGS_KEY = 'image-to-pdf-settings'

export function useImages(): [ImageRecord[], (updater: (images: ImageRecord[]) => ImageRecord[]) => void] {
  const { value, set } = useLocalRecord<{ version: 1; images: ImageRecord[] }>({
    key: IMAGE_KEY,
    version: 1,
    defaultValue: { version: 1, images: [] },
  })
  return [value.images, (updater) => set((current) => ({ version: 1, images: updater(current.images) }))]
}

export function useSettings(): [PdfSettings, (updater: (settings: PdfSettings) => PdfSettings) => void] {
  const { value, set } = useLocalRecord<PdfSettings>({
    key: SETTINGS_KEY,
    version: 1,
    defaultValue: DEFAULT_SETTINGS,
  })
  return [value, set]
}
