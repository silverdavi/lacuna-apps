// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// editor state and the analysis history in localStorage so the whole app runs
// offline. Every host call for this app goes through this adapter; a real
// host API takes the same shape, so swapping it here is the only change
// needed.

import { store, type Analysis, type EditorState } from './mock'

export const spaceId = 'mock-readability-score'

export const host = {
  loadEditor(): EditorState {
    return store.editor.get()
  },

  saveEditor(state: EditorState) {
    store.editor.set(state)
  },

  listAnalyses(): Analysis[] {
    return store.analyses.list()
  },

  addAnalysis(text: string, flesch: number): Analysis {
    return store.analyses.add({ text, flesch, at: Date.now() })
  },

  clearHistory() {
    store.analyses.clear()
  },
}

export type { Analysis, EditorState }
