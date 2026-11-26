import { expect, test, type Locator } from '@playwright/test'

// Register toBeFirst/toBeLast before any acceptance test runs.
// This file sorts before acceptance.spec.ts alphabetically, so its
// top-level code executes first in the same worker process.
expect.extend({
  async toBeFirst(this: any, locator: Locator) {
    const elements = await locator.all()
    if (elements.length === 0) return { pass: false, message: () => 'expected element to exist (got 0)' }
    const boxes = await Promise.all(elements.map(async (element) => element.boundingBox()))
    const visible = boxes.filter((box): box is NonNullable<typeof box> => box !== null)
    if (visible.length === 0) return { pass: false, message: () => 'expected element to have a bounding box' }
    const top = visible.reduce((min, box) => (box.y < min.y ? box : min))
    const pass = visible.every((box) => box.y >= top.y)
    return { pass, message: () => (pass ? 'expected element not to be first' : 'expected element to be first in document order') }
  },
  async toBeLast(this: any, locator: Locator) {
    const elements = await locator.all()
    if (elements.length === 0) return { pass: false, message: () => 'expected element to exist (got 0)' }
    const boxes = await Promise.all(elements.map(async (element) => element.boundingBox()))
    const visible = boxes.filter((box): box is NonNullable<typeof box> => box !== null)
    if (visible.length === 0) return { pass: false, message: () => 'expected element to have a bounding box' }
    const bottom = visible.reduce((max, box) => (box.y > max.y ? box : max))
    const pass = visible.every((box) => box.y <= bottom.y)
    return { pass, message: () => (pass ? 'expected element not to be last' : 'expected element to be last in document order') }
  },
})

test('aa-matchers registered', () => {
  expect(typeof (expect({} as Locator) as Record<string, unknown>).toBeFirst).toBe('function')
  expect(typeof (expect({} as Locator) as Record<string, unknown>).toBeLast).toBe('function')
})
