import { expect, test, type Page } from '@playwright/test'

// Read a cell from the DOM the exact way the real test's parsePos + cells() do,
// and print raw (parsed) vs name vs mapped row/col for a handful of cells.
test('debug names', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Game' }).click()
  const dump = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role="cell"]')) as HTMLElement[]
    const parsePos = (n: HTMLElement): { row: number; col: number } | null => {
      let row: number | null = null
      let col: number | null = null
      const dr = n.getAttribute('data-row')
      const dc = n.getAttribute('data-col')
      if (dr !== null && dc !== null) {
        const r = Number(dr)
        const c = Number(dc)
        if (!Number.isNaN(r) && !Number.isNaN(c)) {
          row = r
          col = c
        }
      }
      if (row === null || col === null) {
        const label = n.getAttribute('aria-label') ?? ''
        const m = label.match(/row\s+(\d+)[\s,]+column\s+(\d+)/i)
        if (m) {
          row = Number(m[1])
          col = Number(m[2])
        }
      }
      if (row === null || col === null) return null
      return { row, col }
    }
    return els.slice(0, 4).map((el) => {
      const raw = parsePos(el)
      const label = el.getAttribute('aria-label') ?? ''
      // replicate cellName(raw)
      let name = ''
      if (raw) {
        const pos = `row ${raw.row}, column ${raw.col}`
        name = `hidden, ${pos}`
      }
      return {
        dataRow: el.getAttribute('data-row'),
        dataCol: el.getAttribute('data-col'),
        label,
        raw,
        nameFromRaw: name,
        mappedRow: raw ? raw.row + 1 : null,
        mappedCol: raw ? raw.col + 1 : null,
      }
    })
  })
  console.log(JSON.stringify(dump, null, 2))
  expect(true).toBe(true)
})
