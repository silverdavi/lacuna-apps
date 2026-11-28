// a11y: axe finds no serious or critical problems. Runs in the same browser session as the browser check.
import { results } from './browser.mjs'

export const id = 'a11y'

export async function run(ctx) {
  return results(ctx, 'a11y')
}
