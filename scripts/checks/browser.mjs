// browser and a11y: scripts/smoke.spec.ts against the built app, in Playwright's Chromium.
// One run serves both checks; tests tagged @a11y are the a11y check, the rest are the browser check.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { root, skip, verdict } from './lib.mjs'

export const id = 'browser'

function runPlaywright(ctx) {
  if (ctx.playwright) return ctx.playwright
  const out = path.join(ctx.artifacts, 'browser')
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(out, { recursive: true })
  const env = {
    ...process.env,
    APP: ctx.slug,
    SHOTS: path.join(ctx.artifacts, 'screenshots'),
    GATE_DIST: ctx.build.dist,
    GATE_OUT: out,
    PORT: String(ctx.port ?? 4173),
  }
  const cli = path.join(root, 'node_modules/@playwright/test/cli.js')
  const r = spawnSync(process.execPath, [cli, 'test', '-c', path.join(root, 'scripts/checks/playwright.gate.config.ts')], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const report = path.join(out, 'playwright.json')
  const tests = []
  if (fs.existsSync(report)) {
    const visit = (suite) => {
      for (const spec of suite.specs ?? []) {
        for (const t of spec.tests ?? []) {
          const res = t.results?.at(-1)
          const errors = (res?.errors ?? []).map((e) => (e.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 12).join('\n'))
          tests.push({ title: spec.title, ok: t.status === 'expected', errors })
        }
      }
      for (const s of suite.suites ?? []) visit(s)
    }
    for (const s of JSON.parse(fs.readFileSync(report, 'utf8')).suites ?? []) visit(s)
  }
  ctx.playwright = { tests, status: r.status, log: (r.stdout + r.stderr).slice(-4000) }
  return ctx.playwright
}

export function results(ctx, tag) {
  if (!ctx.build) return skip('the app was not built')
  if (!ctx.build.ok) return verdict([{ message: 'the app did not build, so it cannot be opened' }])
  const pw = runPlaywright(ctx)
  const mine = pw.tests.filter((t) => (tag === 'a11y') === t.title.includes('@a11y'))
  if (!mine.length) return verdict([{ message: 'the browser run did not start', fix: pw.log.split('\n').slice(-6).join(' ') }])
  const findings = mine.filter((t) => !t.ok).map((t) => ({ message: `${t.title.replace(/\s*@\w+/g, '')}: ${t.errors.join(' ') || 'failed'}` }))
  return verdict(findings, { measured: { tests: mine.length, failed: findings.length } })
}

export async function run(ctx) {
  return results(ctx, 'browser')
}
