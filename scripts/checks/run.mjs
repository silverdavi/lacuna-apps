// The gate. Finds the one app a pull request changes, runs every check in the registry
// (schema/rubric.json), and writes gate-result.json and summary.md.
//
// Everything here runs from the base branch checkout. Only apps/<slug>/ is taken from the pull request,
// copied out of the head commit with `git archive` once its tree is known to be clean. The pull
// request's own scripts, config files and tests are never run.
//
// Usage:
//   node scripts/checks/run.mjs prepare --base <rev> --head <rev> [--repo <dir>] [--out <dir>]
//       Copies apps/<slug>/ from the head commit over the base checkout. Run before installing.
//   node scripts/checks/run.mjs check --base <rev> --head <rev> --author <login> [--repo <dir>] [--out <dir>]
//       [--lock-before <file> --lock-after <file>] [--advisory]
//       Runs the checks. Exits 1 when a blocking check fails, unless --advisory.
//   node scripts/checks/run.mjs --base <rev> --head <rev> --author <login>
//       Both, for a local run where the app's packages are already installed.
//   node scripts/checks/run.mjs --fixture scripts/checks/fixtures/<name>
//       Builds a throwaway repository from a fixture and runs the gate against it.
// --base and --head are revisions in --repo (default: this repository). The author is the pull request's
// author as GitHub reports it in the pull request event, never a value from the pull request's files.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { git, here, readJson, root, schemaFile, SLUG } from './lib.mjs'
import { appTreeProblems } from './scope.mjs'
import { codeOwners } from './owner.mjs'
import { buildApp } from './build.mjs'

const MODULES = {
  scope: './scope.mjs',
  owner: './owner.mjs',
  manifest: './manifest.mjs',
  dco: './dco.mjs',
  deps: './deps.mjs',
  types: './types.mjs',
  tokens: './tokens.mjs',
  'source-scan': './scan-source.mjs',
  'bundle-scan': './scan-bundle.mjs',
  size: './size.mjs',
  browser: './browser.mjs',
  a11y: './a11y.mjs',
}
// Checks that look at the built app run after the build.
const AFTER_BUILD = new Set(['bundle-scan', 'size', 'browser', 'a11y'])

// ------------------------------------------------------------ context

function parseRaw(raw) {
  const out = []
  const parts = raw.split('\0')
  for (let i = 0; i < parts.length - 1; i += 2) {
    const m = parts[i].match(/^:(\d{6}) (\d{6}) \S+ \S+ (\S+)$/)
    if (!m) continue
    out.push({ oldMode: m[1], newMode: m[2], status: m[3], path: parts[i + 1] })
  }
  return out
}

function commitsOf(repo, base, head) {
  const raw = git(repo, ['log', '--format=%H%x1f%an%x1f%ae%x1f%P%x1f%B%x1e', `${base}..${head}`])
  return raw.split('\x1e').map((s) => s.replace(/^\n/, '')).filter((s) => s.trim()).map((s) => {
    const [sha, name, email, parents, body] = s.split('\x1f')
    return { sha, name, email, merge: parents.trim().split(/\s+/).length > 1, body: body ?? '' }
  })
}

