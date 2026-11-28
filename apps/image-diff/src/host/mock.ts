import { saveBlob } from '@lacuna/file-save-open'

const KEY = 'lacuna.image-diff.settings'

export type Settings = { threshold: number; tab: string }

// Host mock: only the threshold and the last tab are stored, never an image.
export const mockHost = {
  readSettings(fallback: Settings): Settings {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (raw && Number.isFinite(raw.threshold) && typeof raw.tab === 'string') {
        return { threshold: Math.min(64, Math.max(0, Math.round(raw.threshold))), tab: raw.tab }
      }
    } catch {
      // storage unavailable or malformed; use the defaults
    }
    return fallback
  },
  writeSettings(settings: Settings) {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable; settings last for this session only
    }
  },
  /** files.save: the host would show a save dialog; the mock downloads through an object URL. */
  saveFile(blob: Blob, filename: string) {
    saveBlob(blob, { filename, mimeType: blob.type })
  },
}
