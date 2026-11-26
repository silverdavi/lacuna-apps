import { store, type Application } from './mock'

export type { Application }

export const host = {
  loadApplications(): Application[] {
    return store.list()
  },
  addApplication(company: string, role: string, status: string, interviewDate: string): Application[] {
    store.add({ company, role, status, interviewDate, id: `application-${Date.now()}-${Math.floor(Math.random() * 1e6)}` })
    return store.list()
  },
  updateApplication(id: string, company: string, role: string, status: string, interviewDate: string): Application[] {
    store.update(id, { company, role, status, interviewDate })
    return store.list()
  },
  deleteApplication(id: string): Application[] {
    store.remove(id)
    return store.list()
  },
}
