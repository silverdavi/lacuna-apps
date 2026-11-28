// The lockfile may never gain a package from a pull request. A maintainer regenerates it after merge.
// Usage: node scripts/checks/lockfile.mjs <lockfile before install> <lockfile after install>
// Exits 1 and names each new entry when the `packages` section gained any key.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Keys of the top-level `packages:` map in a pnpm lockfile (versions 6 and 9).
export function packageKeys(text) {
  const keys = new Set()
  let inside = false
  for (const line of text.split('\n')) {
    if (/^\S/.test(line)) { inside = /^packages:\s*$/.test(line); continue }
    if (!inside) continue
    const m = line.match(/^ {2}(?! )(['"]?)(.+?)\1:\s*$/)
    if (m) keys.add(m[2])
  }
  return keys
}

export function addedPackages(beforeText, afterText) {
  const before = packageKeys(beforeText)
  return [...packageKeys(afterText)].filter((k) => !before.has(k)).sort()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [before, after] = process.argv.slice(2)
  if (!before || !after) { console.error('Usage: lockfile.mjs <before> <after>'); process.exit(2) }
  const added = addedPackages(fs.readFileSync(before, 'utf8'), fs.readFileSync(after, 'utf8'))
  for (const k of added) console.log(`new package in the lockfile: ${k}`)
  if (added.length) {
    console.log('A pull request cannot add packages. Use only the dependencies in schema/allowlist.json, at the versions the lockfile already has.')
    process.exit(1)
  }
  console.log(`lockfile ok (${packageKeys(fs.readFileSync(after, 'utf8')).size} packages, none new)`)
}
