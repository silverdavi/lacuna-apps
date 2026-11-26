import {
  emptyLoan,
  addSavedLoan,
  listSavedLoans,
  loadLoan,
  removeSavedLoan,
  saveLoan,
  type LoanRecord,
  type SavedLoan,
} from './mock'

export type { LoanRecord, SavedLoan }

export const host = {
  load(): LoanRecord {
    return loadLoan()
  },
  save(record: LoanRecord): LoanRecord {
    saveLoan(record)
    return record
  },
  reset(): LoanRecord {
    saveLoan(emptyLoan)
    return emptyLoan
  },
  listSavedLoans(): SavedLoan[] {
    return listSavedLoans()
  },
  addSavedLoan(record: Omit<SavedLoan, 'id'>): SavedLoan {
    return addSavedLoan(record)
  },
  removeSavedLoan(id: string): boolean {
    return removeSavedLoan(id)
  },
}
