// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// plant-care's plants and waterings in localStorage so the whole app runs offline.
import {
  KEY,
  emptyState,
  loadState,
  makeId,
  saveState,
  type Plant,
  type PlantState,
  type WaterLogEntry,
} from './index'

export const spaceId = 'mock-plant-care'
export { KEY, emptyState, makeId }

export function isPlant(v: unknown): v is Plant {
  return typeof v === 'object' && v !== null && 'name' in (v as object)
}

export const host = {
  read(): PlantState {
    return loadState()
  },

  write(next: PlantState): PlantState {
    saveState(next)
    return next
  },

  addPlant(name: string, intervalDays: number): PlantState {
    const state = loadState()
    const plant: Plant = {
      id: makeId(),
      name: name.trim(),
      intervalDays: Math.max(1, Math.round(intervalDays)),
      addedAt: Date.now(),
      lastWatered: null,
    }
    const next: PlantState = { ...state, plants: [...state.plants, plant] }
    saveState(next)
    return next
  },

  deletePlant(plantId: string): PlantState {
    const state = loadState()
    const next: PlantState = {
      plants: state.plants.filter((p) => p.id !== plantId),
      log: state.log.filter((e) => e.plantId !== plantId),
    }
    saveState(next)
    return next
  },

  water(plantId: string, date: string): PlantState {
    const state = loadState()
    const plant = state.plants.find((p) => p.id === plantId)
    if (!plant) return state
    const entry: WaterLogEntry = {
      id: makeId(),
      plantId: plant.id,
      plantName: plant.name,
      date,
      wateredAt: Date.now(),
    }
    const next: PlantState = {
      plants: state.plants.map((p) =>
        p.id === plant.id ? { ...p, lastWatered: date } : p,
      ),
      log: [...state.log, entry],
    }
    saveState(next)
    return next
  },

  clear(): PlantState {
    const empty = emptyState()
    saveState(empty)
    return empty
  },
}
