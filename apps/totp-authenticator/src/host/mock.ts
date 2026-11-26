export interface Account {
  id: string
  label: string
  secret: string
}

const KEY = 'lacuna.totp-authenticator.mock.v1'

let seq = 0

function load(): Account[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(accounts: Account[]) {
  window.localStorage.setItem(KEY, JSON.stringify(accounts))
}

function makeId(): string {
  seq += 1
  return `a-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const store = {
  list(): Account[] {
    return load()
  },

  add(label: string, secret: string): Account {
    const accounts = load()
    const account: Account = { id: makeId(), label, secret }
    accounts.push(account)
    save(accounts)
    return account
  },

  remove(id: string) {
    save(load().filter((a) => a.id !== id))
  },
}
