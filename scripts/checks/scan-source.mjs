// source-scan: the app's own source, read with the TypeScript compiler, has no network calls, no code
// built from text, no reaching outside its frame and no addresses of other sites.
// Tests, scripts and the app's build config are not shipped and not scanned; the gate builds with its own config.
import fs from 'node:fs'
import path from 'node:path'
import { schemaFile, skip, verdict, walk } from './lib.mjs'
import { scanScripts, scanCss, scanHtml } from './scan-rules.mjs'

export const id = 'source-scan'

const SCRIPT = /\.(?:[cm]?[jt]sx?)$/
// What the build ships: src/, public/ and the page and stylesheets at the top of the app folder.
const SHIPPED = (rel) => rel.startsWith('src/') || rel.startsWith('public/') || /^[^/]+\.(?:html?|css)$/.test(rel)

export function sourceFindings(appDir) {
  const { urlPrefixes, urlExact } = schemaFile('allowlist.json')
  const allow = [...urlPrefixes, ...urlExact.map((u) => `=${u}`)]
  const files = walk(appDir, { skip: ['node_modules', 'dist'] }).filter(SHIPPED)
  const scripts = []
  const findings = []
  for (const rel of files) {
    const text = fs.readFileSync(path.join(appDir, rel), 'utf8')
    if (SCRIPT.test(rel) && !rel.endsWith('.d.ts')) scripts.push({ name: rel, text })
    else if (rel.endsWith('.css')) findings.push(...scanCss(rel, text))
    else if (/\.html?$/.test(rel)) {
      const r = scanHtml(rel, text, { mode: 'source', allow })
      findings.push(...r.findings)
      scripts.push(...r.scripts)
    }
  }
  findings.push(...scanScripts(scripts, { mode: 'source', allow }))
  return { findings, scanned: files.length }
}

export async function run(ctx) {
  if (!ctx.slug || !ctx.overlaid) return skip('no single app to check')
  const { findings, scanned } = sourceFindings(ctx.appDir)
  return verdict(findings.map((f) => ({ ...f, file: `apps/${ctx.slug}/${f.file}` })), { measured: { files: scanned } })
}
