# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A4] drawing an ellipse with the Ellipse tool creates a shape and adds it to the Layers panel
- Location: tests/acceptance.spec.ts:52:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | async function canvasBox(page: Page) {
  4   |   const box = await page.locator('canvas').first().boundingBox()
  5   |   if (!box) throw new Error('no canvas found')
  6   |   return box
  7   | }
  8   | 
  9   | async function draw(page: Page, from: [number, number], to: [number, number]) {
  10  |   const box = await canvasBox(page)
  11  |   await page.mouse.move(box.x + from[0], box.y + from[1])
  12  |   await page.mouse.down()
  13  |   await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  14  |   await page.mouse.up()
  15  | }
  16  | 
  17  | async function makeRectangle(page: Page) {
  18  |   await page.getByRole('button', { name: 'Rectangle' }).click()
  19  |   await draw(page, [100, 100], [200, 150])
  20  | }
  21  | 
  22  | async function makeEllipse(page: Page) {
  23  |   await page.getByRole('button', { name: 'Ellipse' }).click()
  24  |   await draw(page, [300, 100], [400, 150])
  25  | }
  26  | 
  27  | async function setLabel(page: Page, text: string) {
  28  |   await page.getByLabel('Label').fill(text)
  29  |   await page.getByLabel('Label').press('Enter')
  30  | }
  31  | 
  32  | test('[A1] page shows the heading and the canvas with the Select tool active', async ({ page }) => {
  33  |   await page.goto('/')
  34  |   await expect(page.getByRole('heading', { name: 'Flowchart Editor' })).toBeVisible()
  35  |   await expect(page.locator('canvas').first()).toBeVisible()
  36  |   await expect(page.getByRole('button', { name: 'Select' })).toBeVisible()
  37  | })
  38  | 
  39  | test('[A2] drawing a rectangle with the Rectangle tool creates a shape and adds it to the Layers panel', async ({ page }) => {
  40  |   await page.goto('/')
  41  |   await makeRectangle(page)
  42  |   await expect(page.getByText('Rectangle 1')).toBeVisible()
  43  | })
  44  | 
  45  | test('[A3] typing a label and pressing Enter updates the shape text and the Layers panel item', async ({ page }) => {
  46  |   await page.goto('/')
  47  |   await makeRectangle(page)
  48  |   await setLabel(page, 'Start')
  49  |   await expect(page.getByText('Start')).toBeVisible()
  50  | })
  51  | 
  52  | test('[A4] drawing an ellipse with the Ellipse tool creates a shape and adds it to the Layers panel', async ({ page }) => {
> 53  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  54  |   await makeEllipse(page)
  55  |   await expect(page.getByText('Ellipse 1')).toBeVisible()
  56  | })
  57  | 
  58  | test('[A5] selecting a shape and clicking Delete removes it from the canvas and the Layers panel', async ({ page }) => {
  59  |   await page.goto('/')
  60  |   await makeRectangle(page)
  61  |   await setLabel(page, 'Start')
  62  |   await page.getByText('Start').click()
  63  |   await page.getByRole('button', { name: 'Delete' }).click()
  64  |   await expect(page.getByText('Start')).toHaveCount(0)
  65  |   await expect(page.getByText('No layers')).toBeVisible()
  66  | })
  67  | 
  68  | test('[A6] selecting a shape and choosing red from the Color swatch changes the shape fill to red', async ({ page }) => {
  69  |   await page.goto('/')
  70  |   await makeEllipse(page)
  71  |   await page.getByText('Ellipse 1').click()
  72  |   await page.getByRole('button', { name: 'Color' }).click()
  73  |   await page.getByRole('button', { name: 'Red' }).click()
  74  |   const box = await canvasBox(page)
  75  |   // The ellipse was drawn from (300,100) to (400,150); its center in canvas
  76  |   // coordinates is (350,125). Sample a pixel there and assert it is red.
  77  |   const pixel = await page.evaluate(([x, y]) => {
  78  |     const canvas = document.querySelector('canvas')!
  79  |     const [r, g, b] = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data
  80  |     return { r, g, b }
  81  |   }, [box.x + 350, box.y + 125])
  82  |   expect(pixel.r, 'red channel dominant in the filled ellipse').toBeGreaterThan(150)
  83  |   expect(pixel.g).toBeLessThan(100)
  84  |   expect(pixel.b).toBeLessThan(100)
  85  | })
  86  | 
  87  | test('[A7] clicking Export opens a menu and clicking PNG downloads flowchart.png', async ({ page }) => {
  88  |   await page.goto('/')
  89  |   await makeRectangle(page)
  90  |   const [download] = await Promise.all([
  91  |     page.waitForEvent('download'),
  92  |     page.getByRole('button', { name: 'Export' }).click(),
  93  |     page.getByRole('menuitem', { name: 'PNG' }).click(),
  94  |   ])
  95  |   expect(download.suggestedFilename()).toBe('flowchart.png')
  96  | })
  97  | 
  98  | test('[A8] after creating Start and End, reloading the page restores both shapes and the Layers panel', async ({ page }) => {
  99  |   await page.goto('/')
  100 |   await makeRectangle(page)
  101 |   await setLabel(page, 'Start')
  102 |   await makeEllipse(page)
  103 |   await setLabel(page, 'End')
  104 |   await page.reload()
  105 |   await expect(page.getByText('Start')).toBeVisible()
  106 |   await expect(page.getByText('End')).toBeVisible()
  107 | })
  108 | 
```