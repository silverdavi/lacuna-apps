// owner: a new app's manifest names its author. maintainer.github must equal the pull request's author,
// which the workflow reads from the pull request event, never from the pull request's files.
// First-party apps are opened only by the repository's code owners (CODEOWNERS on the base branch).
// An existing app keeps its maintainer of record. Anyone may propose a fix to it; the maintainer's
// approval is recorded at review.
import fs from 'node:fs'
import path from 'node:path'
import { root, skip, verdict } from './lib.mjs'

export const id = 'owner'

export function codeOwners(dir = root) {
  for (const rel of ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']) {
    const p = path.join(dir, rel)
    if (!fs.existsSync(p)) continue
    const out = new Set()
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (line.trim().startsWith('#')) continue
      for (const m of line.matchAll(/@([A-Za-z0-9][A-Za-z0-9-]*)(?=\s|$)/g)) out.add(m[1].toLowerCase())
    }
    return out
  }
  return new Set()
}

const lower = (s) => (typeof s === 'string' ? s.toLowerCase() : '')

export async function run(ctx) {
  if (!ctx.slug) return skip('no single app to check')
  if (!ctx.manifest) return skip('no readable manifest; the manifest check reports why')
  const author = lower(ctx.author)
  if (!author) return verdict([{ message: 'the pull request author is unknown', fix: 'The gate reads the author from the pull request event.' }])
  const owners = codeOwners()
  const findings = []
  const claim = (m) => ({ type: m?.maintainer?.type, github: lower(m?.maintainer?.github) })
  const now = claim(ctx.manifest)

  if (ctx.isNew) {
    if (now.type === 'first-party') {
      if (!owners.has(author)) findings.push({ file: `apps/${ctx.slug}/lacuna.app.json`, message: `${ctx.author} is not a maintainer, so the app cannot be first-party`, fix: 'Set maintainer.type to "third-party" and maintainer.github to your GitHub username.' })
    } else if (!now.github) {
      findings.push({ file: `apps/${ctx.slug}/lacuna.app.json`, message: 'maintainer.github is missing', fix: `Set maintainer.github to "${ctx.author}".` })
    } else if (now.github !== author) {
      findings.push({ file: `apps/${ctx.slug}/lacuna.app.json`, message: `maintainer.github is "${ctx.manifest.maintainer.github}" but the pull request is from ${ctx.author}`, fix: 'A new app is opened by the person named in its manifest.' })
    }
    return verdict(findings, { measured: { author: ctx.author, maintainer: ctx.manifest.maintainer?.github ?? null, newApp: true } })
  }

  const before = claim(ctx.baseManifest)
  if (before.type !== now.type || before.github !== now.github) {
    findings.push({ file: `apps/${ctx.slug}/lacuna.app.json`, message: 'the maintainer of an existing app cannot change in a pull request', fix: 'Keep maintainer.type and maintainer.github as they are. Ask a maintainer to transfer an app.' })
  }
  // A fix to someone else's app is allowed; their approval is recorded at review, not by this check.
  const ownerOfRecord = before.type === 'first-party' ? owners.has(author) : before.github === author
  const notes = ownerOfRecord ? [] : [`${ctx.author} is not the maintainer of record of ${ctx.slug}; it is merged only after ${before.type === 'first-party' ? 'a maintainer' : ctx.baseManifest?.maintainer?.github} approves at review`]
  return verdict(findings, { notes, measured: { author: ctx.author, maintainer: ctx.baseManifest?.maintainer?.github ?? null, newApp: false, maintainerOfRecord: ownerOfRecord } })
}
