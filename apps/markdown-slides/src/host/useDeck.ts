import { useLocalRecord } from '@lacuna/use-local-record'
import { DECK_RECORD_KEY, DECK_RECORD_VERSION, DEFAULT_DECK, type SlideDeckRecord } from './index'

export function useDeck() {
  return useLocalRecord<SlideDeckRecord>({
    key: DECK_RECORD_KEY,
    version: DECK_RECORD_VERSION,
    defaultValue: DEFAULT_DECK
  })
}
