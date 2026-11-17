// Checks every app gets, whatever its own tests say.
// Screenshots land in artifacts/<slug>/ for the reviewer.
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const app = process.env.APP!
const shots = `artifacts/${app}`
const local = (url: string) => url.startsWith('http://127.0.0.1')

function watch(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console error: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`))
  return problems
}

async function open(page: Page, attrs: Record<string, string> = {}) {
  await page.route((url) => !local(url.href), (route) => route.abort())
  await page.goto('/')
  await page.evaluate((a) => {
    for (const [k, v] of Object.entries(a)) document.documentElement.setAttribute(k, v)
  }, attrs)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(100)
}

test('renders without errors or outside requests', async ({ page }) => {
  const problems = watch(page)
  const outside: string[] = []
  page.on('request', (r) => {
    if (!local(r.url())) outside.push(r.url())
  })
  await open(page)
  const text = (await page.locator('#root').innerText()).trim()
  expect(text.length, 'app renders visible text').toBeGreaterThan(0)
  expect(problems, 'no console errors').toEqual([])
  expect(outside, 'no requests to other origins').toEqual([])
})

test('theme matrix screenshots', async ({ page }) => {
  const problems = watch(page)
  const matrix = [
    { name: 'light', attrs: { 'data-appearance': 'light' } },
    { name: 'dark', attrs: { 'data-appearance': 'dark' } },
    { name: 'compact-s', attrs: { 'data-density': 'compact', 'data-type-scale': 's' } },
    { name: 'full-3xl', attrs: { 'data-density': 'full', 'data-type-scale': '3xl' } },
  ]
  for (const m of matrix) {
    await open(page, m.attrs)
    await page.screenshot({ path: `${shots}/${m.name}.png`, fullPage: true })
  }
  expect(problems).toEqual([])
})

test('no serious accessibility issues', async ({ page }) => {
  await open(page)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)
  expect(serious).toEqual([])
})

test('keyboard reaches a control', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Tab')
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY')
  expect(tag, 'Tab moves focus into the app').not.toBe('BODY')
})