function showJson(repo, rev, file) {
  const r = spawnSync('git', ['show', `${rev}:${file}`], { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  if (r.status !== 0) return { missing: true }
  try { return { value: JSON.parse(r.stdout) } } catch (e) { return { error: `lacuna.app.json is not valid JSON (${e.message})` } }
}

export function context({ repo = root, base, head, author = '', out, lock = null }) {
  const rev = (r) => git(repo, ['rev-parse', '--verify', `${r}^{commit}`]).trim()
  const baseSha = rev(base)
  const headSha = rev(head)
  const mergeBase = git(repo, ['merge-base', baseSha, headSha]).trim()
  const changes = parseRaw(git(repo, ['diff', '--raw', '-z', '--no-renames', '--no-ext-diff', mergeBase, headSha]))
  const slugs = [...new Set(changes.map((c) => c.path.match(/^apps\/([^/]+)\/./)?.[1]).filter(Boolean))].sort()
  const slug = slugs.length === 1 ? slugs[0] : null
  const ctx = {
    repo, base: baseSha, head: headSha, mergeBase, author, changes, slugs, slug, lock,
    commits: commitsOf(repo, baseSha, headSha),
    out, artifacts: out, appDir: slug ? path.join(root, 'apps', slug) : null,
    owners: [...codeOwners()],
  }
  ctx.audience = ctx.owners.includes(author.toLowerCase()) ? 'first-party' : 'outside'
  if (slug) {
    const tree = git(repo, ['ls-tree', '-r', '-z', '--full-tree', headSha, '--', `apps/${slug}`])
    ctx.headTree = tree.split('\0').filter(Boolean).map((l) => { const [meta, p] = l.split('\t'); const [mode, type, sha] = meta.split(' '); return { mode, type, sha, path: p } })
    ctx.headHasManifest = ctx.headTree.some((e) => e.path === `apps/${slug}/lacuna.app.json`)
    ctx.treeProblems = appTreeProblems(ctx.headTree)
    ctx.isNew = git(repo, ['ls-tree', baseSha, '--', `apps/${slug}`]).trim() === ''
    const now = showJson(repo, headSha, `apps/${slug}/lacuna.app.json`)
    ctx.manifest = now.value ?? null
    ctx.manifestError = now.error ?? (now.missing ? 'the app has no lacuna.app.json' : null)
    ctx.baseManifest = ctx.isNew ? null : (showJson(repo, baseSha, `apps/${slug}/lacuna.app.json`).value ?? null)
    // A folder name that is safe as a single path segment, with a clean tree, can be copied over the base.
    ctx.copyable = /^[A-Za-z0-9._-]+$/.test(slug) && !/^\.+$/.test(slug) && ctx.headHasManifest && !ctx.treeProblems.length
  }
  return ctx
}

// Replaces apps/<slug>/ in the base checkout with the head commit's copy. Nothing else is touched.
export function overlay(ctx) {
  if (!ctx.copyable) return false
  fs.rmSync(ctx.appDir, { recursive: true, force: true })
  // Each blob is written straight from the object store. `git archive` would apply export-ignore and
  // export-subst from the pull request's own .gitattributes and leave files out or change them.
  for (const e of ctx.headTree) {
    if (e.type !== 'blob' || (e.mode !== '100644' && e.mode !== '100755')) throw new Error(`unexpected entry in the app folder: ${e.path}`)
    const dest = path.join(root, e.path)
    if (path.relative(path.join(root, 'apps', ctx.slug), dest).startsWith('..')) throw new Error(`path escapes the app folder: ${e.path}`)
    const blob = spawnSync('git', ['cat-file', 'blob', e.sha], { cwd: ctx.repo, maxBuffer: 512 * 1024 * 1024 })
    if (blob.status !== 0) throw new Error(`git cat-file failed: ${blob.stderr}`)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, blob.stdout, { mode: e.mode === '100755' ? 0o755 : 0o644 })
  }
  // The copy must be exactly the committed tree: same paths, same content.
  const want = new Map(ctx.headTree.map((e) => [e.path, e.sha]))
  const have = []
  const walk = (d) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); if (n.isDirectory()) walk(p); else have.push(p) } }
  walk(ctx.appDir)
  const rels = have.map((p) => path.relative(root, p).split(path.sep).join('/'))
  const hashes = spawnSync('git', ['hash-object', '--no-filters', '--stdin-paths'], { cwd: root, input: have.join('\n') + '\n', encoding: 'utf8' }).stdout.trim().split('\n')
  const bad = rels.filter((p, i) => want.get(p) !== hashes[i]).concat([...want.keys()].filter((p) => !rels.includes(p)))
  if (bad.length || rels.length !== want.size) throw new Error(`the copied app folder does not match the pull request's commit (${bad.slice(0, 3).join(', ') || 'file count differs'})`)
  return true
}

