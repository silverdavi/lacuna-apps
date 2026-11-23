import { expect, test } from '@playwright/test'

test('probe exact match with child element', async ({ page }) => {
  const cases: [string, string][] = [
    ['G nested-time', '<div id="p"><span>Dentist<span class="t">14:00</span></span></div>'],
    ['H cell-num+chip', '<div id="p"><div>10</div><div><span>Dentist</span><span>14:00</span></div></div>'],
    ['I cell-only-title', '<div id="p"><div class="num">10</div><span class="title">Dentist</span><span class="time">14:00</span></div>'],
    ['J chip-title-only', '<div id="cell"><div class="num">10</div><div class="chip"><span>Dentist</span></div><div class="time">14:00</div></div>'],
  ]
  for (const [name, html] of cases) {
    await page.evaluate((h) => {
      let r = document.getElementById('root')
      if (!r) { r = document.createElement('div'); r.id = 'root'; document.body.appendChild(r) }
      r.innerHTML = h
    }, html)
    const loc = page.getByText('Dentist', { exact: true })
    const count = await loc.count()
    let contains = 'n/a'
    if (count > 0) contains = String(await loc.first().evaluate((el) => el.textContent.includes('14:00')))
    console.log(`${name}: count=${count} entryContains1400=${contains}`)
  }
  await expect(1).toBe(1)
})

test('dump DOM after adding Dentist', async ({ page }) => {
  await page.goto('/')
  const html0 = await page.locator('#root').innerHTML()
  console.log('=== BEFORE FORM ===')
  console.log(html0.slice(0, 4000))

  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill('Dentist')
  await page.getByLabel('Date').fill('2025-06-10')
  await page.getByLabel('Time').fill('14:00')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(500)

  const loc = page.getByText('Dentist', { exact: true })
  console.log('COUNT exact:', await loc.count())
  const all = page.getByText('Dentist')
  console.log('COUNT non-exact:', await all.count())
  const span = page.locator('.fcal-chip-line')
  console.log('SPAN count:', await span.count(), 'text:', await span.first().innerText().catch(() => 'none'))
  console.log('SPAN exact?', (await page.getByText('Dentist', { exact: true })).first().innerHTML().catch(() => 'no match'))
  const chip = page.locator('.fcal-chip').first()
  console.log('CHIP innerHTML:', await chip.innerHTML().catch(() => 'none'))
  await expect(1).toBe(1)
})
