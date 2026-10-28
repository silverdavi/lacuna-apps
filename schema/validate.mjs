#!/usr/bin/env node
// Validate Lacuna app manifests: JSON Schema shape, then store rules.
// No dependencies. Implements the JSON Schema 2020-12 keywords that
// app-manifest.schema.json uses and throws on any keyword it does not know.
//
// Usage:
//   node schema/validate.mjs
//   node schema/validate.mjs path/to/lacuna.app.json
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Vendored into lacuna-apps. Paths point at this repo: schema/ next to this
// file, toolbox/modules.json, and toolbox/ui/icons.tsx.
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const rel = (p) => path.relative(root, p)
const schema = JSON.parse(fs.readFileSync(path.join(here, 'app-manifest.schema.json'), 'utf8'))
const toolbox = JSON.parse(fs.readFileSync(path.join(root, 'toolbox/modules.json'), 'utf8')).modules
const moduleById = Object.fromEntries(toolbox.map((m) => [m.id, m]))
const iconsSrc = fs.readFileSync(path.join(root, 'toolbox/ui/icons.tsx'), 'utf8')
const ICONS = new Set([...iconsSrc.match(/export const ICONS = \{([\s\S]*?)\n\}/)[1].matchAll(/([a-z]+):\s*Icon/g)].map((m) => m[1]))

// ------------------------------------------------------------ schema subset

