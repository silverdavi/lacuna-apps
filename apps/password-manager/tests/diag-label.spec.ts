import { test } from '@playwright/test'

test('getByLabel matching behavior', async ({ page }) => {
  // Test A: aria-label on INPUT (not label), wrapping label has different text
  await page.setContent(`
    <html><body>
      <label><span>Name</span><input aria-label="Name" /></label>
      <label><span>Username</span><input aria-label="User" /></label>
    </body></html>
  `)
  console.log('A - Name count:', await page.getByLabel('Name').count())
  console.log('A - Username count:', await page.getByLabel('Username').count())

  // Test B: aria-label on INPUT with "Username", wrapping label has "Username"
  await page.setContent(`
    <html><body>
      <label><span>Name</span><input aria-label="Name" /></label>
      <label><span>Username</span><input aria-label="Username" /></label>
    </body></html>
  `)
  console.log('B - Name count:', await page.getByLabel('Name').count())
  console.log('B - Username count:', await page.getByLabel('Username').count())

  // Test C: aria-label="User name" (with space) on Username input
  await page.setContent(`
    <html><body>
      <label><span>Name</span><input aria-label="Name" /></label>
      <label><span>Username</span><input aria-label="User name" /></label>
    </body></html>
  `)
  console.log('C - Name count:', await page.getByLabel('Name').count())
  console.log('C - Username count:', await page.getByLabel('Username').count())

  // Test D: aria-label with zero-width space: "User\u200bname"
  await page.setContent(`
    <html><body>
      <label><span>Name</span><input aria-label="Name" /></label>
      <label><span>Username</span><input aria-label="User​name" /></label>
    </body></html>
  `)
  console.log('D - Name count:', await page.getByLabel('Name').count())
  console.log('D - Username count:', await page.getByLabel('Username').count())

  // Test E: Check accessible name of inputs in test B
  await page.setContent(`
    <html><body>
      <label><span>Name</span><input id="in1" aria-label="Name" /></label>
      <label><span>Username</span><input id="in2" aria-label="Username" /></label>
    </body></html>
  `)
  const names = await page.evaluate(() => {
    const el1 = document.getElementById('in1')
    const el2 = document.getElementById('in2')
    return {
      in1: el1?.getAttribute('aria-label'),
      in2: el2?.getAttribute('aria-label'),
    }
  })
  console.log('E - aria-labels:', JSON.stringify(names))
})
