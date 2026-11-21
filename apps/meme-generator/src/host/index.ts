import { loadMemeRecord, saveMemeRecord, type MemeRecord } from './mock'

export type { MemeRecord }

export const host = {
  loadMeme(): MemeRecord | null {
    return loadMemeRecord()
  },
  saveMeme(record: MemeRecord): void {
    saveMemeRecord(record)
  },
}