const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description', '$defs', 'default', 'examples', '$comment'])
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v)
const typeMatches = (want, v) => want === typeOf(v) || (want === 'number' && typeof v === 'number')
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function resolveRef(ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref ${ref}`)
  return ref.slice(2).split('/').reduce((node, key) => node[key], schema)
}

function check(s, v, at, errs) {
  for (const k of Object.keys(s)) {
    if (ANNOTATIONS.has(k) || ['then', 'else'].includes(k)) continue
    if (!KEYWORDS[k]) throw new Error(`validator does not implement schema keyword "${k}" (at ${at})`)
  }
  for (const [k, fn] of Object.entries(KEYWORDS)) if (k in s) fn(s[k], v, at, errs, s)
  return errs
}
const ok = (s, v) => check(s, v, '', []).length === 0

const KEYWORDS = {
  $ref: (ref, v, at, errs) => check(resolveRef(ref), v, at, errs),
  type: (t, v, at, errs) => { if (![].concat(t).some((x) => typeMatches(x, v))) errs.push(`${at || '/'}: expected ${t}, got ${typeOf(v)}`) },
  const: (c, v, at, errs) => { if (!deepEq(c, v)) errs.push(`${at || '/'}: must equal ${JSON.stringify(c)}`) },
  enum: (e, v, at, errs) => { if (!e.some((x) => deepEq(x, v))) errs.push(`${at || '/'}: ${JSON.stringify(v)} not in [${e.join(', ')}]`) },
  pattern: (p, v, at, errs) => { if (typeof v === 'string' && !new RegExp(p, 'u').test(v)) errs.push(`${at}: "${v}" does not match ${p}`) },
  minLength: (n, v, at, errs) => { if (typeof v === 'string' && [...v].length < n) errs.push(`${at}: shorter than ${n}`) },
  maxLength: (n, v, at, errs) => { if (typeof v === 'string' && [...v].length > n) errs.push(`${at}: longer than ${n} (${[...v].length})`) },
  minimum: (n, v, at, errs) => { if (typeof v === 'number' && v < n) errs.push(`${at}: below ${n}`) },
  maximum: (n, v, at, errs) => { if (typeof v === 'number' && v > n) errs.push(`${at}: above ${n}`) },
  required: (r, v, at, errs) => { if (typeOf(v) === 'object') for (const k of r) if (!(k in v)) errs.push(`${at || '/'}: missing "${k}"`) },
  minProperties: (n, v, at, errs) => { if (typeOf(v) === 'object' && Object.keys(v).length < n) errs.push(`${at}: needs at least ${n} entries`) },
  properties: (props, v, at, errs) => {
    if (typeOf(v) !== 'object') return
    for (const [k, sub] of Object.entries(props)) if (k in v) check(sub, v[k], `${at}/${k}`, errs)
  },
  propertyNames: (sub, v, at, errs) => {
    if (typeOf(v) !== 'object') return
    for (const k of Object.keys(v)) check(sub, k, `${at}/${k} (name)`, errs)
  },
  additionalProperties: (ap, v, at, errs, s) => {
    if (typeOf(v) !== 'object') return
    const known = new Set(Object.keys(s.properties ?? {}))
    for (const k of Object.keys(v)) {
      if (known.has(k)) continue
      if (ap === false) errs.push(`${at || '/'}: unexpected property "${k}"`)
      else if (typeof ap === 'object') check(ap, v[k], `${at}/${k}`, errs)
    }
  },
  items: (sub, v, at, errs) => { if (Array.isArray(v)) v.forEach((x, i) => check(sub, x, `${at}/${i}`, errs)) },
  minItems: (n, v, at, errs) => { if (Array.isArray(v) && v.length < n) errs.push(`${at}: needs at least ${n} items`) },
  maxItems: (n, v, at, errs) => { if (Array.isArray(v) && v.length > n) errs.push(`${at}: more than ${n} items`) },
  uniqueItems: (u, v, at, errs) => {
    if (u && Array.isArray(v) && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) errs.push(`${at}: items must be unique`)
  },
  allOf: (list, v, at, errs) => list.forEach((sub) => check(sub, v, at, errs)),
  not: (sub, v, at, errs) => { if (ok(sub, v)) errs.push(`${at || '/'}: must not match ${JSON.stringify(sub)}`) },
  if: (cond, v, at, errs, s) => {
    if (ok(cond, v)) { if (s.then) check(s.then, v, at, errs) } else if (s.else) check(s.else, v, at, errs)
  },
}

// ------------------------------------------------------------ store rules

const RESTRICTED_FOR_THIRD_PARTY = ['health', 'child', 'legal-privileged', 'government-id', 'biometric']
const FILE_FORMATS = new Set(toolbox.flatMap((m) => m.formats))

// Same rules as app/scripts/naming-lint.cjs, plus the four-word spec from DESIGN-GUIDELINES.md.
function namingProblems(raw) {
  const words = raw.trim().split(/\s+/).filter((w) => w !== '—' && w !== '·')
  return [
    [/[:]/.test(raw), 'contains a colon'],
    [words.length > 5, `${words.length} words (lint max 5)`],
    [/\b(that|which)\b/i.test(raw), 'contains a that/which clause'],
    [/, not /i.test(raw), 'rhetorical ", not" contrast'],
    [/^(A|An|The)\s/i.test(raw), 'leads with an article'],
    [/\b(guided|scenario|walkthrough|journey|story)\b/i.test(raw), 'self-narrates'],
  ].filter(([bad]) => bad).map(([, why]) => why)
}

function storeRules(m, known) {
  const errors = []
  const warnings = []
  const first = m.maintainer?.type === 'first-party'

  const unpublished = []
  for (const [id] of Object.entries(m.requires?.modules ?? {})) {
    const mod = moduleById[id]
    if (!mod) errors.push(`requires unknown toolbox module ${id}`)
    else if (mod.status !== 'exists' && m.maturity !== 'demo-working' && m.maturity !== 'demo-guided') unpublished.push(`${id} (${mod.status})`)
  }
  if (unpublished.length) warnings.push(`cannot ship until these toolbox modules are published: ${unpublished.join(', ')}`)
  if (!ICONS.has(m.icon)) errors.push(`icon "${m.icon}" is not in ICONS (app/packages/ui/src/icons.tsx)`)
  for (const why of namingProblems(m.name ?? '')) errors.push(`name "${m.name}" breaks the naming register: ${why}`)
  if ((m.name ?? '').trim().split(/\s+/).length > 4) warnings.push(`name "${m.name}" is over the four-word spec`)

  if (first && !m.id.startsWith('lacuna.')) errors.push('first-party ids live under lacuna.')
  if (!first && m.id.startsWith('lacuna.')) errors.push('lacuna.* is reserved for first-party apps')

  if (!first) {
    if (m.entry?.type !== 'bundle') errors.push('third-party apps ship as a sandboxed bundle (entry.type = bundle)')
    if (!m.source?.repository) errors.push('third-party apps need source.repository; Lacuna builds the bundle from submitted source')
    if (/^[a-z]+:/i.test(m.entry?.bundle ?? '') || (m.entry?.bundle ?? '').startsWith('//')) errors.push('entry.bundle is a path in the build output; Lacuna serves bundles from its own app domain, not a developer-hosted URL')
    const restricted = (m.permissions?.dataClasses ?? []).filter((c) => RESTRICTED_FOR_THIRD_PARTY.includes(c))
    if (restricted.length) errors.push(`third-party apps cannot request ${restricted.join(', ')} in this phase`)
    if (!m.maintainer?.contact) errors.push('third-party maintainer.contact is required')
    const q = m.quality ?? {}
    if (!q.tests?.length) errors.push('third-party submissions must list tests')
    if (q.themeMatrix !== true) errors.push('third-party submissions must pass the theme matrix')
    if (q.keyboardOnly !== true) errors.push('third-party submissions must be keyboard-operable')
    if (!q.accessibilityScan || q.accessibilityScan === 'none') errors.push('third-party submissions must run an accessibility scan')
    if ((m.permissions?.network?.origins ?? []).length && !m.permissions.network.justification) errors.push('network origins need a justification')
  }

  const rel = m.relationship ?? {}
  if (rel.parent) {
    const parent = known.get(rel.parent)
    if (!parent) errors.push(`parent ${rel.parent} is not in the registry`)
    else {
      if (parent.relationship?.kind !== 'standalone') errors.push(`parent ${rel.parent} is itself a ${parent.relationship.kind}; families are one level deep`)
      if (rel.kind === 'iteration-of') {
        const parentKinds = new Set(parent.sharing?.owns ?? [])
        const mine = (m.permissions?.records ?? []).map((r) => r.kind)
        if (!mine.some((k) => parentKinds.has(k))) errors.push(`an iteration must work on the parent's record kinds (${[...parentKinds].join(', ') || 'none declared'})`)
        if (parent.category !== m.category) errors.push(`an iteration keeps the parent's category (${parent.category})`)
        const inherited = (parent.permissions?.dataClasses ?? []).filter((c) => RESTRICTED_FOR_THIRD_PARTY.includes(c))
        if (!first && inherited.length) warnings.push(`parent handles ${inherited.join(', ')} data; runtime policy must keep this app out of spaces where those records live (declared: ${m.permissions.availability.spaceTypes.join(', ')})`)
      }
    }
  }

  const required = new Set(Object.keys(m.requires?.modules ?? {}))
  for (const cap of m.capabilities ?? []) {
    const tokens = cap.split(':')[1].split('->')
    for (const t of tokens) {
      if (!FILE_FORMATS.has(t)) continue
      const providers = toolbox.filter((x) => x.formats.includes(t)).map((x) => x.id)
      if (!providers.some((p) => required.has(p))) warnings.push(`capability ${cap} needs a module that handles ${t} (${providers.join(' or ')})`)
    }
  }
  for (const h of m.sharing?.handoffs ?? []) {
    const offered = [...known.values()].some((o) => o.id !== m.id && (o.capabilities ?? []).includes(h.capability))
    if (!offered) warnings.push(`no registered app provides ${h.capability} yet`)
  }
  return { errors, warnings }
}

