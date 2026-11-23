import { classStore, DAYS, type Class, type Day } from './mock'

export type { Class, Day }
export { DAYS }

const store = classStore()

export function listClasses(): Class[] {
  return store.list()
}

export function addClass(input: Omit<Class, 'id'>): Class {
  return store.add(input)
}

export function removeClass(id: string): boolean {
  return store.remove(id)
}
