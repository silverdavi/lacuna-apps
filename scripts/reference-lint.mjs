// Attribution check for one app or component: node scripts/reference-lint.mjs <dir> [--report]
//
// A task built with an open-source reference declares it in <dir>/reference.json:
//   { "repo": "owner/name", "url": "https://github.com/owner/name", "sha": "<40 hex>", "spdx": "MIT",
//     "licence_path": "LICENSE", "copyright": ["Copyright (c) ..."], "files": ["src/x.js"],
//     "upstream_notice": false, "notice_sha256": "<sha256 of NOTICE.md>" }
// and ships <dir>/NOTICE.md with the same facts and the upstream licence text (apps also ship it as
// public/NOTICE.md, so it is in the built app). This script fails when:
//   - reference.json is present but the repository at that commit and licence is not in
//     scripts/vetted-references.json (the list of references whose licence file was verified);
//   - the licence is not on the allowed list;
//   - NOTICE.md is missing, was edited, or lacks the URL, commit, SPDX id, a copyright line, the
//     licence text, or (when the upstream has one) the upstream NOTICE;
//   - NOTICE.md is present without reference.json.
// A task with neither file has declared no reference and passes.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const report = args.includes('--report')
const dir = args.find((a) => !a.startsWith('--'))
if (!dir) throw new Error('usage: reference-lint.mjs <apps/slug | components/name> [--report]')
const here = path.dirname(new URL(import.meta.url).pathname)
const problems = []
const bad = (m) => problems.push(m)
const finish = (ok) => {
  if (problems.length) {
    for (const p of problems) console.error(`  ${report ? 'WARN' : 'reference'}: ${p}`)
    if (!report) process.exit(1)
  } else console.log(ok)
  process.exit(0)
}

const MARK = {
  MIT: [/Permission is hereby granted, free of charge/i, /THE SOFTWARE IS PROVIDED "AS IS"/i],
  'Apache-2.0': [/Apache License/i, /Version 2\.0, January 2004/i, /TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION/i],
  'BSD-2-Clause': [/Redistribution and use in source and binary forms/i, /THIS SOFTWARE IS PROVIDED BY/i],
  'BSD-3-Clause': [/Redistribution and use in source and binary forms/i, /Neither the name/i],
  ISC: [/Permission to use, copy, modify, and\/?o?r? ?distribute this software/i, /THE SOFTWARE IS PROVIDED "AS IS"/i],
  '0BSD': [/Permission to use, copy, modify, and\/?o?r? ?distribute this software/i],
  Unlicense: [/free and unencumbered software released into the public domain/i],
  'CC0-1.0': [/CC0 1\.0 Universal/i, /Statement of Purpose/i],
  'MIT-0': [/Permission is hereby granted, free of charge/i, /THE SOFTWARE IS PROVIDED "AS IS"/i],
  Zlib: [/provided ['‘’]as-is['‘’]/i, /Altered source versions must be plainly marked/i],
  'zlib-acknowledgement': [/provided ['‘’]as-is['‘’]/i, /Altered source versions must be plainly marked/i],
  'libpng-2.0': [/PNG Reference Library License version 2/i],
  WTFPL: [/DO WHAT THE FUCK YOU WANT TO PUBLIC LICEN[SC]E/i],
  'BlueOak-1.0.0': [/Blue Oak Model License/i],
  PostgreSQL: [/Permission to use, copy, modify, and distribute this software and its documentation for any purpose, without fee/i],
  'BSD-3-Clause-Clear': [/Redistribution and use in source and binary forms/i, /NO EXPRESS OR IMPLIED LICENSES TO ANY PARTY['‘’]S PATENT RIGHTS/i],
  'ECL-2.0': [/Educational Community License/i],
}
// The licence section must hold the text, not a mention of it; the WTFPL is shorter than the others.
const MIN_LICENCE_CHARS = { WTFPL: 150 }

const refPath = path.join(dir, 'reference.json')
const noticePath = path.join(dir, 'NOTICE.md')
const isApp = fs.existsSync(path.join(dir, 'lacuna.app.json'))
if (!fs.existsSync(refPath)) {
  if (fs.existsSync(noticePath) || fs.existsSync(path.join(dir, 'public/NOTICE.md'))) bad('NOTICE.md without reference.json: a reference must be declared')
  finish(`reference ok: ${dir} declares no reference`)
}
let ref = null
try { ref = JSON.parse(fs.readFileSync(refPath, 'utf8')) } catch (e) { bad(`reference.json is not valid JSON: ${e.message}`); finish('') }
let vetted = { allowed_licences: [], references: [] }
try { vetted = JSON.parse(fs.readFileSync(path.join(here, 'vetted-references.json'), 'utf8')) } catch { bad('scripts/vetted-references.json is missing or unreadable') }

const str = (v) => (typeof v === 'string' ? v : '')
const repo = str(ref.repo), sha = str(ref.sha), spdx = str(ref.spdx)
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) bad('reference.json: repo must be "owner/name"')
if (!/^[0-9a-f]{40}$/.test(sha)) bad('reference.json: sha must be a full commit id')
if (str(ref.url) !== `https://github.com/${repo}`) bad('reference.json: url must be https://github.com/<repo>')
if (!vetted.allowed_licences.includes(spdx)) bad(`reference.json: licence "${spdx}" is not on the allowed list (${vetted.allowed_licences.join(', ')})`)
if (!vetted.references.some((v) => v.repo === repo && v.sha === sha && v.spdx === spdx)) {
  bad(`declared reference ${repo}@${sha.slice(0, 10)} (${spdx}) is not on the vetted list (scripts/vetted-references.json)`)
}
const copyright = Array.isArray(ref.copyright) ? ref.copyright.filter((c) => typeof c === 'string' && c.trim()) : []
if (!copyright.length) bad('reference.json: copyright must list at least one line')

if (!fs.existsSync(noticePath)) {
  bad('reference.json is present but NOTICE.md is missing')
} else {
  const buf = fs.readFileSync(noticePath)
  const text = buf.toString('utf8')
  if (createHash('sha256').update(buf).digest('hex') !== ref.notice_sha256) bad('NOTICE.md does not match the hash recorded in reference.json (it was edited or replaced)')
  for (const [label, needle] of [['repository URL', `https://github.com/${repo}`], ['commit', sha], ['SPDX id', `SPDX: ${spdx}`]]) {
    if (!text.includes(needle)) bad(`NOTICE.md lacks the ${label} (${needle})`)
  }
  for (const c of copyright) if (!text.includes(c)) bad(`NOTICE.md lacks the copyright line "${c.slice(0, 80)}"`)
  const lic = text.split(/^## Upstream licence\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  if (lic.trim().length < (MIN_LICENCE_CHARS[spdx] ?? 400)) bad('NOTICE.md has no "## Upstream licence" section with the licence text')
  for (const re of MARK[spdx] ?? []) if (!re.test(lic.replace(/\s+/g, ' '))) bad(`NOTICE.md: the licence text does not read as ${spdx}`)
  if (ref.upstream_notice && !/^## Upstream NOTICE\s*$/m.test(text)) bad('NOTICE.md lacks the "## Upstream NOTICE" section the upstream repository requires')
  if (isApp) {
    const pub = path.join(dir, 'public/NOTICE.md')
    if (!fs.existsSync(pub) || !fs.readFileSync(pub).equals(buf)) bad('public/NOTICE.md must be a copy of NOTICE.md, so the built app ships the attribution')
  }
}
finish(`reference ok: ${dir} declares ${repo}@${sha.slice(0, 10)} (${spdx}) with NOTICE.md`)
