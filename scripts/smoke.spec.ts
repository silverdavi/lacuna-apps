// Checks every app gets, whatever its own tests say. The gate runs only this file, never an app's tests.
// Each app opens at 1440 by 900 and 390 by 844, in light and dark. Any request off the app's own origin
// fails, as does any console error. Screenshots land in $SHOTS (default artifacts/<slug>/) for review.
// Titles carry @browser or @a11y so the gate can report the two checks separately.
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const app = process.env.APP!
const shots = process.env.SHOTS ?? `artifacts/${app}`
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
]
const THEMES = ['light', 'dark'] as const

// Same origin as the page, or data held in the page itself. Everything else is off-origin.
function onOrigin(url: string, origin: string) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url === 'about:blank') return true
  try { return new URL(url).origin === origin } catch { return false }
}

function watch(page: Page, origin: string) {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`) })
  page.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`))
  page.on('request', (r) => { if (!onOrigin(r.url(), origin)) problems.push(`request off the app's origin: ${r.url()}`) })
  page.on('websocket', (w) => problems.push(`websocket: ${w.url()}`))
  page.on('popup', (p) => problems.push(`opened a window: ${p.url()}`))
  return problems
}

async function open(page: Page, origin: string, theme: 'light' | 'dark' = 'light') {
  await page.context().route((url) => !onOrigin(url.href, origin), (route) => route.abort())
  await page.emulateMedia({ colorScheme: theme })
  await page.goto('/')
  await page.evaluate((t) => document.documentElement.setAttribute('data-appearance', t), theme)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(150)
}

for (const v of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`opens cleanly at ${v.width} by ${v.height} in ${theme} @browser`, async ({ page, baseURL }) => {
      const origin = new URL(baseURL!).origin
      await page.setViewportSize({ width: v.width, height: v.height })
      const problems = watch(page, origin)
      await open(page, origin, theme)
      const text = (await page.locator('#root').innerText()).trim()
      await page.screenshot({ path: `${shots}/${v.name}-${theme}.png`, fullPage: true })
      expect(text.length, 'the app shows visible text').toBeGreaterThan(0)
      expect(problems, 'no console errors and no requests off the app\'s origin').toEqual([])
    })
  }
}

test('keyboard reaches a control @browser', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  await open(page, origin)
  await page.keyboard.press('Tab')
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY')
  expect(tag, 'Tab moves focus into the app').not.toBe('BODY')
})

test('no serious accessibility issues @a11y', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  await open(page, origin)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)
  expect(serious).toEqual([])
})
