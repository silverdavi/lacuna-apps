import { expect, test } from '@playwright/test'

test('[A1] page shows heading and two panes separated by a draggable divider', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'HTML Markdown Converter' })).toBeVisible()
  await expect(page.getByText('Input', { exact: true })).toBeVisible()
  await expect(page.getByText('Output', { exact: true })).toBeVisible()
  const divider = page.getByRole('separator').first()
  await expect(divider).toBeVisible()
  // A live region between the panes reports the first pane's size; dragging the
  // divider must change that reported size.
  const before = Number(await divider.getAttribute('aria-valuenow'))
  const box = await divider.boundingBox()
  expect(box, 'divider has a measurable size').not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 60, box!.y + box!.height / 2, { steps: 6 })
  await page.mouse.up()
  const after = Number(await divider.getAttribute('aria-valuenow'))
  expect(after, 'dragging the divider changes the pane size').not.toBe(before)
})

test('[A2] h1 converts to a markdown heading', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('<h1>Hello</h1>')
  await expect(page.getByLabel('Output')).toHaveText('# Hello')
})

test('[A3] ul converts to a markdown list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('<ul><li>One</li><li>Two</li></ul>')
  await expect(page.getByLabel('Output')).toHaveText('- One\n- Two')
})

test('[A4] anchor converts to a markdown link', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('<p>Visit <a href="https://example.com">site</a></p>')
  await expect(page.getByLabel('Output')).toHaveText('Visit [site](https://example.com)')
})

test('[A5] copy output puts the result on the clipboard and shows the toast', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Input').fill('<h2>Test</h2>')
  await page.getByRole('button', { name: 'Copy output' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('## Test')
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('[A6] toggling sanitize off keeps script tags, on strips them', async ({ page }) => {
  await page.goto('/')
  // Default is on; the first output already proves the on behaviour.
  await page.getByLabel('Input').fill('<script>alert(1)</script><p>Safe</p>')
  await expect(page.getByLabel('Output')).toHaveText('Safe')
  await page.getByLabel('Sanitize').click()
  await expect(page.getByLabel('Output')).toHaveText('<script>alert(1)</script>\nSafe')
  await page.getByLabel('Sanitize').click()
  await expect(page.getByLabel('Output')).toHaveText('Safe')
})

test('[A7] the markdown to html tab reverses the direction', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Markdown to HTML' }).click()
  await page.getByLabel('Input').fill('# Title')
  await expect(page.getByLabel('Output')).toHaveText('<h1>Title</h1>')
})

test('[A8] table converts to a markdown table', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('<table><tr><td>A</td><td>B</td></tr></table>')
  await expect(page.getByLabel('Output')).toHaveText('| A | B |')
})

test('[A9] input, output and the sanitize setting persist across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('<h1>Hello</h1>')
  await page.reload()
  await expect(page.getByLabel('Input')).toHaveText('<h1>Hello</h1>')
  await expect(page.getByLabel('Output')).toHaveText('# Hello')
  await expect(page.getByLabel('Sanitize')).toBeChecked()
})
