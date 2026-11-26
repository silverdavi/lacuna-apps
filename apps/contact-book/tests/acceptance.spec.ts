import { expect, test } from '@playwright/test'

async function addContact(
  page: import('@playwright/test').Page,
  fields: { name: string; email: string; phone: string; notes?: string },
) {
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.getByLabel('Name').fill(fields.name)
  await page.getByLabel('Email').fill(fields.email)
  await page.getByLabel('Phone').fill(fields.phone)
  if (fields.notes !== undefined) await page.getByLabel('Notes').fill(fields.notes)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Contact Book' })).toBeVisible()
  await expect(page.getByText('No contacts yet')).toBeVisible()
})

test('[A2] add a contact', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101' })
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByText('ada@example.com')).toBeVisible()
  await expect(page.getByText('555-0101')).toBeVisible()
  await expect(page.getByText('No contacts yet')).toHaveCount(0)
})

test('[A3] search filters with fuzzy matching', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101' })
  await page.getByLabel('Search').fill('ada')
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await page.getByLabel('Search').fill('zzz')
  await expect(page.getByText('No contacts match')).toBeVisible()
  await expect(page.getByText('Ada Lovelace')).toHaveCount(0)
})

test('[A4] edit a contact', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101' })
  await page.getByRole('button', { name: 'Edit Ada Lovelace' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Ada Lovelace')
  await page.getByLabel('Name').fill('Ada King')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Ada King')).toBeVisible()
  await expect(page.getByText('ada@example.com')).toBeVisible()
  await expect(page.getByText('Ada Lovelace')).toHaveCount(0)
})

test('[A5] delete a contact', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada King', email: 'ada@example.com', phone: '555-0101' })
  await expect(page.getByRole('button', { name: 'Delete Ada King' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Ada King' }).click()
  await expect(page.getByText('No contacts yet')).toBeVisible()
  await expect(page.getByText('Ada King')).toHaveCount(0)
})

test('[A6] sorting by the Name column toggles order', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101' })
  await addContact(page, { name: 'Bob Smith', email: 'bob@example.com', phone: '555-0102' })
  // first click: ascending, "Ada Lovelace" before "Bob Smith"
  await page.getByRole('columnheader', { name: 'Name' }).click()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByText('Bob Smith')).toBeVisible()
  const orderAsc: string[] = []
  for (const row of await page.locator('table tbody tr').all()) orderAsc.push(await row.innerText())
  expect(orderAsc[0].includes('Ada Lovelace')).toBe(true)
  expect(orderAsc[1].includes('Bob Smith')).toBe(true)
  // second click: descending, "Bob Smith" before "Ada Lovelace"
  await page.getByRole('columnheader', { name: 'Name' }).click()
  const orderDesc: string[] = []
  for (const row of await page.locator('table tbody tr').all()) orderDesc.push(await row.innerText())
  expect(orderDesc[0].includes('Bob Smith')).toBe(true)
  expect(orderDesc[1].includes('Ada Lovelace')).toBe(true)
})

test('[A7] export CSV', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101' })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('Name,Email,Phone,Notes')
  expect(csv).toContain('Ada Lovelace,ada@example.com,555-0101,')
})

test('[A8] notes round-trip through edit', async ({ page }) => {
  await page.goto('/')
  await addContact(page, {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '555-0101',
    notes: 'Met at conference',
  })
  await page.getByRole('button', { name: 'Edit Ada Lovelace' }).click()
  await expect(page.getByLabel('Notes')).toHaveValue('Met at conference')
})

test('[A9] contacts persist across a reload', async ({ page }) => {
  await page.goto('/')
  await addContact(page, { name: 'Ada Lovelace', email: 'ada@example.com', phone: '555-0101' })
  await page.reload()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByText('ada@example.com')).toBeVisible()
})
