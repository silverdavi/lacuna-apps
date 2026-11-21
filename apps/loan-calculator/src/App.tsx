import { useMemo, useState } from 'react'
import { Button, TextInput } from '@lacuna/ui'
import { calculateLoan, formatMoney, loanError } from './loan'
import { host, type LoanRecord } from './host'

export function App() {
  const [fields, setFields] = useState<LoanRecord>(() => host.load())
  const [showSchedule, setShowSchedule] = useState(false)

  const error = useMemo(() => loanError(fields), [fields])
  const result = useMemo(
    () => (error === null ? calculateLoan(fields) : null),
    [error, fields],
  )

  const updateField = (key: keyof LoanRecord) => (value: string) => {
    const next = { ...fields, [key]: value }
    setFields(next)
    host.save(next)
  }

  return (
    <main className="loan-app">
      <h1 className="loan-heading">Loan payment</h1>
      <div className="loan-form">
        <TextInput
          label="Principal"
          value={fields.principal}
          onChange={updateField('principal')}
        />
        <TextInput
          label="Annual rate %"
          value={fields.rate}
          onChange={updateField('rate')}
        />
        <TextInput
          label="Years"
          value={fields.years}
          onChange={updateField('years')}
        />
      </div>
      {error && (
        <div className="loan-error" role="alert">
          {error}
        </div>
      )}
      <div className="loan-summary">
        <label aria-label="Monthly payment">
          {result ? formatMoney(result.monthlyPayment) : ''}
          <input value="" />
        </label>
        <label aria-label="Total interest">
          {result ? formatMoney(result.totalInterest) : ''}
          <input value="" />
        </label>
        <label aria-label="Total paid">
          {result ? formatMoney(result.totalPaid) : ''}
          <input value="" />
        </label>
      </div>
      <div className="loan-actions">
        <Button kind="ghost" onClick={() => setShowSchedule((v) => !v)}>
          Show schedule
        </Button>
      </div>
      {result && showSchedule && (
        <table className="loan-table">
          <thead>
            <tr>
              <th>Payment</th>
              <th className="num">Payment</th>
              <th className="num">Interest</th>
              <th className="num">Principal part</th>
              <th className="num">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td className="num">{formatMoney(row.payment)}</td>
                <td className="num">{formatMoney(row.interest)}</td>
                <td className="num">{formatMoney(row.principalPart)}</td>
                <td className="num">{formatMoney(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
