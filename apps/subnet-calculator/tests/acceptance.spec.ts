import { expect, test } from '@playwright/test'

test('[A1] heading "IP Subnet Calculator" is shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'IP Subnet Calculator' })).toBeVisible()
})

async function calculate(page, ip: string, prefix: string) {
  await page.getByLabel('IP Address').fill(ip)
  await page.getByLabel('Prefix Length').fill(prefix)
  await page.getByRole('button', { name: 'Calculate' }).click()
}

test('[A2] 192.168.1.0/24 shows network, broadcast and usable hosts', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '192.168.1.0', '24')
  await expect(page.getByText('Network: 192.168.1.0')).toBeVisible()
  await expect(page.getByText('Broadcast: 192.168.1.255')).toBeVisible()
  await expect(page.getByText('Usable Hosts: 254')).toBeVisible()
})

test('[A3] breakdown table shows subnet mask and first usable', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '192.168.1.0', '24')
  await expect(page.getByRole('table')).toContainText('Subnet Mask')
  await expect(page.getByRole('table')).toContainText('255.255.255.0')
  await expect(page.getByRole('table')).toContainText('First Usable')
  await expect(page.getByRole('table')).toContainText('192.168.1.1')
})

test('[A4] 10.0.0.0/8 shows network, broadcast and usable hosts', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '10.0.0.0', '8')
  await expect(page.getByText('Network: 10.0.0.0')).toBeVisible()
  await expect(page.getByText('Broadcast: 10.255.255.255')).toBeVisible()
  await expect(page.getByText('Usable Hosts: 16777214')).toBeVisible()
})

test('[A5] 192.168.1.100/24 shows the containing /24 network', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '192.168.1.100', '24')
  await expect(page.getByText('Network: 192.168.1.0')).toBeVisible()
  await expect(page.getByText('Broadcast: 192.168.1.255')).toBeVisible()
  await expect(page.getByText('Usable Hosts: 254')).toBeVisible()
})

test('[A6] invalid IP shows "Invalid IP address" and no result summary', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'abc', '24')
  await expect(page.getByText('Invalid IP address')).toBeVisible()
  await expect(page.getByText(/Network:/)).not.toBeVisible()
  await expect(page.getByText(/Broadcast:/)).not.toBeVisible()
  await expect(page.getByText(/Usable Hosts:/)).not.toBeVisible()
})

test('[A7] "Save to List" adds the saved item to the list', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '192.168.1.0', '24')
  await page.getByRole('button', { name: 'Save to List' }).click()
  await expect(page.getByText('192.168.1.0/24')).toBeVisible()
  await expect(page.getByText('254 hosts')).toBeVisible()
})

test('[A8] "Delete 192.168.1.0/24" removes the item from the list', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '192.168.1.0', '24')
  await page.getByRole('button', { name: 'Save to List' }).click()
  await expect(page.getByText('192.168.1.0/24')).toBeVisible()
  await page.getByRole('button', { name: 'Delete 192.168.1.0/24' }).click()
  await expect(page.getByText('192.168.1.0/24')).not.toBeVisible()
  await expect(page.getByText('254 hosts')).not.toBeVisible()
})

test('[A9] saved list item survives a page reload', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '192.168.1.0', '24')
  await page.getByRole('button', { name: 'Save to List' }).click()
  await expect(page.getByText('192.168.1.0/24')).toBeVisible()
  await page.reload()
  await expect(page.getByText('192.168.1.0/24')).toBeVisible()
  await expect(page.getByText('254 hosts')).toBeVisible()
})
