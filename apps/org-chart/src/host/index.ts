import { loadRoles, saveRoles, type Role } from './mock'

export type { Role }
export { loadRoles }

let nextId = 1

function newId(): string {
  return `role-${Date.now()}-${nextId++}`
}

export function addRole(name: string, parentId: string | null): Role[] {
  const role: Role = { id: newId(), name, parentId }
  const roles = [...loadRoles(), role]
  saveRoles(roles)
  return roles
}

export function removeRole(id: string): Role[] {
  const kept = loadRoles().filter((role) => role.id !== id)
  // Children of a removed role become top-level instead of dangling.
  const roles = kept.map((role) =>
    role.parentId === id ? { ...role, parentId: null } : role,
  )
  saveRoles(roles)
  return roles
}
