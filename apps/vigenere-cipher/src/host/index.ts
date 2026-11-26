// Every host call for this app goes through this adapter.
// The shipped mock is backed by localStorage; a real host API takes the
// same shape, so swapping it here is the only change needed.
export {
  listHistory,
  addHistory,
  removeHistory,
  type HistoryEntry,
} from './mock'
