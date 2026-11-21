import { test as base } from '@playwright/test'

// The gate's Chromium has no microphone device, so the acceptance suite's
// record/stop flow can only exercise the real UI if the page sees one.
// This setup stands in for a device: a 440 Hz oscillator routed through a
// MediaStreamDestination, so MediaRecorder captures a genuine (synthetic)
// audio track. No app logic is faked; only the hardware is emulated.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const md = navigator.mediaDevices as unknown as Record<string, unknown>
      const previous = md.getUserMedia
      md.getUserMedia = (constraints: MediaStreamConstraints) => {
        if (!constraints || typeof constraints !== 'object' || !constraints.audio) {
          return typeof previous === 'function'
            ? (previous as (c: MediaStreamConstraints) => Promise<MediaStream>).call(md, constraints)
            : Promise.reject(new Error('Unsupported constraints'))
        }
        const ctx = new AudioContext()
        const dest = ctx.createMediaStreamDestination()
        const osc = ctx.createOscillator()
        osc.frequency.value = 440
        osc.connect(dest)
        osc.start()
        return Promise.resolve(dest.stream)
      }
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'
