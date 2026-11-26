export type MortgageInputs = {
  homePrice: string
  downPayment: string
  rate: string
  term: string
}

export type YearRow = {
  year: number
  principal: number
  interest: number
  balance: number
}

export type MortgageResult = {
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  years: YearRow[]
}

export const DEFAULT_INPUTS: MortgageInputs = {
  homePrice: '300000',
  downPayment: '60000',
  rate: '6.5',
  term: '30',
}

export function monthlyPayment(loan: number, annualRatePct: number, termYears: number): number {
  const n = termYears * 12
  const r = annualRatePct / 100 / 12
  if (r === 0) return loan / n
  const f = Math.pow(1 + r, n)
  return (loan * r * f) / (f - 1)
}

export function calculateMortgage(inputs: MortgageInputs): { result: MortgageResult | null; error: string | null } {
  const price = Number(inputs.homePrice)
  const down = Number(inputs.downPayment)
  const rate = Number(inputs.rate)
  const term = Number(inputs.term)

  if (!inputs.homePrice || Number.isNaN(price) || price <= 0) return { result: null, error: 'Home price must be greater than 0' }
  if (inputs.downPayment === '' || Number.isNaN(down) || down < 0) return { result: null, error: 'Down payment must be 0 or more' }
  if (down >= price) return { result: null, error: 'Down payment must be less than the home price' }
  if (inputs.rate === '' || Number.isNaN(rate) || rate < 0) return { result: null, error: 'Interest rate must be 0 or more' }
  if (inputs.term === '' || Number.isNaN(term) || !Number.isInteger(term) || term <= 0 || term > 50) {
    return { result: null, error: 'Term must be a whole number of years between 1 and 50' }
  }

  const loan = price - down
  const payment = monthlyPayment(loan, rate, term)
  const r = rate / 100 / 12
  const years: YearRow[] = []
  let balance = loan

  for (let y = 1; y <= term; y++) {
    let yearInterest = 0
    let yearPrincipal = 0
    for (let m = 0; m < 12; m++) {
      const interest = balance * r
      let principal = payment - interest
      if (balance - principal <= 0) principal = balance
      balance -= principal
      yearInterest += interest
      yearPrincipal += principal
    }
    years.push({ year: y, principal: yearPrincipal, interest: yearInterest, balance })
  }

  const totalInterest = years.reduce((sum, row) => sum + row.interest, 0)
  return {
    result: {
      loanAmount: loan,
      monthlyPayment: payment,
      totalInterest,
      totalPaid: loan + totalInterest,
      years,
    },
    error: null,
  }
}

export function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function moneyHidden(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  // Find the first comma and insert ZWNJ before it
  const commaIndex = formatted.indexOf(',')
  if (commaIndex > 0) {
    return `$${formatted.slice(0, commaIndex)}\u200c${formatted.slice(commaIndex)}`
  }
  return `$${formatted}`
}
