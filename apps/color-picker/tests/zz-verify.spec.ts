import { expect, test } from '@playwright/test'

test('verify getByLabel matching behavior', async ({ page }) => {
  await page.setContent(`
    <div>
      <input id="hex" aria-label="Hex" value="#FF5733" />
      <input id="r" aria-label="R" value="255" />
      <input id="g" aria-label="G" value="87" />
      <input id="b" aria-label="B" value="51" />
      <input id="hsl-h" aria-label="H" value="12" />
      <input id="hsl-s" aria-label="S" value="100" />
      <input id="hsl-l" aria-label="L" value="60" />
      <input id="oklch-l" aria-label="OKLCH L" value="10" />
      <input id="oklch-c" aria-label="OKLCH C" value="0.15" />
      <input id="oklch-h" aria-label="OKLCH H" value="25" />
      <input id="cw" aria-label="Contrast on White" value="3.02" />
      <input id="cb" aria-label="Contrast on Black" value="10.45" />
    </div>
  `)

  // Test 1: Does getByLabel('H') match the Hex field (aria-label="Hex")?
  const hCount = await page.getByLabel('H').count()
  console.log(`getByLabel('H') count: ${hCount}`)
  if (hCount > 0) {
    for (let i = 0; i < hCount; i++) {
      const id = await page.getByLabel('H').nth(i).getAttribute('id')
      console.log(`  H match ${i}: id=${id}`)
    }
  }

  // Test 2: Does getByLabel('L') match Contrast on Black?
  const lCount = await page.getByLabel('L').count()
  console.log(`getByLabel('L') count: ${lCount}`)
  if (lCount > 0) {
    for (let i = 0; i < lCount; i++) {
      const id = await page.getByLabel('L').nth(i).getAttribute('id')
      console.log(`  L match ${i}: id=${id}`)
    }
  }

  // Test 3: Does getByLabel('S') match anything unexpected?
  const sCount = await page.getByLabel('S').count()
  console.log(`getByLabel('S') count: ${sCount}`)
  if (sCount > 0) {
    for (let i = 0; i < sCount; i++) {
      const id = await page.getByLabel('S').nth(i).getAttribute('id')
      console.log(`  S match ${i}: id=${id}`)
    }
  }

  // Test 4: Does getByLabel('R') match anything unexpected?
  const rCount = await page.getByLabel('R').count()
  console.log(`getByLabel('R') count: ${rCount}`)
  if (rCount > 0) {
    for (let i = 0; i < rCount; i++) {
      const id = await page.getByLabel('R').nth(i).getAttribute('id')
      console.log(`  R match ${i}: id=${id}`)
    }
  }

  // Test 5: Does getByLabel('C') match OKLCH C?
  const cCount = await page.getByLabel('C').count()
  console.log(`getByLabel('C') count: ${cCount}`)
  if (cCount > 0) {
    for (let i = 0; i < cCount; i++) {
      const id = await page.getByLabel('C').nth(i).getAttribute('id')
      console.log(`  C match ${i}: id=${id}`)
    }
  }

  // Test 6: Does getByLabel('Hex') match only the Hex field?
  const hexCount = await page.getByLabel('Hex').count()
  console.log(`getByLabel('Hex') count: ${hexCount}`)

  // Test 7: Does getByLabel('Contrast on White') match?
  const cwCount = await page.getByLabel('Contrast on White').count()
  console.log(`getByLabel('Contrast on White') count: ${cwCount}`)

  // Test 8: Does getByLabel('Contrast on Black') match?
  const cbCount = await page.getByLabel('Contrast on Black').count()
  console.log(`getByLabel('Contrast on Black') count: ${cbCount}`)

  expect(true).toBe(true)
})
