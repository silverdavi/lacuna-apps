import {
  createMemoryStorage,
  createMockRecordStore,
  createMockValue,
} from '@lacuna/host-mock'

export interface Commit {
  id: string
  message: string
}

export interface Prefs {
  useTaskList: boolean
}

const storage = createMemoryStorage()

const commitStore = createMockRecordStore<Commit>({
  key: 'changelog.commits',
  storage,
  validate: (v): v is Commit =>
    typeof (v as Commit).id === 'string' &&
    typeof (v as Commit).message === 'string',
})

const prefs = createMockValue<Prefs>({
  key: 'changelog.prefs',
  fallback: { useTaskList: true },
  storage,
  validate: (v): v is Prefs =>
    typeof (v as Prefs).useTaskList === 'boolean',
})

export const host = {
  listCommits(): Commit[] {
    return commitStore.list()
  },
  addCommit(message: string): Commit {
    return commitStore.add({ message })
  },
  removeCommit(id: string): boolean {
    return commitStore.remove(id)
  },
  clearCommits(): void {
    commitStore.clear()
  },
  getPrefs(): Prefs {
    return prefs.get()
  },
  setPrefs(value: Prefs): void {
    prefs.set(value)
  },
}
