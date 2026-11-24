// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// time-tracker state in localStorage (via @lacuna/host-mock) so the whole app
// runs offline. The host object and state shape live in ./index.
export * from './index'
