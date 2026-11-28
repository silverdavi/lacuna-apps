// size: the built app is at most 2 MB in all, and its JavaScript at most 400 KB once gzipped.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { skip, verdict, walk } from './lib.mjs'

export const id = 'size'
export const LIMITS = { distBytes: 2 * 1024 * 1024, jsGzipBytes: 400 * 1024 }

const kb = (n) => `${Math.round(n / 1024)} KB`

export function measure(dist) {
  let distBytes = 0
  let jsGzipBytes = 0
  for (const rel of walk(dist, { skip: [] })) {
    const buf = fs.readFileSync(path.join(dist, rel))
    distBytes += buf.length
    if (/\.[cm]?js$/.test(rel)) jsGzipBytes += zlib.gzipSync(buf, { level: 9 }).length
  }
  return { distBytes, jsGzipBytes }
}

export async function run(ctx) {
  if (!ctx.build) return skip('the app was not built')
  if (!ctx.build.ok) return verdict([{ message: 'the app did not build, so its size is unknown' }])
  const m = measure(ctx.build.dist)
  const findings = []
  if (m.distBytes > LIMITS.distBytes) findings.push({ message: `the built app is ${kb(m.distBytes)}; the limit is ${kb(LIMITS.distBytes)}`, fix: 'Shrink or remove large images, sounds and fonts. The toolbox fonts are already included.' })
  if (m.jsGzipBytes > LIMITS.jsGzipBytes) findings.push({ message: `the JavaScript is ${kb(m.jsGzipBytes)} gzipped; the limit is ${kb(LIMITS.jsGzipBytes)}`, fix: 'Remove unused code and large inline data.' })
  return verdict(findings, { measured: m, limits: LIMITS })
}
