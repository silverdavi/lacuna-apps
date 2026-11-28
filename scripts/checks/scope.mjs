// scope: a pull request changes only apps/<slug>/ for one slug. The lockfile, the gate files and
// everything else stay as they are on the base branch.
import fs from 'node:fs'
import { verdict } from './lib.mjs'
import { addedPackages } from './lockfile.mjs'

export const id = 'scope'

// Files that would change how installs or builds behave if an app folder could carry them.
const BANNED_NAMES = new Set(['.npmrc', '.pnpmfile.cjs', '.yarnrc', '.yarnrc.yml', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb', '.gitmodules', '.gitattributes'])
const BANNED_DIRS = new Set(['node_modules', 'dist', '.git'])

// Problems with the app's own tree at the head commit: links, submodules, installed or built output.
// The tree must be clean before it is copied over the base checkout.
export function appTreeProblems(entries) {
  const out = []
  for (const e of entries) {
    const parts = e.path.split('/')
    if (e.mode === '120000') out.push({ file: e.path, message: 'symbolic links are not accepted in an app folder', fix: 'Commit the file itself.' })
    else if (e.mode === '160000') out.push({ file: e.path, message: 'submodules are not accepted in an app folder', fix: 'Commit the source itself.' })
    if (parts.some((p) => BANNED_DIRS.has(p))) out.push({ file: e.path, message: 'installed packages and build output are not committed', fix: 'Remove the folder; the gate installs and builds the app itself.' })
    else if (BANNED_NAMES.has(parts.at(-1))) out.push({ file: e.path, message: 'install, lockfile and repository settings are not accepted in an app folder (a .gitattributes file can hide files from the checks)', fix: 'Remove the file.' })
  }
  return out
}

export async function run(ctx) {
  const findings = []
  if (!ctx.changes.length) findings.push({ message: 'the pull request changes no files' })
  for (const c of ctx.changes) {
    const m = c.path.match(/^apps\/([^/]+)\/./)
    if (m) continue
    if (c.path === 'pnpm-lock.yaml') {
      findings.push({ file: c.path, message: 'the lockfile cannot change in a pull request', fix: 'Revert pnpm-lock.yaml. A maintainer regenerates it after merge.' })
    } else {
      findings.push({ file: c.path, message: 'only files inside apps/<slug>/ may change', fix: `Revert ${c.path}. Gate, schema, toolbox and template files are changed by maintainers.` })
    }
  }
  if (ctx.slugs.length > 1) {
    findings.push({ message: `the pull request changes ${ctx.slugs.length} apps (${ctx.slugs.join(', ')})`, fix: 'Open one pull request per app.' })
  }
  if (ctx.slug && !ctx.headHasManifest) {
    findings.push({ file: `apps/${ctx.slug}/lacuna.app.json`, message: 'the app folder has no lacuna.app.json at the head of the pull request', fix: 'Keep the manifest. Maintainers remove apps.' })
  }
  findings.push(...(ctx.treeProblems ?? []))
  if (ctx.lock) {
    const added = addedPackages(fs.readFileSync(ctx.lock.before, 'utf8'), fs.readFileSync(ctx.lock.after, 'utf8'))
    for (const k of added) findings.push({ file: 'pnpm-lock.yaml', message: `installing the app added a package to the lockfile: ${k}`, fix: 'Use only the dependencies in schema/allowlist.json, at the versions the lockfile already has.' })
  }
  return verdict(findings, { measured: { changedFiles: ctx.changes.length, apps: ctx.slugs } })
}
