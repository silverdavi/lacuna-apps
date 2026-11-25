import { expect, test as base, type Locator, type MatcherState } from '@playwright/test'

const toHaveValue: any = async function (
  this: MatcherState,
  locator: Locator,
  expected: string,
): Promise<{ pass: boolean; message: () => string }> {
  const count = await locator.count()

  if (count === 0) {
    return {
      pass: false,
      message: () =>
        `Expected locator to resolve to at least one element, but it resolved to 0 elements.`,
    }
  }

  const values: string[] = []
  for (let i = 0; i < count; i++) {
    const el = locator.nth(i)
    const value = await el.evaluate((node) =>
      (node as HTMLSelectElement).value ??
      (node as HTMLInputElement).value ??
      (node as HTMLTextAreaElement).value ??
      '',
    )
    values.push(value)
  }

  const pass = values.every((v) => v === expected)
  const isSelect = (await locator.first().evaluate(
    (node) => node instanceof HTMLSelectElement,
  )) as boolean

  const describe = () =>
    isSelect
      ? `select element${count > 1 ? 's' : ''} with value${count > 1 ? 's' : ''}`
      : `input element${count > 1 ? 's' : ''}`

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected ${describe()} to have value "${expected}" (all ${count} element${count > 1 ? 's' : ''} match).`
      }
      const bad = values
        .map((v, i) => (v === expected ? null : `element ${i}: got "${v}", expected "${expected}"`))
        .filter((s): s is string => s !== null)
      return `Expected ${describe()} to have value "${expected}", but ${count} element${count > 1 ? 's' : ''} resolved and these did not match:\n${bad.join('\n')}`
    },
  }
}

const test = base.extend({})

expect.extend({ toHaveValue })

export { test, expect }
