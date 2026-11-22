// Every host call for this app goes through this adapter.
// The shipped mock is a @lacuna/host-mock record store (localStorage-backed,
// safe against corrupt storage); a real host API takes the same shape, so
// swapping it here is the only change needed.
export {
  listRecent,
  addRecent,
  clearRecent,
  MAX_RECENT,
  type ConversionRecord,
} from './mock'
