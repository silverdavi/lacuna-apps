// One-off converter, kept out of the bundle (it lives in tools/, not src/).
// Usage: node tools/build-data.mjs <dir with trivia.jsonl and categories.json>
// Emits src/data/trivia.json: { categories: string[], rows: {id,c,t,q,a,n,r}[] }.
// id is the 0-based line number in trivia.jsonl, so it stays stable if rows are dropped.
//
// Spot-read of 30 random rows (seed 11) for factual errors. Nothing is dropped: the one row
// that looked wrong (id 2514, the Bootheel's northern edge at 36 30) is correct, because the
// Bootheel runs south from that parallel to 36 N.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
if (!process.argv[2]) {
  console.error('Usage: node tools/build-data.mjs <dir with trivia.jsonl and categories.json>')
  process.exit(1)
}
const src = path.resolve(process.argv[2])
const DROPPED = new Set()

const lines = fs.readFileSync(path.join(src, 'trivia.jsonl'), 'utf8').split('\n').filter(Boolean)
const cats = JSON.parse(fs.readFileSync(path.join(src, 'categories.json'), 'utf8')).map((c) => c.name)
const rows = []
lines.forEach((line, id) => {
  if (DROPPED.has(id)) return
  const r = JSON.parse(line)
  const c = cats.indexOf(r.category)
  if (c < 0) throw new Error(`unknown category ${r.category} at line ${id}`)
  rows.push({ id, c, t: r.tier, q: r.q, a: r.a, n: r.note || '', r: r.round || null })
})
const out = path.join(here, '../src/data/trivia.json')
fs.writeFileSync(out, JSON.stringify({ categories: cats, rows }))
console.log(`${rows.length} rows, ${cats.length} categories, ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`)
