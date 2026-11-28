// deps: an app depends only on packages in schema/allowlist.json, at plain version ranges, plus toolbox
// modules through the workspace: protocol. No install-time scripts.
import fs from 'node:fs'
import path from 'node:path'
import { schemaFile, skip, verdict } from './lib.mjs'

export const id = 'deps'

const RANGE = /^(?:[\^~]|>=)?\d+(?:\.(?:\d+|x|\*)){0,2}(?:-[0-9A-Za-z.-]+)?(?:\s+<\d+(?:\.\d+){0,2})?$/
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
const NOT_ALLOWED = ['bundledDependencies', 'bundleDependencies', 'overrides', 'resolutions', 'pnpm', 'workspaces']

export async function run(ctx) {
  if (!ctx.slug || !ctx.overlaid) return skip('no single app to check')
  const file = `apps/${ctx.slug}/package.json`
  const p = path.join(ctx.appDir, 'package.json')
  if (!fs.existsSync(p)) return verdict([{ file, message: 'the app has no package.json', fix: 'Start from template/package.json.' }])
  let pkg
  try { pkg = JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { return verdict([{ file, message: `package.json is not valid JSON (${e.message})` }]) }
  const allow = schemaFile('allowlist.json')
  const allowed = new Set(allow.packages)
  const findings = []
  for (const field of FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (name.startsWith(allow.workspaceScope)) {
        if (typeof spec !== 'string' || !spec.startsWith('workspace:')) findings.push({ file, message: `${name} must come from the toolbox in this repository`, fix: `Use "${name}": "workspace:*".` })
      } else if (!allowed.has(name)) {
        findings.push({ file, message: `${name} is not an allowed dependency`, fix: `Remove it. Apps may use ${allow.packages.join(', ')} and toolbox modules.` })
      } else if (typeof spec !== 'string' || !RANGE.test(spec.trim())) {
        findings.push({ file, message: `${name} must use a version range from the registry, not "${spec}"`, fix: 'Use a range such as "^19.0.0".' })
      }
    }
  }
  for (const key of NOT_ALLOWED) if (key in pkg) findings.push({ file, message: `package.json cannot set "${key}"`, fix: `Remove "${key}".` })
  for (const name of Object.keys(pkg.scripts ?? {})) {
    if (allow.lifecycleScripts.includes(name)) findings.push({ file, message: `the "${name}" script would run at install time`, fix: `Remove the "${name}" script.` })
  }
  return verdict(findings)
}
