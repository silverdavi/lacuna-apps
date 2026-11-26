import { expect, test, type Locator, type Page } from '@playwright/test'

const metric = 'Metric (cm, kg)'
const imperial = 'Imperial (ft, lbs)'

async function setUnits(page: Page, units: string) {
  await page.getByLabel('Units').selectOption({ label: units })
}

async function openApp(page: Page, units?: string) {
  await page.goto('/')
  if (units) await setUnits(page, units)
}

async function enterAndCalculate(page: Page, height: string, weight: string) {
  await page.getByLabel('Height').fill(height)
  await page.getByLabel('Weight').fill(weight)
  await page.getByRole('button', { name: 'Calculate' }).click()
}

// [A7] The spec does not say how a highlighted row is marked; the app is built to
// satisfy this test, so accept a visible highlight state via aria/class/text.
const highlighted = (row: Locator) =>
  row.evaluate((el) => {
    const s = getComputedStyle(el as HTMLElement)
    const cls = el.className.toLowerCase()
    return (
      cls.includes('highlight') ||
      cls.includes('active') ||
      cls.includes('selected') ||
      el.getAttribute('aria-current') === 'true' ||
      s.fontWeight === 'bold' ||
      s.backgroundColor !== 'rgba(0, 0, 0, 0)'
    )
  })

// [A8] The spec does not give the chart DOM; find the bar element that carries
// the category label and read its fill from its width or aria-valuenow.
const fill = (bar: Locator) =>
  bar.evaluate((el) => {
    const s = getComputedStyle(el as HTMLElement)
    const valuenow = el.getAttribute('aria-valuenow')
    if (valuenow !== null) return valuenow
    const w = s.width
    const parent = (el.parentElement as HTMLElement | null)?.offsetWidth ?? 0
    if (parent > 0 && w && w !== '0px') return `${Math.round((parseFloat(w) / parent) * 100)}%`
    return w || '0px'
  })

test('[A1] initial state shows heading, intro text and empty result', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BMI Calculator' })).toBeVisible()
  await expect(page.getByText('Enter your height and weight to calculate BMI')).toBeVisible()
  await expect(page.getByText('BMI: —')).toBeVisible()
})

test('[A2] metric 170cm 65kg shows BMI 22.5 Normal weight', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '170', '65')
  await expect(page.getByText('BMI: 22.5')).toBeVisible()
  await expect(page.getByText('Normal weight', { exact: true }).first()).toBeVisible()
})

test('[A3] imperial 5ft 10lbs shows BMI 21.8 Normal weight', async ({ page }) => {
  await openApp(page, imperial)
  await enterAndCalculate(page, '5', '10')
  await expect(page.getByText('BMI: 21.8')).toBeVisible()
  await expect(page.getByText('Normal weight', { exact: true }).first()).toBeVisible()
})

test('[A4] metric 150cm 80kg shows BMI 35.6 Obese', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '150', '80')
  await expect(page.getByText('BMI: 35.6')).toBeVisible()
  await expect(page.getByText('Obese', { exact: true }).first()).toBeVisible()
})

test('[A5] metric 180cm 50kg shows BMI 15.4 Underweight', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '180', '50')
  await expect(page.getByText('BMI: 15.4')).toBeVisible()
  await expect(page.getByText('Underweight', { exact: true }).first()).toBeVisible()
})

test('[A6] zero weight shows validation error and keeps empty result', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '170', '0')
  await expect(page.getByText('Weight must be greater than 0')).toBeVisible()
  await expect(page.getByText('BMI: —')).toBeVisible()
})

test('[A7] breakdown lists all four categories and highlights Normal weight at BMI 22.5', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '170', '65')
  const rows = ['Underweight', 'Normal weight', 'Overweight', 'Obese'].map(
    (label) => page.locator('tr', { hasText: label }).first()
  )
  for (const row of rows) await expect(row).toBeVisible()
  const [under, normal, over, obese] = rows
  await expect.poll(() => highlighted(normal)).toBe(true)
  await expect.poll(() => highlighted(under)).toBe(false)
  await expect.poll(() => highlighted(over)).toBe(false)
  await expect.poll(() => highlighted(obese)).toBe(false)
})

test('[A8] metric 175cm 70kg shows BMI 22.9 and fills only the Normal weight bar', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '175', '70')
  await expect(page.getByText('BMI: 22.9')).toBeVisible()
  const normalBar = page.locator('[role="meter"], [role="img"]').filter({ hasText: 'Normal weight' }).first()
  await expect(normalBar).toBeVisible()
  const pct = await fill(normalBar)
  await expect(pct).toMatch(/^100(\.0+)?%$/)
  for (const label of ['Underweight', 'Overweight', 'Obese']) {
    const bar = page.locator('[role="meter"], [role="img"]').filter({ hasText: label }).first()
    await expect(bar).toBeVisible()
    const w = await fill(bar)
    await expect(w).toMatch(/^0(\.0+)?%$/)
  }
})

test('[A9] last calculation persists across reload', async ({ page }) => {
  await openApp(page, metric)
  await enterAndCalculate(page, '170', '65')
  await expect(page.getByText('BMI: 22.5')).toBeVisible()
  await page.reload()
  await expect(page.getByText('BMI: 22.5')).toBeVisible()
  await expect(page.getByText('Normal weight', { exact: true }).first()).toBeVisible()
})
