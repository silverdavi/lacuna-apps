// tokens: no hex colors and no raw pixel sizes in the app's source. Colors, type and spacing come from
// the toolbox tokens; pixel sizes are written as token math, for example calc(8px * var(--sf)).
// The same rule as scripts/check-app.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { skip, verdict, walk } from './lib.mjs'

export const id = 'tokens'

const allowedPx = /calc\(\s*[\d.]+px\s*\*\s*var\(--(?:tf|sf)\)\s*\)/g
const hex = /#[0-9a-fA-F]{3,8}\b/
const px = /\d(?:\.\d+)?px\b/

export async function run(ctx) {
  if (!ctx.slug || !ctx.overlaid) return skip('no single app to check')
  const src = path.join(ctx.appDir, 'src')
  const findings = []
  for (const rel of walk(src, { skip: ['node_modules', 'dist'] }).filter((f) => /\.(tsx?|jsx?|css)$/.test(f))) {
    fs.readFileSync(path.join(src, rel), 'utf8').split('\n').forEach((line, i) => {
      const stripped = line.replace(allowedPx, '')
      if (hex.test(stripped) || px.test(stripped)) findings.push({ file: `apps/${ctx.slug}/src/${rel}`, line: i + 1, message: 'hex color or raw px size', fix: 'Use a token (var(--…)) or token math such as calc(8px * var(--sf)).' })
    })
  }
  return verdict(findings.slice(0, 50), { measured: { problems: findings.length } })
}
