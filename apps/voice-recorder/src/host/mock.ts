// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Clip {
  id: string
  name: string
  data: string
  mime: string
  size: number
  durationMs: number
  format: string
  createdAt: number
}

export interface Settings {
  format: string
  trimStart: number
  trimEnd: number
}

export type Host = {
  clips: ReturnType<typeof createMockRecordStore<Clip>>
  settings: {
    load(): Settings
    save(value: Settings): void
  }
}

function isClip(value: unknown): value is Clip {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.data === 'string' &&
    typeof c.mime === 'string' &&
    typeof c.size === 'number' &&
    typeof c.durationMs === 'number' &&
    typeof c.format === 'string' &&
    typeof c.createdAt === 'number'
  )
}

const KEY_CLIPS = 'lacuna.voice-recorder.clips'
const KEY_SETTINGS = 'lacuna.voice-recorder.settings'

export function createHost(): Host {
  const clips = createMockRecordStore<Clip>({ key: KEY_CLIPS, validate: isClip, idPrefix: 'clip-' })

  function readSettings(): Settings {
    try {
      const raw = globalThis.localStorage?.getItem(KEY_SETTINGS)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>
        return {
          format: parsed.format === 'MP3' ? 'MP3' : 'WAV',
          trimStart: typeof parsed.trimStart === 'number' ? parsed.trimStart : 0,
          trimEnd: typeof parsed.trimEnd === 'number' ? parsed.trimEnd : 0,
        }
      }
    } catch {
      // fall through to the default
    }
    return { format: 'WAV', trimStart: 0, trimEnd: 0 }
  }

  return {
    clips,
    settings: {
      load: readSettings,
      save(value: Settings) {
        try {
          globalThis.localStorage?.setItem(KEY_SETTINGS, JSON.stringify(value))
        } catch {
          // storage unavailable: settings stay in memory for this page
        }
      },
    },
  }
}
