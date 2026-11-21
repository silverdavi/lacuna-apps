import { mockStore } from './mock'
import type { RecordStore } from './types'

export type { ConversionRecord, Encoding, RecordStore } from './types'
export { STORAGE_KEY } from './types'

export const records: RecordStore = mockStore
