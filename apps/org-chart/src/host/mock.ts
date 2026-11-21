import { createMockRecordStore } from '@lacuna/host-mock'

export interface Role {
  id: string
  name: string
  parentId: string | null
}

const KEY = 'lacuna.org-chart.roles'

export function isRole(value: unknown): value is Role {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.parentId === null || typeof v.parentId === 'string')
  )
}

export const store = createMockRecordStore<Role>({
  key: KEY,
  validate: isRole,
})

export function loadRoles(): Role[] {
  return store.list()
}

export function saveRoles(roles: Role[]): void {
  store.replaceAll(roles)
}
