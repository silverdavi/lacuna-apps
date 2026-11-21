import { loadMindMap, saveMindMap, type MindMapRecord } from './mock'

export type { MapEdge, MapNode, MapStroke, MindMapRecord, StrokePoint } from './mock'

export const host = {
  load(): MindMapRecord | null {
    return loadMindMap()
  },
  save(record: Omit<MindMapRecord, 'id' | 'savedAt'>): MindMapRecord {
    return saveMindMap(record)
  },
}
