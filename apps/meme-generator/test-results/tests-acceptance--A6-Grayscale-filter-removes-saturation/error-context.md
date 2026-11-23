# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A6] Grayscale filter removes saturation
- Location: tests/acceptance.spec.ts:111:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  12  | 
  13  | // Write cat.png to a temp path so setInputFiles can use it.
  14  | function catPngPath(): string {
  15  |   const dir = join(tmpdir(), 'meme-acceptance')
  16  |   const path = join(dir, 'cat.png')
  17  |   mkdirSync(dir, { recursive: true })
  18  |   writeFileSync(path, CAT_PNG)
  19  |   return path
  20  | }
  21  | 
  22  | test('[A1] shows heading, no-image text, and upload button with no image', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await expect(page.getByRole('heading', { name: 'Meme Maker' })).toBeVisible()
  25  |   await expect(page.getByText('No image loaded')).toBeVisible()
  26  |   await expect(page.getByRole('button', { name: 'Upload image' })).toBeVisible()
  27  | })
  28  | 
  29  | test('[A2] uploading cat.png replaces the placeholder and shows the image', async ({ page }) => {
  30  |   await page.goto('/')
  31  |   const input = page.locator('input[type="file"]').first()
  32  |   await input.setInputFiles(catPngPath())
  33  |   await expect(page.getByText('No image loaded')).toHaveCount(0)
  34  |   await expect(page.getByText('Image loaded: cat.png')).toBeVisible()
  35  |   const canvas = page.locator('canvas').first()
  36  |   await expect(canvas).toBeVisible()
  37  | })
  38  | 
  39  | async function loadCat(page: Page) {
  40  |   const input = page.locator('input[type="file"]').first()
  41  |   await input.setInputFiles(catPngPath())
  42  |   await expect(page.getByText('Image loaded: cat.png')).toBeVisible()
  43  | }
  44  | 
  45  | test('[A3] top and bottom text render on the canvas', async ({ page }) => {
  46  |   await page.goto('/')
  47  |   await loadCat(page)
  48  |   await page.getByLabel('Top text').fill('TOP TEXT')
  49  |   await page.getByLabel('Bottom text').fill('BOTTOM TEXT')
  50  |   // Verify the text was actually painted onto the canvas by sampling pixels
  51  |   // in the top band and bottom band where the white text should be.
  52  |   const topPixel = await page.evaluate(() => {
  53  |     const c = document.querySelector('canvas')
  54  |     if (!c) return null
  55  |     const ctx = c.getContext('2d')!
  56  |     const d = ctx.getImageData(0, 0, c.width, c.height).data
  57  |     let whiteish = 0
  58  |     for (let i = 0; i < d.length; i += 4) {
  59  |       if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) whiteish++
  60  |     }
  61  |     return whiteish
  62  |   })
  63  |   expect(topPixel, 'white text pixels present on canvas').toBeGreaterThan(50)
  64  |   // The text strings must be rendered (not just typed into hidden fields).
  65  |   await expect(page.getByLabel('Top text')).toHaveValue('TOP TEXT')
  66  |   await expect(page.getByLabel('Bottom text')).toHaveValue('BOTTOM TEXT')
  67  | })
  68  | 
  69  | test('[A4] rotate 90° keeps text anchored to top and bottom', async ({ page }) => {
  70  |   await page.goto('/')
  71  |   await loadCat(page)
  72  |   await page.getByLabel('Top text').fill('TOP TEXT')
  73  |   await page.getByLabel('Bottom text').fill('BOTTOM TEXT')
  74  |   await page.getByRole('button', { name: 'Rotate 90°' }).click()
  75  |   // After rotation the canvas still shows white text in the top band.
  76  |   const topRow = await page.evaluate(() => {
  77  |     const c = document.querySelector('canvas')
  78  |     if (!c) return -1
  79  |     const ctx = c.getContext('2d')!
  80  |     const d = ctx.getImageData(0, 0, c.width, 8).data
  81  |     let whiteish = 0
  82  |     for (let i = 0; i < d.length; i += 4) {
  83  |       if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) whiteish++
  84  |     }
  85  |     return whiteish
  86  |   })
  87  |   expect(topRow, 'top text still anchored after rotate').toBeGreaterThan(50)
  88  | })
  89  | 
  90  | test('[A5] flip horizontal mirrors image, top text stays left-aligned', async ({ page }) => {
  91  |   await page.goto('/')
  92  |   await loadCat(page)
  93  |   await page.getByLabel('Top text').fill('TOP TEXT')
  94  |   await page.getByRole('button', { name: 'Flip horizontal' }).click()
  95  |   // Sample the top-left corner region: black outline pixels of the text
  96  |   // should be near the left edge, confirming left alignment.
  97  |   const topLeft = await page.evaluate(() => {
  98  |     const c = document.querySelector('canvas')
  99  |     if (!c) return -1
  100 |     const ctx = c.getContext('2d')!
  101 |     const d = ctx.getImageData(0, 0, 40, 20).data
  102 |     let darkish = 0
  103 |     for (let i = 0; i < d.length; i += 4) {
  104 |       if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60) darkish++
  105 |     }
  106 |     return darkish
  107 |   })
  108 |   expect(topLeft, 'black outline of top text near left edge after flip').toBeGreaterThan(10)
  109 | })
  110 | 
  111 | test('[A6] Grayscale filter removes saturation', async ({ page }) => {
> 112 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  113 |   await loadCat(page)
  114 |   await page.getByLabel('Filter').selectOption('Grayscale')
  115 |   await expect(page.getByLabel('Filter')).toHaveValue('Grayscale')
  116 |   // The red square should now be desaturated: R, G, B channels nearly equal.
  117 |   const spread = await page.evaluate(() => {
  118 |     const c = document.querySelector('canvas')
  119 |     if (!c) return -1
  120 |     const ctx = c.getContext('2d')!
  121 |     const d = ctx.getImageData(0, 0, c.width, c.height).data
  122 |     let maxSpread = 0
  123 |     for (let i = 0; i < d.length; i += 4) {
  124 |       const r = d[i], g = d[i + 1], b = d[i + 2]
  125 |       const spread = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b))
  126 |       if (spread > maxSpread) maxSpread = spread
  127 |     }
  128 |     return maxSpread
  129 |   })
  130 |   expect(spread, 'no color saturation after grayscale').toBeLessThan(30)
  131 | })
  132 | 
  133 | test('[A7] export PNG downloads meme.png with overlays', async ({ page }) => {
  134 |   await page.goto('/')
  135 |   await loadCat(page)
  136 |   await page.getByLabel('Top text').fill('TOP TEXT')
  137 |   await page.getByLabel('Bottom text').fill('BOTTOM TEXT')
  138 |   const [download] = await Promise.all([
  139 |     page.waitForEvent('download'),
  140 |     page.getByRole('button', { name: 'Export PNG' }).click(),
  141 |   ])
  142 |   expect(download.suggestedFilename()).toBe('meme.png')
  143 |   const data = readFileSync((await download.path())!)
  144 |   // A non-trivial PNG is bigger than the 14-byte header of an empty file.
  145 |   expect(data.length, 'exported file is a real PNG').toBeGreaterThan(100)
  146 | })
  147 | 
  148 | test('[A8] top text and image persist across a reload', async ({ page }) => {
  149 |   await page.goto('/')
  150 |   await loadCat(page)
  151 |   await page.getByLabel('Top text').fill('TOP TEXT')
  152 |   await page.reload()
  153 |   await expect(page.getByText('Image loaded: cat.png')).toBeVisible()
  154 |   await expect(page.getByLabel('Top text')).toHaveValue('TOP TEXT')
  155 |   // The canvas still has the top text painted.
  156 |   const topRow = await page.evaluate(() => {
  157 |     const c = document.querySelector('canvas')
  158 |     if (!c) return -1
  159 |     const ctx = c.getContext('2d')!
  160 |     const d = ctx.getImageData(0, 0, c.width, 8).data
  161 |     let whiteish = 0
  162 |     for (let i = 0; i < d.length; i += 4) {
  163 |       if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) whiteish++
  164 |     }
  165 |     return whiteish
  166 |   })
  167 |   expect(topRow, 'top text still painted after reload').toBeGreaterThan(50)
  168 | })
  169 | 
```