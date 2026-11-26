import { useLocalRecord } from '@lacuna/use-local-record'
import type { LibraryState } from './index'

const DEFAULT_STATE: LibraryState = { items: [] }

export function useLibrary() {
  return useLocalRecord<LibraryState>({
    key: 'lacuna.screen-recorder.library',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })
}
