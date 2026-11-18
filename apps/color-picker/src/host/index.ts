import { loadColorRecord, saveColorRecord, type ColorRecord } from './mock'

export type { ColorRecord }

export const host = {
  load(): ColorRecord | null {
    return loadColorRecord()
  },
  save(record: ColorRecord): void {
    saveColorRecord(record)
  },
}
