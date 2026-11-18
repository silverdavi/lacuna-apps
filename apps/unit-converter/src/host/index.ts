export type ConversionRecord = {
  id: string
  category: string
  fromUnit: string
  toUnit: string
  fromValue: number
  toValue: number
}

export type HostApi = {
  listRecent(): Promise<ConversionRecord[]>
  addRecent(record: ConversionRecord): Promise<void>
}

import { createMockHost } from './mock'

export const host: HostApi = createMockHost()
