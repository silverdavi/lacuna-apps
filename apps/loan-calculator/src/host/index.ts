import { emptyLoan, loadLoan, saveLoan, type LoanRecord } from './mock'

export type { LoanRecord }

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
}
