import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(process.argv[2] ?? process.cwd())

function findRepo(start) {
  let dir = start
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'schema/validate.mjs'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`schema/validate.mjs not found above ${start}`)
}

const repoRoot = findRepo(appRoot)
const manifest = path.join(appRoot, 'lacuna.app.json')
if (!fs.existsSync(manifest)) {
  console.error(`missing ${manifest}`)
  process.exit(1)
}

const validated = spawnSync(process.execPath, [path.join(repoRoot, 'schema/validate.mjs'), manifest], { stdio: 'inherit' })
if (validated.status !== 0) process.exit(validated.status ?? 1)

const allowedPx = /calc\(\s*[\d.]+px\s*\*\s*var\(--(?:tf|sf)\)\s*\)/g
const hex = /#[0-9a-fA-F]{3,8}\b/
const px = /\d(?:\.\d+)?px\b/

function walk(dir, out) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?|css)$/.test(ent.name)) out.push(p)
  }
}

const files = []
walk(path.join(appRoot, 'src'), files)
let failed = 0
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const stripped = line.replace(allowedPx, '')
    if (hex.test(stripped) || px.test(stripped)) {
      failed++
      console.error(`${path.relative(appRoot, file)}:${i + 1} hex or raw px`)
      console.error(`  ${line.trim()}`)
    }
  })
}
if (failed) process.exit(1)
console.log(`hex/px ok (${files.length} files)`)
