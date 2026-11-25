import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type GradientKind = 'linear' | 'radial'

export interface GradientStop {
  color: string
  position: number
}

export interface SavedGradient {
  id: string
  name: string
  kind: GradientKind
  angle: number
  stops: GradientStop[]
}

export interface WorkState {
  name: string
  kind: GradientKind
  angle: number
  angleDraft: string
  stops: GradientStop[]
}

export const DEFAULT_WORK: WorkState = {
  name: '',
  kind: 'linear',
  angle: 90,
  angleDraft: '90',
  stops: [],
}

function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
}

function isStop(v: unknown): v is GradientStop {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  return isHexColor(o.color) && typeof o.position === 'number' && o.position >= 0 && o.position <= 100
}

function isKind(v: unknown): v is GradientKind {
  return v === 'linear' || v === 'radial'
}

function isWork(v: unknown): v is WorkState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  return (
    typeof o.name === 'string' &&
    isKind(o.kind) &&
    typeof o.angle === 'number' &&
    typeof o.angleDraft === 'string' &&
    Array.isArray(o.stops) &&
    o.stops.every(isStop)
  )
}

function isSaved(v: unknown): v is SavedGradient {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    isKind(o.kind) &&
    typeof o.angle === 'number' &&
    Array.isArray(o.stops) &&
    o.stops.every(isStop)
  )
}

const workStore = createMockValue<WorkState>({
  key: 'lacuna.gradient-generator.work',
  fallback: DEFAULT_WORK,
  validate: isWork,
})

const libraryStore = createMockRecordStore<SavedGradient>({
  key: 'lacuna.gradient-generator.library',
  validate: isSaved,
  idPrefix: 'g',
})

export function loadWork(): WorkState {
  return workStore.get()
}

export function saveWork(state: WorkState): void {
  workStore.set(state)
}

export function listGradients(): SavedGradient[] {
  return libraryStore.list()
}

export function saveGradient(record: Omit<SavedGradient, 'id'>): SavedGradient {
  return libraryStore.add(record)
}

export function deleteGradient(id: string): boolean {
  return libraryStore.remove(id)
}
