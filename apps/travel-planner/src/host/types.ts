export interface EventRecord {
  id: string
  createdAt: number
  title: string
  date: string
  startTime: string
}

export interface BudgetRecord {
  id: string
  createdAt: number
  item: string
  amount: number
}

export interface PackingRecord {
  id: string
  createdAt: number
  name: string
  packed: boolean
}