// ------------------------------------------------------------ registry and verdict

function audienceRules(rubric, id, audience) {
  const rules = rubric.rules.filter((r) => r.check === id)
  const applies = rules.filter((r) => r.appliesTo.includes(audience))
  const blocking = applies.some((r) => r.severity === 'blocking' && !(r.advisoryFor ?? []).includes(audience))
  return { rules: rules.map((r) => r.id), titles: rules.map((r) => r.title), blocking }
}

async function runChecks(ctx) {
  const rubric = schemaFile('rubric.json')
  const results = []
  const runOne = async (id) => {
    const meta = audienceRules(rubric, id, ctx.audience)
    let res
    if (!MODULES[id]) res = { status: 'not-run', findings: [{ message: 'this check is not automated yet; a person looks at it during review' }] }
    else {
      try { res = await (await import(MODULES[id])).run(ctx) } catch (e) { res = { status: 'fail', findings: [{ message: `the check stopped: ${e.message}` }] } }
    }
    ctx.results[id] = res
    results.push({ id, ...meta, ...res })
  }
  ctx.results = {}
  for (const id of rubric.checks.filter((c) => !AFTER_BUILD.has(c))) await runOne(id)
  ctx.build = null
  const ready = ctx.overlaid && SLUG.test(ctx.slug) && ctx.results.deps?.status === 'pass'
  if (ready) {
    const dist = path.join(ctx.out, 'dist')
    try { await buildApp(ctx.appDir, dist); ctx.build = { ok: true, dist } } catch (e) { ctx.build = { ok: false, dist, error: e.message.split('\n').slice(0, 8).join('\n') } }
  }
  for (const id of rubric.checks.filter((c) => AFTER_BUILD.has(c))) await runOne(id)
  return results
}

// ------------------------------------------------------------ output

// Text from the pull request (file names, messages, the author) is escaped for Markdown and HTML.
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[|\\`*_[\]()!#~]/g, (c) => `\\${c}`)
  .replace(/\r?\n/g, ' ')
const WORD = { pass: 'Passed', fail: 'Failed', skip: 'Not run', 'not-run': 'Not automated' }

export function summary(result) {
  const lines = [`## Lacuna checks: ${result.ok ? 'passed' : 'failed'}`, '']
  lines.push(result.slug ? `App: apps/${esc(result.slug)}/ (${result.newApp ? 'new' : 'update'}), opened by ${esc(result.author)}.` : 'No single app folder was found in this pull request.', '')
  lines.push('| Check | Result | Rules | What was found |', '|---|---|---|---|')
  for (const c of result.checks) {
    const word = c.status === 'fail' && !c.blocking ? 'Failed (advisory)' : WORD[c.status]
    const items = [...c.findings, ...(c.notes ?? []).map((n) => ({ message: n }))]
    const first = items.slice(0, 3).map((f) => esc(`${f.file ? `${f.file}${f.line ? `:${f.line}` : ''} ` : ''}${f.message}`)).join('<br>')
    const more = items.length > 3 ? `<br>and ${items.length - 3} more` : ''
    lines.push(`| ${c.id} | ${word} | ${c.rules.join(', ')} | ${first}${more} |`)
  }
  const fixes = result.checks.filter((c) => c.status === 'fail').flatMap((c) => c.findings.filter((f) => f.fix).map((f) => `- ${c.id}: ${esc(f.fix)}`))
  if (fixes.length) lines.push('', '### How to fix', '', ...[...new Set(fixes)].slice(0, 30))
  lines.push('', 'The rules are in docs/RUBRIC.md. Screenshots are attached to this run as artifacts.')
  return lines.join('\n') + '\n'
}

