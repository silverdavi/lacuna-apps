import { createHistory, type DecodedToken, type HistoryStore } from './mock'

export type { DecodedToken, HistoryStore } from './mock'

const store: HistoryStore = createHistory()

export const history = {
  list: (): DecodedToken[] => store.list(),
  add: (entry: DecodedToken) => store.add(entry),
}
