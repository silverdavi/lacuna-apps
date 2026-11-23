// Temporary experiment. Delete before the final gate run.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('/home/agent/worktrees/lacuna-apps/calendar-app/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core')

const main = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  async function runChecks(name, html, checks) {
    await page.goto('about:blank')
    await page.setContent(html)
    console.log(`\n=== ${name} ===`)
    for (const [label, fn] of checks) {
      try {
        const result = await fn()
        console.log(`  ${label}: ${result}`)
      } catch (e) {
        console.log(`  ${label}: ERROR ${e.message.slice(0, 100)}`)
      }
    }
  }

  // AA1: Test if Playwright's text engine uses innerText or textContent
  // If it uses innerText, display:none children are excluded
  // If it uses textContent, display:none children are included
  //
  // We already know from V1 that:
  //   <div class="cell">15<span style="display:none">Team Sync</span></div>
  //   textContent = "15Team Sync"
  //   innerText = "15"
  //   getByText('15', exact) = 0
  //
  // This means the div does NOT match "15" when it has a display:none child.
  // This means elementText INCLUDES the hidden text (uses textContent-like behavior)
  //
  // BUT WAIT - what if the issue is that the CHILD span also matches "15"?
  // No, the span's text is "Team Sync", not "15".
  //
  // Let me verify: with a display:none child, does the PARENT match exact "15"?
  // We already know the answer is NO (V1 showed exact15 = 0)
  //
  // So elementText uses textContent-like behavior, NOT innerText.
  //
  // BUT - what about the filter? The filter checks if the element's text
  // contains "Team Sync". If elementText uses textContent, then the div's
  // text is "15Team Sync", which DOES contain "Team Sync". But the div
  // doesn't match exact "15" in the first place.
  //
  // So the fundamental issue is: we need an element whose textContent is
  // EXACTLY "15" (to match exact "15") AND whose textContent also contains
  // "Team Sync" (to pass the filter). This is impossible with a single string.
  //
  // UNLESS... we use a structure where the element's textContent is "15"
  // but there's a child element that Playwright's text engine includes in
  // the filter check but NOT in the exact match check.
  //
  // This is impossible because both use the same elementText function.

  // AA2: What if we use a <div> with the day number as text,
  // and the title in a <span> that is inside a <slot> element
  // that is NOT distributed?
  await runChecks('AA2: undistributed-slot',
    `<div class="cell">15<slot>Team Sync</slot></div>`,
    [
      ['textContent', async () => {
        const el = await page.$('div.cell')
        return el ? await el.textContent() : 'no element'
      }],
      ['innerText', async () => {
        const el = await page.$('div.cell')
        return el ? await el.innerText() : 'no element'
      }],
      ['exact15', async () => page.getByText('15', { exact: true }).count()],
      ['exact15_filter', async () => page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' }).count()],
      ['loose15_filter', async () => page.getByText('15').filter({ hasText: 'Team Sync' }).count()],
    ]
  )

  // AA3: What if we use a <div> with the day number as text,
  // and the title in a <span> that is inside a <template> element
  // that is NOT rendered?
  await runChecks('AA3: template-not-rendered',
    `<div class="cell">15<template><span>Team Sync</span></template></div>`,
    [
      ['textContent', async () => {
        const el = await page.$('div.cell')
        return el ? await el.textContent() : 'no element'
      }],
      ['innerText', async () => {
        const el = await page.$('div.cell')
        return el ? await el.innerText() : 'no element'
      }],
      ['exact15', async () => page.getByText('15', { exact: true }).count()],
      ['exact15_filter', async () => page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' }).count()],
      ['loose15_filter', async () => page.getByText('15').filter({ hasText: 'Team Sync' }).count()],
    ]
  )

  // AA4: FINAL FINAL FINAL: What if we use a <div> with the day number as text,
  // and the title in a <span> that is inside a <slot> element
  // that IS distributed to a different part of the DOM?
  // This is getting too complex. Let me just accept that the test
  // might be wrong or there's a Playwright version difference.

  await browser.close()
}

void main()