export async function gate(opts) {
  const out = path.resolve(opts.out ?? path.join(root, 'artifacts/gate'))
  fs.mkdirSync(out, { recursive: true })
  const ctx = context({ ...opts, out })
  ctx.port = opts.port
  ctx.overlaid = opts.overlaid ?? (ctx.copyable && fs.existsSync(path.join(ctx.appDir, 'lacuna.app.json')))
  const checks = await runChecks(ctx)
  const result = {
    version: 1,
    ok: !checks.some((c) => c.status === 'fail' && c.blocking),
    base: ctx.base, head: ctx.head, author: ctx.author, audience: ctx.audience,
    slug: ctx.slug, newApp: ctx.slug ? ctx.isNew : null,
    build: ctx.build ? { ok: ctx.build.ok, error: ctx.build.error ?? null } : null,
    checks: checks.map(({ id, status, blocking, rules, titles, findings, measured, notes }) => ({ id, status, blocking, rules, titles, findings, measured: measured ?? null, notes: notes ?? [] })),
  }
  fs.writeFileSync(path.join(out, 'gate-result.json'), JSON.stringify(result, null, 2) + '\n')
  const md = summary(result)
  fs.writeFileSync(path.join(out, 'summary.md'), md)
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
  return result
}

// ------------------------------------------------------------ fixtures

function merge(target, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch
  const out = { ...(target && typeof target === 'object' && !Array.isArray(target) ? target : {}) }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k]
    else out[k] = merge(out[k], v)
  }
  return out
}

// Joins two patches into one, keeping null (delete) markers for when the patch is applied.
function compose(a, b) {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return b
  const out = { ...(a && typeof a === 'object' && !Array.isArray(a) ? a : {}) }
  for (const [k, v] of Object.entries(b)) out[k] = v === null ? null : compose(out[k], v)
  return out
}

function copyTree(from, to) {
  if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true })
}

// Deterministic bytes that do not compress, for size fixtures.
function noise(bytes) {
  const buf = Buffer.alloc(bytes)
  let x = 2463534242
  for (let i = 0; i < bytes; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; buf[i] = x & 255 }
  return buf
}

const FIXTURES = path.join(here, 'fixtures')

// Reads a fixture, following `extends`, into { spec, layers } where layers are the fixture folders in order.
function loadFixture(dir) {
  const spec = readJson(path.join(dir, 'fixture.json'))
  if (!spec.extends) return { spec, layers: [dir] }
  const parent = loadFixture(path.join(FIXTURES, spec.extends))
  const merged = { ...parent.spec, ...spec, manifest: compose(parent.spec.manifest ?? {}, spec.manifest ?? {}), package: compose(parent.spec.package ?? {}, spec.package ?? {}) }
  delete merged.extends
  return { spec: merged, layers: [...parent.layers, dir] }
}

