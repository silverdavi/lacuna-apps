// bundle-scan: the built app in dist/ passes the same rules as its source, plus no dns-prefetch,
// preconnect or meta refresh. Addresses inside libraries are allowed only from the list in
// schema/allowlist.json (for example React's error page).
import fs from 'node:fs'
import path from 'node:path'
import { schemaFile, skip, verdict, walk } from './lib.mjs'
import { scanScripts, scanCss, scanHtml, urlLiteral } from './scan-rules.mjs'

export const id = 'bundle-scan'

export function bundleFindings(dist) {
  const { urlPrefixes, urlExact } = schemaFile('allowlist.json')
  const allow = [...urlPrefixes, ...urlExact.map((u) => `=${u}`)]
  const files = walk(dist, { skip: [] })
  const scripts = []
  const findings = []
  for (const rel of files) {
    const p = path.join(dist, rel)
    // Media is not read as text; notices and readmes are shown, never loaded or run.
    if (/\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|wav|ogg|mp4|webm|wasm|pdf|bin|md|txt)$/i.test(rel) || /^(?:.*\/)?(?:LICEN[CS]E|NOTICE|COPYING)[^/]*$/i.test(rel)) continue
    const text = fs.readFileSync(p, 'utf8')
    if (/\.[cm]?js$/.test(rel)) scripts.push({ name: rel, text })
    else if (rel.endsWith('.css')) findings.push(...scanCss(rel, text))
    else if (/\.(?:html?|svg|xml)$/.test(rel)) {
      const r = scanHtml(rel, text, { mode: 'bundle', allow })
      findings.push(...r.findings)
      scripts.push(...r.scripts)
    } else {
      text.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/["'(\s]((?:https?:)?\/\/[^\s"')]+)/g)) {
          if (urlLiteral(m[1], allow)) findings.push({ file: rel, line: i + 1, family: 'url', message: `address of another site: ${m[1].slice(0, 80)}`, fix: 'Bundle the file with the app and refer to it by a relative path.' })
        }
      })
    }
  }
  findings.push(...scanScripts(scripts, { mode: 'bundle', allow }))
  return { findings, scanned: files.length }
}

export async function run(ctx) {
  if (!ctx.build) return skip('the app was not built')
  if (!ctx.build.ok) return verdict([{ message: 'the app did not build, so its bundle cannot be scanned' }])
  const { findings, scanned } = bundleFindings(ctx.build.dist)
  return verdict(findings.map((f) => ({ ...f, file: `apps/${ctx.slug}/dist/${f.file}` })), { measured: { files: scanned } })
}
