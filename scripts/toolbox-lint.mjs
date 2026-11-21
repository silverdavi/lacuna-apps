// Toolbox reuse check for one app: node scripts/toolbox-lint.mjs <apps/slug> [--report] [--assume-bridged]
//
// Fails an app that hand-rolls something a bridged toolbox module (toolbox/modules.json entries with a
// "bridge" key) already provides. The rules are narrow on purpose; each one names a pattern that is
// that capability and nothing else, and is active only while its module is bridged:
//   host-mock-store  a src/ file that reads and writes localStorage through JSON.parse and JSON.stringify,
//                    in an app that does not import @lacuna/host-mock
//   qr-encode        a src/ file with the QR Reed-Solomon field polynomial (0x11d) and "qr" in it
//   random-prng      a src/ file that defines its own mulberry32
// and checks that every @lacuna/<module> the app imports is pinned exactly ("workspace:V" in package.json,
// "V" in requires.modules of lacuna.app.json) to a version that is in toolbox/modules/.
// An exception is a line "<slug> <rule> <reason>" in scripts/toolbox-lint.allow, which a build cannot edit
// (the path guard rejects any branch that touches scripts/).
// --assume-bridged treats every rule as active, to measure false positives before a module lands.
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const report = args.includes('--report')
const assume = args.includes('--assume-bridged')
const dir = args.find((a) => !a.startsWith('--'))
if (!dir) throw new Error('usage: toolbox-lint.mjs <apps/slug> [--report] [--assume-bridged]')
const here = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(here, '..')
const slug = path.basename(path.resolve(dir))
const problems = []
const bad = (rule, m) => problems.push({ rule, m })

const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'))
  } catch {
    return d
  }
}
const catalog = readJson(path.join(root, 'toolbox/modules.json'), { modules: [] })
const bridged = new Map(catalog.modules.filter((m) => m.bridge && m.status === 'exists').map((m) => [m.id, m]))
const allowed = new Set()
const allowFile = path.join(here, 'toolbox-lint.allow')
if (fs.existsSync(allowFile)) {
  for (const line of fs.readFileSync(allowFile, 'utf8').split('\n')) {
    const [s, rule] = line.trim().split(/\s+/)
    if (s && !s.startsWith('#') && rule) allowed.add(`${s} ${rule}`)
  }
}

const files = []
const walk = (d) => {
  if (!fs.existsSync(d)) return
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walk(p)
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name) && !/\.(test|spec)\.[jt]sx?$/.test(e.name)) {
      files.push([path.relative(dir, p), fs.readFileSync(p, 'utf8')])
    }
  }
}
walk(path.join(dir, 'src'))

const importRe = /^\s*(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\bfrom\s*)?['"](@lacuna\/[a-z0-9-]+)(?:\/[^'"]*)?['"]|\bimport\(\s*['"](@lacuna\/[a-z0-9-]+)['"]/gm
const imported = new Set()
for (const [, text] of files) for (const m of text.matchAll(importRe)) imported.add(m[1] ?? m[2])

const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const RULES = [
  {
    rule: 'host-mock-store', module: '@lacuna/host-mock',
    hit: (t) => /localStorage\s*\.\s*getItem\s*\(/.test(t) && /localStorage\s*\.\s*setItem\s*\(/.test(t) &&
      /JSON\s*\.\s*parse\s*\(/.test(t) && /JSON\s*\.\s*stringify\s*\(/.test(t),
    what: 'a hand-rolled localStorage JSON store',
  },
  { rule: 'qr-encode', module: '@lacuna/qr-encode', hit: (t) => /\b0x11[dD]\b/.test(t) && /qr/i.test(t), what: 'a hand-written QR encoder' },
  {
    rule: 'random-prng', module: '@lacuna/random',
    hit: (t) => /\bfunction\s+mulberry32\b|\b(?:const|let|var)\s+mulberry32\s*=/.test(t), what: 'its own mulberry32 generator',
  },
]
for (const r of RULES) {
  const mod = bridged.get(r.module)
  if (!mod && !assume) continue
  if (imported.has(r.module)) continue
  for (const [rel, text] of files) {
    if (r.hit(strip(text))) {
      const v = mod ? mod.version : '<version>'
      bad(r.rule, `${rel} has ${r.what}; import ${r.module} ${v} instead (toolbox/modules/${r.module.slice(8)}/${v}/README.md)`)
    }
  }
}

const pkg = readJson(path.join(dir, 'package.json'), {})
const manifest = readJson(path.join(dir, 'lacuna.app.json'), {})
const req = manifest.requires?.modules ?? {}
for (const id of [...imported].sort()) {
  if (!bridged.has(id)) continue
  const dep = (pkg.dependencies ?? {})[id]
  const v = typeof dep === 'string' && dep.startsWith('workspace:') ? dep.slice('workspace:'.length) : null
  if (!v || !/^\d+\.\d+\.\d+$/.test(v)) {
    bad('module-pin', `src imports ${id}; package.json must list it as "workspace:<exact version>", e.g. "workspace:${bridged.get(id).version}"`)
    continue
  }
  if (!fs.existsSync(path.join(root, 'toolbox/modules', id.slice(8), v, 'package.json'))) bad('module-pin', `${id} ${v} is not in toolbox/modules/`)
  if (req[id] !== v) bad('module-pin', `lacuna.app.json requires.modules must pin "${id}": "${v}", the version in package.json`)
}

const live = problems.filter((p) => !allowed.has(`${slug} ${p.rule}`))
const waived = problems.length - live.length
if (live.length) {
  for (const p of live) console.error(`  ${report ? 'WARN' : 'toolbox'}: ${p.rule}: ${p.m}`)
  if (!report) process.exit(1)
} else {
  const uses = [...imported].filter((i) => bridged.has(i))
  console.log(`toolbox ok: ${dir}${uses.length ? ' imports ' + uses.join(', ') : ''}${waived ? ` (${waived} waived in scripts/toolbox-lint.allow)` : ''}`)
}
process.exit(0)
