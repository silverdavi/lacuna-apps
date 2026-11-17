// Implementation of scripts/sync-toolbox.sh. See that file for usage.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toolboxDir = path.join(root, 'toolbox')
const fontsCss = path.join(toolboxDir, 'fonts/fonts.css')
const allowFile = path.join(root, 'scripts/sync-toolbox.allow')

// ------------------------------------------------------------------ args

const args = process.argv.slice(2)
const opts = { dryRun: false, force: false, all: false, report: null, source: null, packages: [] }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--dry-run') opts.dryRun = true
  else if (a === '--force') opts.force = true
  else if (a === '--all') opts.all = true
  else if (a === '--report') opts.report = args[++i]
  else if (a === '--source') opts.source = args[++i]
  else if (a === '-h' || a === '--help') {
    console.log('usage: scripts/sync-toolbox.sh [--dry-run] [--report FILE] [--source DIR] [--force] (--all | <package...>)')
    process.exit(0)
  } else if (a.startsWith('-')) die(`unknown option ${a}`)
  else opts.packages.push(a)
}

const source = path.resolve(opts.source ?? process.env.LACUNA_PACKAGES ?? path.join(root, '../lacuna/app/packages'))
if (!fs.existsSync(source)) die(`source ${source} not found; pass --source or set LACUNA_PACKAGES`)
if (opts.all) {
  opts.packages = fs.readdirSync(source).filter((n) => fs.existsSync(path.join(source, n, 'package.json'))).sort()
}
if (!opts.packages.length) die('name at least one package, or pass --all')
for (const p of opts.packages) {
  if (!/^[a-z][a-z0-9-]*$/.test(p)) die(`bad package name ${p}`)
  if (!fs.existsSync(path.join(source, p, 'package.json'))) die(`${source}/${p} has no package.json`)
}

function die(msg) {
  console.error(`sync-toolbox: ${msg}`)
  process.exit(2)
}

// ------------------------------------------------------------------ rules

const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.html', '.json'])
// Same extensions and needles as scripts/forbid-network.mjs.
const FORBID_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css'])
const FORBID_NEEDLES = ['fetch(', 'eval(', 'new Function']
const HEADER_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css'])

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'tests', 'test', '__tests__', 'shots', '.turbo', '.vite'])
const SKIP_FILES = [
  [/^\.DS_Store$/, 'OS metadata'],
  [/^REGISTER\.md$/, 'monorepo wiring notes (demo app, platform registry)'],
  [/\.(test|spec)\.[cm]?[jt]sx?$/, 'test file'],
]
const SECRET_FILES = [/^\.env(\..*)?$/, /\.(pem|key|p12|pfx|keystore|jks)$/i, /^id_(rsa|dsa|ecdsa|ed25519)/, /^\.npmrc$/, /^\.netrc$/]

const PUBLIC_EMAIL_DOMAINS = /@(example\.(com|org|net)|[\w-]+\.example|[\w-]+\.test|users\.noreply\.github\.com)$/i
const PUBLIC_EMAILS = new Set((process.env.SYNC_PUBLIC_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))

