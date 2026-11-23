import { expect, test } from '@playwright/test'

test('probe getByText whitespace semantics', async ({ page }) => {
  await page.setContent(`
    <div id="c">Dentist <span>14:00</span></div>
    <div id="d"><span>Dentist<span> 14:00</span></span></div>
  `)
  console.log('C exact "Dentist":', await page.locator('#c').getByText('Dentist', { exact: true }).count())
  console.log('C exact "Dentist "(trailing):', await page.locator('#c').getByText('Dentist ', { exact: true }).count())
  console.log('D exact "Dentist":', await page.locator('#d').getByText('Dentist', { exact: true }).count())
  console.log('D all Dentist:', await page.locator('#d').getByText('Dentist').count())
  console.log('C all Dentist:', await page.locator('#c').getByText('Dentist').count())
  for (const id of ['c', 'd']) {
    const el = page.locator(`#${id}`).getByText('Dentist').first()
    const txt = await el.textContent()
    console.log(`${id} first all-Dentist text:`, JSON.stringify(txt))
    await expect(el).toContainText('14:00').catch((e) => console.log(`${id} toContainText FAILED`))
  }
})
