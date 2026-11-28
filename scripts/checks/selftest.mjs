// Runs the gate against every fixture in scripts/checks/fixtures/ and compares the checks that failed
// with the fixture's `expect` list. The good fixture must pass; each bad one must fail on its rule and
// nothing else. Exits 1 on any difference.
// Usage: node scripts/checks/selftest.mjs [fixture names...]
import fs from 'node:fs'
import path from 'node:path'
import { here, readJson, root } from './lib.mjs'
import { runFixture } from './run.mjs'

const dir = path.join(here, 'fixtures')
const wanted = process.argv.slice(2)
const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'fixture.json'))).filter((n) => !wanted.length || wanted.includes(n)).sort()
const rows = []
let bad = 0
for (const name of names) {
  const spec = readJson(path.join(dir, name, 'fixture.json'))
  for (const p of spec.mustNotExist ?? []) fs.rmSync(path.join(root, p), { force: true })
  const t0 = Date.now()
  let failed
  let note = ''
  try {
    const r = await runFixture(path.join(dir, name))
    failed = r.checks.filter((c) => c.status === 'fail').map((c) => c.id).sort()
    const blocked = !r.ok
    if (blocked !== (spec.expect.length > 0)) note = `gate ${r.ok ? 'passed' : 'failed'}`
  } catch (e) {
    failed = ['(crashed)']
    note = e.message.split('\n')[0]
  }
  for (const p of spec.mustNotExist ?? []) if (fs.existsSync(path.join(root, p))) note = `${p} was written`
  const want = [...spec.expect].sort()
  const ok = !note && JSON.stringify(failed) === JSON.stringify(want)
  if (!ok) bad++
  rows.push(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(28)} expected [${want.join(', ')}] got [${failed.join(', ')}]${note ? ` (${note})` : ''} ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(rows.at(-1))
}
console.log(`\n${names.length} fixtures, ${bad} wrong`)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Gate self-test\n\n\`\`\`\n${rows.join('\n')}\n\`\`\`\n`)
process.exit(bad ? 1 : 0)
