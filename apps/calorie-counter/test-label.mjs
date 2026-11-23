import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()

// Test 1: wrapping label (current Select component pattern)
await page.setContent(`
  <label class="lc-field">
    <span class="lc-field-label">Category</span>
    <select class="lc-input" id="form-select">
      <option value="Breakfast">Breakfast</option>
      <option value="Lunch">Lunch</option>
    </select>
  </label>
  <label class="lc-field">
    <span class="lc-field-label">Filter by category</span>
    <select class="lc-input" id="filter-select">
      <option value="All">All</option>
      <option value="Breakfast">Breakfast</option>
    </select>
  </label>
`)

const result1 = await page.getByLabel('Category').count()
console.log('Wrapping label - getByLabel("Category") count:', result1)

// Test 2: label with for attribute
await page.setContent(`
  <label class="lc-field" for="form-select2"><span class="lc-field-label">Category</span></label>
  <select class="lc-input" id="form-select2">
    <option value="Breakfast">Breakfast</option>
    <option value="Lunch">Lunch</option>
  </select>
  <label class="lc-field" for="filter-select2"><span class="lc-field-label">Filter by category</span></label>
  <select class="lc-input" id="filter-select2">
    <option value="All">All</option>
    <option value="Breakfast">Breakfast</option>
  </select>
`)

const result2 = await page.getByLabel('Category').count()
console.log('Label-for - getByLabel("Category") count:', result2)
const result2b = await page.getByLabel('Filter by category').count()
console.log('Label-for - getByLabel("Filter by category") count:', result2b)

// Test 3: check accessible names
const names1 = await page.evaluate(() => {
  const selects = document.querySelectorAll('select')
  return Array.from(selects).map(s => {
    const label = document.querySelector(`label[for="${s.id}"]`)
    return { id: s.id, labelText: label ? label.textContent : null }
  })
})
console.log('Accessible name sources:', JSON.stringify(names1, null, 2))

await browser.close()
