import fs from 'node:fs'
import path from 'node:path'

const roots = ['apps', 'template', 'toolbox']
const needles = ['fetch(', 'eval(', 'new Function']
const skip = new Set(['node_modules', 'dist'])
const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css'])

function walk(dir, out) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (exts.has(path.extname(ent.name))) out.push(p)
  }
}

const files = []
for (const root of roots) walk(root, files)

let failed = 0
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  for (const needle of needles) {
    if (text.includes(needle)) {
      failed++
      console.error(`${file} contains ${needle}`)
    }
  }
}
if (failed) process.exit(1)
console.log(`checked ${files.length} files`)