// Top-level folders and files of the private monorepo that must not be named in public code.
const GOOGLE_FONTS = /@import\s+url\(\s*["']?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/
const PRIVATE_PATHS = String.raw`(?:brand|deck\d?|investor|yc|marketing|infra|server|gcp|platform|flow|docs|imaginecup|worker-notes|worker-logs)`
const RULES = [
  // secrets
  { id: 'secret-aws', cat: 'secret', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'secret-github', cat: 'secret', re: /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { id: 'secret-api-key', cat: 'secret', re: /\b(sk-(ant-)?[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|xox[abprs]-[A-Za-z0-9-]{10,})/ },
  { id: 'secret-private-key', cat: 'secret', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'secret-jwt', cat: 'secret', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { id: 'secret-assignment', cat: 'secret', re: /\b(api[_-]?key|secret|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd)\b\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i },
  { id: 'secret-url-credentials', cat: 'secret', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/'"@:]+:[^\s/'"@]+@/i },
  { id: 'env-read', cat: 'secret', re: /\b(process\.env|import\.meta\.env)\b/ },
  // private references
  { id: 'private-path', cat: 'private', re: /(\/Users\/|\/home\/[a-z]|[A-Z]:\\Users\\|~\/dev\/)/ },
  { id: 'private-host', cat: 'private', re: /\b(cat-studio|tailscale|[\w-]+\.ts\.net|[\w-]+\.(internal|lan|corp|local)\b|localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)/i },
  { id: 'private-email', cat: 'private', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/, filter: (m) => !PUBLIC_EMAIL_DOMAINS.test(m) && !PUBLIC_EMAILS.has(m.toLowerCase()) },
  { id: 'private-word', cat: 'private', re: /\b(investors?|yc|y combinator|pitch|deck|fundrais\w*|valuation|term sheet|cap table|runway|imagine ?cup|confidential|internal only|do not share)\b/i },
  { id: 'private-repo-file', cat: 'private', re: new RegExp(String.raw`(\.\.\/){3,}|(^|[\s'"\x60(\[])(\.\.\/)+${PRIVATE_PATHS}\b|\b${PRIVATE_PATHS}\/[\w./-]+|\b(app\/apps\/|app\/scripts\/|CONTRACT\.md|PROGRESS\.md|RESEARCH(-MORE)?\.md|WHAT-IS-LACUNA\.md)`) },
  // network
  { id: 'google-fonts', cat: 'network', re: GOOGLE_FONTS },
  { id: 'network-origin', cat: 'network', re: /(https?:)?\/\/[a-z0-9-]+(\.[a-z0-9-]+)+[^\s'"`)>]*/i, code: true, filter: (m) => /^https?:/i.test(m) && !/^https?:\/\/www\.w3\.org\//i.test(m) },
  { id: 'link', cat: 'info', re: /https?:\/\/[^\s'"`)>]+/i, docs: true },
]

function loadAllow() {
  if (!fs.existsSync(allowFile)) return []
  return fs.readFileSync(allowFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [file, rule, ...rest] = l.split(/\s+/)
    return { file, rule, text: rest.join(' ') }
  })
}
const allow = loadAllow()
const allowed = (pkg, rel, rule, line) => allow.some((a) => a.file === `${pkg}/${rel}` && a.rule === rule && line.includes(a.text))

// ------------------------------------------------------------------ scan

function git(...a) {
  const r = spawnSync('git', ['-C', source, ...a], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : null
}
const sourceCommit = git('rev-parse', '--short', 'HEAD')

function walk(dir, base, files, skipped) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    const rel = path.relative(base, abs)
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) skipped.push({ rel: rel + '/', why: ent.name === 'node_modules' || ent.name === 'dist' ? 'build output' : 'tests or artifacts' })
      else walk(abs, base, files, skipped)
      continue
    }
    const skip = SKIP_FILES.find(([re]) => re.test(ent.name))
    if (skip) { skipped.push({ rel, why: skip[1] }); continue }
    // A .d.ts next to its .ts/.tsx source is stale emit; keep ambient ones like mammoth.d.ts.
    if (ent.name.endsWith('.d.ts')) {
      const stem = abs.slice(0, -5)
      if (fs.existsSync(stem + '.ts') || fs.existsSync(stem + '.tsx')) { skipped.push({ rel, why: 'stale declaration emit' }); continue }
    }
    files.push(rel)
  }
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0)
}

function fontFamiliesProvided() {
  if (!fs.existsSync(fontsCss)) return new Set()
  return new Set([...fs.readFileSync(fontsCss, 'utf8').matchAll(/font-family:\s*["']([^"']+)["']/g)].map((m) => m[1]))
}

function scanPackage(name) {
  const dir = path.join(source, name)
  const files = []
  const skipped = []
  walk(dir, dir, files, skipped)
  files.sort()
  const findings = []
  const add = (f) => {
    if (f.line && findings.some((g) => g.rule === f.rule && g.file === f.file && g.line === f.line && g.match === f.match)) return
    findings.push(f)
  }
  let lines = 0

  const dirty = git('status', '--porcelain', '--', dir)
  if (dirty) add({ sev: 'block', rule: 'source-uncommitted', file: '.', line: 0, text: 'uncommitted changes in the monorepo package; commit them first so the sync is reproducible' })

  for (const rel of files) {
    const base = path.basename(rel)
    const ext = path.extname(rel)
    if (SECRET_FILES.some((re) => re.test(base))) {
      add({ sev: 'block', rule: 'secret-file', file: rel, line: 0, text: 'file type that usually holds credentials' })
      continue
    }
    const buf = fs.readFileSync(path.join(dir, rel))
    if (isBinary(buf)) { add({ sev: 'info', rule: 'binary', file: rel, line: 0, text: `${buf.length} bytes, copied as is` }); continue }
    const text = buf.toString('utf8')
    const isCode = CODE_EXTS.has(ext)
    text.split('\n').forEach((line, i) => {
      lines++
      if (FORBID_EXTS.has(ext)) {
        for (const n of FORBID_NEEDLES) if (line.includes(n)) add({ sev: 'block', rule: 'banned-api', file: rel, line: i + 1, text: line.trim(), match: n })
      } else {
        for (const n of FORBID_NEEDLES) if (line.includes(n)) add({ sev: 'info', rule: 'banned-api-in-docs', file: rel, line: i + 1, text: line.trim(), match: n })
      }
      for (const r of RULES) {
        if (r.code && !isCode) continue
        if (r.docs && isCode) continue
        const re = new RegExp(r.re.source, r.re.flags.replace('g', '') + 'g')
        for (const m of line.matchAll(re)) {
          const hit = m[0]
          if (r.filter && !r.filter(hit)) continue
          if (r.id === 'network-origin' && GOOGLE_FONTS.test(line)) continue
          if (allowed(name, rel, r.id, line)) { add({ sev: 'info', rule: `${r.id} (allowlisted)`, file: rel, line: i + 1, text: line.trim(), match: hit }); continue }
          let sev = r.cat === 'info' ? 'info' : 'block'
          let note
          if (r.id === 'google-fonts') {
            const want = [...hit.matchAll(/family=([^:&;"')]+)/g)].map((x) => decodeURIComponent(x[1]).replace(/\+/g, ' '))
            const have = fontFamiliesProvided()
            const missing = want.filter((f) => !have.has(f))
            if (missing.length) note = `replace with bundled fonts; toolbox/fonts/fonts.css lacks ${missing.join(', ')}`
            else { sev = 'fixed'; note = `rewritten to the bundled toolbox/fonts/fonts.css (${want.join(', ')})` }
          }
          add({ sev, rule: r.id, file: rel, line: i + 1, text: line.trim(), match: hit, note })
        }
      }
    })
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const declared = new Set(Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter((d) => d.startsWith('@lacuna/')))
  const imported = new Set()
  for (const rel of files) {
    if (!/\.[cm]?[jt]sx?$/.test(rel)) continue
    const text = fs.readFileSync(path.join(dir, rel), 'utf8')
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"](@lacuna\/[a-z0-9-]+)/g)) imported.add(m[1])
  }
  imported.delete(pkg.name)
  for (const d of imported) if (!declared.has(d)) add({ sev: 'block', rule: 'undeclared-dependency', file: 'package.json', line: 0, text: `imports ${d} but package.json does not list it` })

  const target = path.join(toolboxDir, name)
  const targetPkg = path.join(target, 'package.json')
  if (fs.existsSync(target)) {
    const existing = fs.existsSync(targetPkg) ? JSON.parse(fs.readFileSync(targetPkg, 'utf8')) : null
    if (!existing?.lacunaSync && !opts.force) add({ sev: 'block', rule: 'target-not-synced', file: `toolbox/${name}`, line: 0, text: `toolbox/${name}/ exists and was not written by this script (vendored snapshot?); pass --force to replace it` })
  }

  const external = Object.keys({ ...pkg.dependencies }).filter((d) => !d.startsWith('@lacuna/'))
  return { name, pkg, files, skipped, findings, lines, deps: [...declared], external }
}

// ------------------------------------------------------------------ dependency closure

const results = opts.packages.map(scanPackage)
const byName = Object.fromEntries(results.map((r) => [r.pkg.name, r]))
const inToolbox = (id) => {
  const short = id.replace('@lacuna/', '')
  const p = path.join(toolboxDir, short, 'package.json')
  return fs.existsSync(p) && JSON.parse(fs.readFileSync(p, 'utf8')).name === id
}
const blocked = (r) => r.findings.some((f) => f.sev === 'block')
// Names a vendored toolbox package exports, following `export *` and `export { } from`.
function exportedNames(entry, seen = new Set()) {
  const names = new Set()
  const file = [entry, entry + '.tsx', entry + '.ts', path.join(entry, 'index.tsx'), path.join(entry, 'index.ts')].find((f) => fs.existsSync(f) && fs.statSync(f).isFile())
  if (!file || seen.has(file)) return names
  seen.add(file)
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+(\w+)/g)) names.add(m[1])
  for (const m of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) for (const part of m[1].split(',')) {
    const n = part.trim().split(/\s+as\s+/).pop().replace(/^type\s+/, '').trim()
    if (n) names.add(n)
  }
  for (const m of text.matchAll(/export\s+\*\s+from\s+['"](\.[^'"]+)['"]/g)) for (const n of exportedNames(path.resolve(path.dirname(file), m[1]), seen)) names.add(n)
  return names
}

for (const r of results) {
  for (const d of r.deps) {
    const peer = byName[d]
    if (!inToolbox(d) || (peer && !blocked(peer))) continue
    const dir = path.join(toolboxDir, d.replace('@lacuna/', ''))
    const existing = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    if (existing.lacunaSync) continue
    const entry = typeof existing.exports === 'string' ? existing.exports : existing.exports?.['.']
    const have = exportedNames(path.resolve(dir, entry ?? 'index'))
    const missing = new Set()
    for (const rel of r.files) {
      if (!/\.[cm]?[jt]sx?$/.test(rel)) continue
      const text = fs.readFileSync(path.join(source, r.name, rel), 'utf8')
      for (const m of text.matchAll(new RegExp(String.raw`import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]${d.replace('/', '\\/')}['"]`, 'g'))) {
        for (const part of m[1].split(',')) {
          const n = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
          if (n && !have.has(n)) missing.add(`${n} (${rel})`)
        }
      }
    }
    if (missing.size) r.findings.push({ sev: 'block', rule: 'dependency-api', file: 'package.json', line: 0, text: `${d} resolves to the vendored snapshot in toolbox/, which does not export ${[...missing].join(', ')}` })
    else r.findings.push({ sev: 'info', rule: 'dependency-vendored', file: 'package.json', line: 0, text: `${d} resolves to the vendored snapshot in toolbox/, which exports every name this package imports` })
  }
}

let changed = true
while (changed) {
  changed = false
  for (const r of results) {
    if (blocked(r)) continue
    for (const d of r.deps) {
      const peer = byName[d]
      if (peer && !blocked(peer)) continue
      if (inToolbox(d)) continue
      const why = peer ? `${d} is blocked in this run and not in toolbox/` : `${d} is not in toolbox/ and was not requested`
      r.findings.push({ sev: 'block', rule: 'dependency', file: 'package.json', line: 0, text: why })
      changed = true
      break
    }
  }
}

// ------------------------------------------------------------------ report

function report() {
  const out = []
  const clean = results.filter((r) => !blocked(r))
  out.push('# Toolbox sync report', '')
  out.push(`Source: \`${path.relative(root, source) || source}\` at commit \`${sourceCommit ?? 'unknown'}\`. Mode: ${opts.dryRun ? 'dry run (nothing written)' : 'sync'}.`, '')
  out.push(`Clean: ${clean.map((r) => r.name).join(', ') || 'none'}.`, '')
  out.push(`Blocked: ${results.filter(blocked).map((r) => r.name).join(', ') || 'none'}.`, '')
  out.push('| package | result | files | lines | blocking | fixed | info | npm deps |', '|---|---|---|---|---|---|---|---|')
  for (const r of results) {
    const n = (s) => r.findings.filter((f) => f.sev === s).length
    out.push(`| ${r.name} | ${blocked(r) ? 'BLOCKED' : 'clean'} | ${r.files.length} | ${r.lines} | ${n('block')} | ${n('fixed')} | ${n('info')} | ${r.external.join(', ') || '-'} |`)
  }
  for (const r of results) {
    out.push('', `## ${r.name}: ${blocked(r) ? 'BLOCKED' : 'clean'}`, '')
    out.push(`Files: ${r.files.map((f) => `\`${f}\``).join(', ')}.`, '')
    if (r.skipped.length) out.push(`Not copied: ${r.skipped.map((s) => `\`${s.rel}\` (${s.why})`).join(', ')}.`, '')
    for (const sev of ['block', 'fixed', 'info']) {
      const fs_ = r.findings.filter((f) => f.sev === sev)
      if (!fs_.length) continue
      out.push(`${{ block: 'Blocking', fixed: 'Fixed by the sync', info: 'Info' }[sev]}:`, '')
      for (const f of fs_) {
        const loc = f.line ? `${f.file}:${f.line}` : f.file
        const snippet = f.text.length > 160 ? f.text.slice(0, 157) + '...' : f.text
        out.push(`- \`${f.rule}\` ${loc}${f.match ? ` matched \`${f.match.replace(/`/g, "'").slice(0, 80)}\`` : ''}${f.note ? ` (${f.note})` : ''}: ${snippet.replace(/\|/g, '\\|')}`)
      }
      out.push('')
    }
    if (!r.findings.length) out.push('No findings.', '')
  }
  return out.join('\n') + '\n'
}

// ------------------------------------------------------------------ write

function licenseHolder() {
  const m = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').match(/Copyright \(c\) (.+)/)
  return m ? m[1].trim() : 'the Lacuna authors'
}

function header(ext) {
  const a = `SPDX-License-Identifier: MIT. Copyright (c) ${licenseHolder()}. See LICENSE at the repository root.`
  const b = 'Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.'
  return ext === '.css' ? `/* ${a}\n   ${b} */\n` : `// ${a}\n// ${b}\n`
}

function transform(rel, text, targetFile) {
  if (path.extname(rel) !== '.css') return text
  const fontsRel = path.relative(path.dirname(targetFile), fontsCss).split(path.sep).join('/')
  return text.replace(new RegExp(GOOGLE_FONTS.source, 'g'), `@import '${fontsRel.startsWith('.') ? fontsRel : './' + fontsRel}';`)
}

function writePackage(r) {
  const from = path.join(source, r.name)
  const target = path.join(toolboxDir, r.name)
  fs.rmSync(target, { recursive: true, force: true })
  for (const rel of r.files) {
    const dest = path.join(target, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    if (rel === 'package.json') continue
    const buf = fs.readFileSync(path.join(from, rel))
    const ext = path.extname(rel)
    if (isBinary(buf) || !HEADER_EXTS.has(ext)) {
      fs.writeFileSync(dest, isBinary(buf) ? buf : transform(rel, buf.toString('utf8'), dest))
      continue
    }
    let text = transform(rel, buf.toString('utf8'), dest)
    if (!text.startsWith('// SPDX') && !text.startsWith('/* SPDX')) text = header(ext) + text
    fs.writeFileSync(dest, text)
  }
  const p = r.pkg
  const ws = (deps) => deps && Object.fromEntries(Object.entries(deps).map(([k, v]) => [k, k.startsWith('@lacuna/') ? 'workspace:*' : v]))
  const out = {
    name: p.name,
    version: p.version,
    private: true,
    license: 'MIT',
    type: p.type ?? 'module',
    description: p.description,
    exports: p.exports,
    dependencies: ws(p.dependencies),
    peerDependencies: p.peerDependencies,
    devDependencies: p.devDependencies,
    lacunaSync: { from: `app/packages/${r.name}`, commit: sourceCommit },
  }
  for (const k of Object.keys(out)) if (out[k] === undefined || (typeof out[k] === 'object' && out[k] && !Object.keys(out[k]).length)) delete out[k]
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(out, null, 2) + '\n')
}

function updateModules(synced) {
  const file = path.join(toolboxDir, 'modules.json')
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const r of synced) {
    const mod = doc.modules.find((m) => m.id === r.pkg.name)
    if (!mod) { console.error(`warning: ${r.pkg.name} is not in toolbox/modules.json; add an entry by hand`); continue }
    mod.version = r.pkg.version
    mod.public = `toolbox/${r.name}`
  }
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n')
}

const text = report()
process.stdout.write(text)
if (opts.report) {
  fs.mkdirSync(path.dirname(path.resolve(opts.report)), { recursive: true })
  fs.writeFileSync(path.resolve(opts.report), text)
}
if (!opts.dryRun) {
  const synced = results.filter((r) => !blocked(r))
  for (const r of synced) writePackage(r)
  if (synced.length) updateModules(synced)
  console.log(`synced: ${synced.map((r) => `toolbox/${r.name}`).join(', ') || 'nothing'}`)
  console.log('next: pnpm install, then ALLOW_GATE_EDIT=1 ./scripts/check.sh')
}
process.exit(results.some(blocked) ? 1 : 0)
