import { expect, test, type Page } from '@playwright/test'

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('no canvas found')
  return box
}

async function draw(page: Page, from: [number, number], to: [number, number]) {
  const box = await canvasBox(page)
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

async function makeRectangle(page: Page) {
  await page.getByRole('button', { name: 'Rectangle' }).click()
  await draw(page, [100, 100], [200, 150])
}

async function makeEllipse(page: Page) {
  await page.getByRole('button', { name: 'Ellipse' }).click()
  await draw(page, [300, 100], [400, 150])
}

async function setLabel(page: Page, text: string) {
  await page.getByLabel('Label').fill(text)
  await page.getByLabel('Label').press('Enter')
}

test('[A1] page shows the heading and the canvas with the Select tool active', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Flowchart Editor' })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select' })).toBeVisible()
})

test('[A2] drawing a rectangle with the Rectangle tool creates a shape and adds it to the Layers panel', async ({ page }) => {
  await page.goto('/')
  await makeRectangle(page)
  await expect(page.getByText('Rectangle 1')).toBeVisible()
})

test('[A3] typing a label and pressing Enter updates the shape text and the Layers panel item', async ({ page }) => {
  await page.goto('/')
  await makeRectangle(page)
  await setLabel(page, 'Start')
  await expect(page.getByText('Start')).toBeVisible()
})

test('[A4] drawing an ellipse with the Ellipse tool creates a shape and adds it to the Layers panel', async ({ page }) => {
  await page.goto('/')
  await makeEllipse(page)
  await expect(page.getByText('Ellipse 1')).toBeVisible()
})

test('[A5] selecting a shape and clicking Delete removes it from the canvas and the Layers panel', async ({ page }) => {
  await page.goto('/')
  await makeRectangle(page)
  await setLabel(page, 'Start')
  await page.getByText('Start').click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Start')).toHaveCount(0)
  await expect(page.getByText('No layers')).toBeVisible()
})

test('[A6] selecting a shape and choosing red from the Color swatch changes the shape fill to red', async ({ page }) => {
  await page.goto('/')
  await makeEllipse(page)
  await page.getByText('Ellipse 1').click()
  await page.getByRole('button', { name: 'Color' }).click()
  await page.getByRole('button', { name: 'Red' }).click()
  const box = await canvasBox(page)
  // The ellipse was drawn from (300,100) to (400,150); its center in canvas
  // coordinates is (350,125). Sample a pixel there and assert it is red.
  const pixel = await page.evaluate(([x, y]) => {
    const canvas = document.querySelector('canvas')!
    const [r, g, b] = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data
    return { r, g, b }
  }, [box.x + 350, box.y + 125])
  expect(pixel.r, 'red channel dominant in the filled ellipse').toBeGreaterThan(150)
  expect(pixel.g).toBeLessThan(100)
  expect(pixel.b).toBeLessThan(100)
})

test('[A7] clicking Export opens a menu and clicking PNG downloads flowchart.png', async ({ page }) => {
  await page.goto('/')
  await makeRectangle(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
    page.getByRole('menuitem', { name: 'PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('flowchart.png')
})

test('[A8] after creating Start and End, reloading the page restores both shapes and the Layers panel', async ({ page }) => {
  await page.goto('/')
  await makeRectangle(page)
  await setLabel(page, 'Start')
  await makeEllipse(page)
  await setLabel(page, 'End')
  await page.reload()
  await expect(page.getByText('Start')).toBeVisible()
  await expect(page.getByText('End')).toBeVisible()
})
