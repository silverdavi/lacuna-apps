import { createMockRecordStore } from '@lacuna/host-mock'

export interface Account {
  id: string
  label: string
  secret: string
}

const KEY = 'lacuna.totp-authenticator.mock.v1'

const store = createMockRecordStore<Account>({
  key: KEY,
  idPrefix: 'a',
  validate: (v: unknown): v is Account => {
    const a = v as { id?: unknown; label?: unknown; secret?: unknown } | null
    return (
      !!a &&
      typeof a.id === 'string' &&
      typeof a.label === 'string' &&
      typeof a.secret === 'string'
    )
  },
})

export { store }