export async function runFixture(dir, { out } = {}) {
  const name = path.basename(dir)
  const { spec, layers } = loadFixture(dir)
  const slug = spec.slug ?? `fixture-${name}`
  if (fs.existsSync(path.join(root, 'apps', slug))) throw new Error(`apps/${slug} already exists; fixtures need their own slug`)
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), `gate-${name}-`))
  const g = (...args) => git(repo, args)
  const env = (who) => ({ GIT_AUTHOR_NAME: who.name, GIT_AUTHOR_EMAIL: who.email, GIT_COMMITTER_NAME: who.name, GIT_COMMITTER_EMAIL: who.email })
  const commit = (who, message) => {
    const r = spawnSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', message], { cwd: repo, env: { ...process.env, ...env(who) }, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(r.stderr)
  }
  try {
    g('init', '-q', '-b', 'main')
    const maintainer = { name: 'Lacuna Maintainer', email: 'maintainer@lacunaos.com' }
    fs.writeFileSync(path.join(repo, 'README.md'), 'fixture base\n')
    for (const l of layers) copyTree(path.join(l, 'base'), repo)
    g('add', '-A')
    commit(maintainer, 'Base')
    g('branch', 'base')

    const appDir = path.join(repo, 'apps', slug)
    fs.mkdirSync(appDir, { recursive: true })
    for (const l of layers) copyTree(path.join(l, 'app'), appDir)
    for (const l of layers) copyTree(path.join(l, 'extra'), repo)
    for (const p of spec.remove ?? []) fs.rmSync(path.join(appDir, p), { recursive: true, force: true })
    const mfile = path.join(appDir, 'lacuna.app.json')
    if (fs.existsSync(mfile) && (spec.manifest || !spec.keepRoute)) {
      const m = merge(readJson(mfile), spec.manifest ?? {})
      if (!spec.keepRoute && m.entry) m.entry.route = `/app/${slug}`
      fs.writeFileSync(mfile, JSON.stringify(m, null, 2) + '\n')
    }
    const pfile = path.join(appDir, 'package.json')
    if (fs.existsSync(pfile) && spec.package) fs.writeFileSync(pfile, JSON.stringify(merge(readJson(pfile), spec.package), null, 2) + '\n')
    for (const link of spec.symlinks ?? []) fs.symlinkSync(link.target, path.join(appDir, link.path))
    for (const gen of spec.generate ?? []) {
      fs.mkdirSync(path.dirname(path.join(appDir, gen.path)), { recursive: true })
      fs.writeFileSync(path.join(appDir, gen.path), noise(gen.bytes))
    }
    g('add', '-A')
    const author = spec.commitAuthor ?? { name: 'Octo Maker', email: 'octo-maker@users.noreply.github.com' }
    const signer = spec.signoff === false ? null : (spec.signoffAs ?? author)
    commit(author, `Add ${slug}${signer ? `\n\nSigned-off-by: ${signer.name} <${signer.email}>` : ''}`)

    const lock = fs.existsSync(path.join(dir, 'lock')) ? { before: path.join(dir, 'lock/before.yaml'), after: path.join(dir, 'lock/after.yaml') } : null
    const ctx = context({ repo, base: 'base', head: 'HEAD', author: spec.author ?? 'octo-maker', out: out ?? path.join(root, 'artifacts/fixtures', name), lock })
    const copied = overlay(ctx)
    // Fixtures use the starter's installed packages instead of a fresh install.
    if (copied) fs.symlinkSync(path.join(root, 'template/node_modules'), path.join(ctx.appDir, 'node_modules'), 'dir')
    return await gate({ repo, base: 'base', head: 'HEAD', author: spec.author ?? 'octo-maker', out: out ?? path.join(root, 'artifacts/fixtures', name), lock, overlaid: copied })
  } finally {
    fs.rmSync(path.join(root, 'apps', slug), { recursive: true, force: true })
    fs.rmSync(repo, { recursive: true, force: true })
  }
}

// ------------------------------------------------------------ cli

function args(argv) {
  const o = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      if (['advisory'].includes(k)) o[k] = true
      else o[k] = argv[++i]
    } else o._.push(a)
  }
  return o
}

async function main() {
  const o = args(process.argv.slice(2))
  const mode = o._[0] ?? 'all'
  if (o.fixture) {
    const r = await runFixture(path.resolve(o.fixture), { out: o.out })
    console.log(summary(r))
    process.exit(r.ok ? 0 : 1)
  }
  if (!o.base || !o.head) { console.error('Usage: run.mjs [prepare|check] --base <rev> --head <rev> --author <login>'); process.exit(2) }
  const repo = path.resolve(o.repo ?? root)
  const out = o.out ? path.resolve(o.out) : undefined
  const lock = o['lock-before'] && o['lock-after'] ? { before: path.resolve(o['lock-before']), after: path.resolve(o['lock-after']) } : null
  if (mode === 'prepare' || mode === 'all') {
    const ctx = context({ repo, base: o.base, head: o.head, author: o.author ?? '', out })
    const copied = overlay(ctx)
    console.log(copied ? `copied apps/${ctx.slug}/ from ${ctx.head.slice(0, 7)}` : 'no app folder copied (the scope check reports why)')
    if (mode === 'prepare') return
  }
  const r = await gate({ repo, base: o.base, head: o.head, author: o.author ?? '', out, lock, port: o.port ? Number(o.port) : undefined })
  console.log(summary(r))
  if (!r.ok && !o.advisory) process.exit(1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(here, 'run.mjs')) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