// ------------------------------------------------------------ run

function load(file) {
  const text = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.jsonl')) {
    return text.split('\n').map((line, i) => ({ line, i })).filter(({ line }) => line.trim())
      .map(({ line, i }) => ({ where: `${rel(file)}:${i + 1}`, manifest: JSON.parse(line) }))
  }
  return [{ where: rel(file), manifest: JSON.parse(text) }]
}

function manifestGlobs() {
  const out = []
  const template = path.join(root, 'template/lacuna.app.json')
  if (fs.existsSync(template)) out.push(template)
  const apps = path.join(root, 'apps')
  if (fs.existsSync(apps)) {
    for (const name of fs.readdirSync(apps)) {
      const file = path.join(apps, name, 'lacuna.app.json')
      if (fs.existsSync(file)) out.push(file)
    }
  }
  return out
}

const args = process.argv.slice(2)
const files = args.length ? args.map((a) => path.resolve(a)) : manifestGlobs()
const entries = files.flatMap(load)

const known = new Map()
const registry = path.join(root, 'registry/apps.jsonl')
if (fs.existsSync(registry)) {
  for (const { manifest } of load(registry)) known.set(manifest.id, manifest)
}
for (const { manifest } of entries) if (!known.has(manifest.id)) known.set(manifest.id, manifest)

let failed = 0
let warned = 0
const seen = new Set()
for (const { where, manifest } of entries) {
  const errs = check(schema, manifest, '', [])
  if (manifest.relationship?.kind === 'suite-member') errs.push('/relationship/kind: "suite-member" was renamed "family-member"')
  const key = `${manifest.id}@${manifest.version}`
  if (where.includes('.jsonl') && seen.has(key)) errs.push(`duplicate registry entry ${key}`)
  seen.add(key)
  const rules = errs.length ? { errors: [], warnings: [] } : storeRules(manifest, known)
  const all = [...new Set([...errs.map((e) => `schema ${e}`), ...rules.errors.map((e) => `rule   ${e}`)])]
  if (all.length) {
    failed++
    console.log(`FAIL ${where} ${manifest.id ?? ''}`)
    for (const e of all) console.log(`     ${e}`)
  } else if (!where.includes('.jsonl') || rules.warnings.length) {
    console.log(`ok   ${where} ${manifest.id}`)
  }
  for (const w of rules.warnings) { warned++; console.log(`     warn ${w}`) }
}
console.log(`\n${entries.length} manifests, ${failed} failed, ${warned} warnings`)
process.exit(failed ? 1 : 0)
