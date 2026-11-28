// Shared helpers for the gate checks. No dependencies beyond Node.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const here = path.dirname(fileURLToPath(import.meta.url))
// The repository the checks run from. In CI this is the base branch checkout, so every script,
// schema file, toolbox module and the lockfile come from the base, never from the pull request.
export const root = path.resolve(here, '../..')

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function schemaFile(name) {
  return readJson(path.join(root, 'schema', name))
}

// Runs git in `cwd` and returns stdout. Throws with stderr on failure.
export function git(cwd, args, { input, encoding = 'utf8' } = {}) {
  const r = spawnSync('git', args, { cwd, input, encoding, maxBuffer: 256 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').toString().trim()}`)
  return r.stdout
}

// Every file under dir (relative paths, forward slashes), skipping the named directories.
export function walk(dir, { skip = ['node_modules'] } = {}) {
  const out = []
  const visit = (d, rel) => {
    if (!fs.existsSync(d)) return
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (skip.includes(ent.name)) continue
      const p = path.join(d, ent.name)
      const r = rel ? `${rel}/${ent.name}` : ent.name
      if (ent.isDirectory()) visit(p, r)
      else if (ent.isFile()) out.push(r)
    }
  }
  visit(dir, '')
  return out.sort()
}

// A check result. status: pass | fail | skip. findings: [{ file?, line?, message, fix? }].
export function result(status, findings = [], extra = {}) {
  return { status, findings, ...extra }
}

export const pass = (extra) => result('pass', [], extra)
export const skip = (reason) => result('skip', [{ message: reason }])
export const verdict = (findings, extra) => result(findings.length ? 'fail' : 'pass', findings, extra)

// A slug is one DNS label: lowercase letters, digits and hyphens, at most 63, no hyphen at either end.
export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
