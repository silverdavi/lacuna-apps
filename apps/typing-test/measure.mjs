import { chromium } from '@playwright/test'

const PORT = 4189
const passage = 'The quick brown fox jumps over the lazy dog'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })

function tones() {
  return page.evaluate(() => {
    const field = [...document.querySelectorAll('label')].find((l) => (l.textContent ?? '').includes('Passage'))
    const root = field ?? document
    const walker = document.createTreeWalker(root, 1)
    let n = walker.currentNode
    let green = 0, red = 0, grey = 0, total = 0
    while (n) {
      if (n.nodeType === 3 && (n.textContent ?? '').length) {
        const cs = getComputedStyle(n.parentElement)
        const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        const [r, g, b] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 255, 255]
        if (g > r + 30 && g > b + 30) green++
        else if (r > g + 30 && r > b + 30) red++
        else grey++
        total++
      }
      n = walker.nextNode()
    }
    return { green, red, grey, total }
  })
}

function timer() {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].filter(
      (el) => (el.textContent ?? '').trim().match(/^\d{1,2}:\d{2}$/) && el.children.length === 0,
    )
    return all.length ? all[all.length - 1].textContent.trim() : ''
  })
}

// A4: type "The quik" -> expect red=8 green=0 grey=35 total=43
await page.getByRole('button', { name: 'Start Test' }).click()
await page.locator('textarea, input[type="text"]').first().focus()
await page.keyboard.type('The quik')
console.log('A4 tones (want red=8 green=0 grey=35 total=43):', JSON.stringify(await tones()))

// A5: fresh reload, type full passage -> timer > 00:00, acc 100.0, wpm small
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })
await page.getByRole('button', { name: 'Start Test' }).click()
await page.locator('textarea, input[type="text"]').first().focus()
await page.keyboard.type(passage)
await page.waitForFunction(() => (document.body.textContent ?? '').includes('WPM:'), { timeout: 5000 })
const body = await page.evaluate(() => document.body.textContent)
console.log('A5 timer (want > 00:00):', await timer())
console.log('A5 wpm:', (body.match(/WPM: [\d.]+/) || ['<none>'])[0])
console.log('A5 acc:', (body.match(/Accuracy: [\d.]+%/) || ['<none>'])[0])

const t = await timer()
const secs = t ? t.split(':').map(Number) : [0, 0]
console.log('A5 timerSeconds > 0:', secs[0] * 60 + secs[1] > 0)

// A7: one typo -> acc 95.8%  (fresh context per test in the real suite)
await page.evaluate(() => window.localStorage.clear())
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })
await page.getByRole('button', { name: 'Start Test' }).click()
await page.locator('textarea, input[type="text"]').first().focus()
const target7 = passage.replace('quick', 'quikc')
console.log('A7 target length (want 43):', target7.length)
await page.keyboard.type(target7)
const input7 = await page.evaluate(() => {
  const el = document.querySelector('textarea, input[type="text"]')
  return el ? el.value : ''
})
console.log('A7 input length (want 43):', input7.length, '| value:', JSON.stringify(input7))
await page.waitForFunction(() => (document.body.textContent ?? '').includes('Accuracy:'), { timeout: 5000 })
const body7 = await page.evaluate(() => document.body.textContent)
console.log('A7 acc (want 95.8%):', (body7.match(/Accuracy: [\d.]+%/) || ['<none>'])[0])

// A8: pause freezes, resume continues
await page.evaluate(() => window.localStorage.clear())
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })
await page.getByRole('button', { name: 'Start Test' }).click()
await page.locator('textarea, input[type="text"]').first().focus()
await page.keyboard.type('The qu')
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Pause' }).click()
const p = await timer()
const a = await timer()
const b = await timer()
console.log('A8 paused/frozen (want all equal):', p, a, b)
await page.getByRole('button', { name: 'Resume' }).click()
await page.waitForTimeout(1200)
console.log('A8 after resume >= paused:', await timer(), '>=', p)

await browser.close()
