// types: `tsc --noEmit` passes for the app, using the TypeScript from the base branch.
// tsc reads tsconfig.json but never runs code from the app folder.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { skip, verdict } from './lib.mjs'

export const id = 'types'
const require = createRequire(import.meta.url)

export async function run(ctx) {
  if (!ctx.slug || !ctx.overlaid) return skip('no single app to check')
  const tsconfig = path.join(ctx.appDir, 'tsconfig.json')
  if (!fs.existsSync(tsconfig)) return verdict([{ file: `apps/${ctx.slug}/tsconfig.json`, message: 'the app has no tsconfig.json', fix: 'Copy template/tsconfig.json.' }])
  const tsc = require.resolve('typescript/bin/tsc')
  const r = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '-p', tsconfig], { cwd: ctx.appDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const findings = []
  for (const line of (r.stdout + r.stderr).split('\n')) {
    const m = line.match(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/)
    if (m) findings.push({ file: `apps/${ctx.slug}/${path.relative(ctx.appDir, path.resolve(ctx.appDir, m[1]))}`, line: Number(m[2]), message: `${m[3]} ${m[4]}` })
    else if (/error TS\d+/.test(line)) findings.push({ message: line.trim() })
  }
  if (r.status !== 0 && !findings.length) findings.push({ message: `tsc exited with ${r.status}` })
  return verdict(findings.slice(0, 50), { measured: { errors: findings.length } })
}
