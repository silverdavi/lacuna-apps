// Acceptance-test lint for one app or component: node scripts/acceptance-lint.mjs <dir> [--report]
//
// The acceptance tests of a task are written from its spec before the implementation exists and
// are then locked. <dir>/acceptance.json records them:
//   { "version": 1, "spec_sha256": "...", "checks": [{ "id": "A1", "text": "..." }],
//     "locked": [{ "path": "tests/acceptance.spec.ts", "sha256": "..." }] }
// This script checks what can be checked from the tree alone:
//   - acceptance.json exists, every locked file exists and has the recorded hash;
//   - every check id appears in the title of at least one test in a locked file, as "[A1] ...";
//   - no test file skips, focuses or expects failure (.skip, .only, .fixme, .todo, .fail, xit);
//   - every test asserts something, and not on a constant;
//   - browser tests act like a person: no dispatchEvent, no state written from page.evaluate or
//     addInitScript, and a test that evaluates in the page must also click, type or press.
// The factory holds its own copy of the hashes outside the repository; that copy, not this file,
// is what stops acceptance.json itself from being rewritten.
// --report prints the findings but exits 0 (used for items the branch did not change).
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const report = args.includes('--report')
const dir = args.find((a) => !a.startsWith('--'))
if (!dir) throw new Error('usage: acceptance-lint.mjs <apps/slug | components/name> [--report]')
const problems = []
const bad = (m) => problems.push(m)

function walk(d, acc = []) {
  if (!fs.existsSync(d)) return acc
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}
const rel = (p) => path.relative(dir, p).split(path.sep).join('/')
const testFiles = walk(path.join(dir, 'tests')).filter((f) => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(f)).sort()

// ---- a small scanner: code with comments and string contents blanked, same length as the source
function blank(src) {
  const out = src.split('')
  const n = src.length
  const fill = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ' }
  const stack = [] // 'T' = inside a template literal, 'E' = inside ${ } of one
  let i = 0
  while (i < n) {
    const c = src[i], d = src[i + 1]
    const inTemplate = stack[stack.length - 1] === 'T'
    if (inTemplate) {
      if (c === '\\') { fill(i, i + 2); i += 2; continue }
      if (c === '`') { stack.pop(); i++; continue }
      if (c === '$' && d === '{') { stack.push('E'); i += 2; continue }
      fill(i, i + 1); i++; continue
    }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const end = e < 0 ? n : e; fill(i, end); i = end; continue }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; fill(i, end); i = end; continue }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      fill(i + 1, Math.min(j, n)); i = j + 1; continue
    }
    if (c === '`') { stack.push('T'); i++; continue }
    if (c === '/') { // a regex literal, when a value is expected here
      let k = i - 1
      while (k >= 0 && (src[k] === ' ' || src[k] === '\t')) k--
      if (k < 0 || '(,=:[!&|?{};\n'.includes(src[k]) || /\breturn$/.test(src.slice(Math.max(0, k - 5), k + 1))) {
        let j = i + 1, cls = false
        while (j < n && src[j] !== '\n' && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++ }
        fill(i + 1, Math.min(j, n)); i = j + 1; continue
      }
    }
    if (c === '{' && stack.length) stack.push('B')
    if (c === '}' && stack.length) { stack.pop(); i++; continue }
    i++
  }
  return out.join('')
}
function closing(code, open) { // index of the bracket matching code[open]
  const pairs = { '(': ')', '{': '}', '[': ']' }
  const want = pairs[code[open]]
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === code[open]) depth++
    else if (code[i] === want && --depth === 0) return i
  }
  return -1
}

const ACTION = /\.(?:click|dblclick|fill|press|pressSequentially|type|check|uncheck|setChecked|selectOption|hover|tap|dragTo|setInputFiles|selectText|clear)\s*\(|\b(?:mouse|keyboard|touchscreen)\s*\.\s*(?:click|dblclick|down|up|move|wheel|press|type|insertText|tap)\s*\(|\buserEvent\s*\.|\bfireEvent\s*[.(]/
const EVALUATE = /\.(?:evaluate|evaluateAll|evaluateHandle|\$eval|\$\$eval)\s*\(/g
const POKE = /\b(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|clear)\b|\b(?:localStorage|sessionStorage)\s*\[[^\]]*\]\s*=[^=]|\bindexedDB\b|\.\s*(?:value|checked|selected|innerHTML|innerText|textContent|disabled|hidden|scrollTop|scrollLeft)\s*=[^=]|\.\s*(?:click|focus|blur|submit|remove|append|appendChild|setAttribute|removeAttribute|requestSubmit|dispatchEvent)\s*\(|\bnew\s+(?:\w*Event)\s*\(|\b__\w+|\bwindow\s*\.\s*\w+\s*=[^=]|\.style\s*\.\s*\w+\s*=[^=]/
const FOCUS = /\b(?:test|it|describe|suite)\s*\.\s*(?:\w+\s*\.\s*)*(?:skip|only|fixme|todo|fail|skipIf|runIf|fails)\b|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(/
const CONSTANT = /\bexpect\s*\(\s*(?:true|false|null|undefined|-?\d+(?:\.\d+)?|''|""|``)\s*\)/
const TEST_CALL = /(?<![.\w$])(?:test|it)(?:\s*\.\s*(?:each|concurrent|sequential|step|describe)\b[^(]*)?\s*\(/g

function analyse(file) {
  const src = fs.readFileSync(file, 'utf8')
  const code = blank(src)
  const name = rel(file)
  const browser = /\.spec\.[cm]?[jt]sx?$/.test(file)
  const out = { name, browser, tests: [] }
  const line = (i) => src.slice(0, i).split('\n').length
  const m = code.match(FOCUS)
  if (m) bad(`${name}:${line(m.index)} skipped, focused or expected-to-fail test (${m[0].replace(/\s+/g, '')})`)
  const cm = code.match(CONSTANT)
  if (cm) bad(`${name}:${line(cm.index)} assertion on a constant (${cm[0].replace(/\s+/g, '')})`)
  if (/\bvi\s*\.\s*(?:mock|doMock)\s*\(/.test(code) && /(?:mock|doMock)\s*\(\s*['"](?:\.\.\/src|@lacuna-components\/)/.test(src)) bad(`${name}: mocks the module under test`)
  if (browser) {
    const d = code.search(/\bdispatchEvent\s*\(/)
    if (d >= 0) bad(`${name}:${line(d)} dispatchEvent: drive the page with click, fill, press, mouse or dragTo instead`)
    const a = code.search(/\baddInitScript\s*\(/)
    if (a >= 0) bad(`${name}:${line(a)} addInitScript: state must come from user actions, not be injected`)
    for (const e of code.matchAll(EVALUATE)) {
      const open = e.index + e[0].length - 1
      const close = closing(code, open)
      const body = close > 0 ? code.slice(open, close) : code.slice(open, open + 2000)
      const p = body.match(POKE)
      if (p) bad(`${name}:${line(open + p.index)} page state changed from ${e[0].replace(/[\s(.]/g, '')} (${p[0].trim().replace(/\s+/g, '')}): use a user action`)
    }
  }
  // helpers defined in the file: which of them act, assert, or evaluate
  const helpers = {}
  for (const h of code.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b[^(]*)?\()/g)) {
    const nameH = h[1] || h[2]
    const openParen = h.index + h[0].length - 1
    const closeParen = closing(code, openParen)
    if (closeParen < 0) continue
    const brace = code.indexOf('{', closeParen)
    const arrow = code.slice(closeParen, closeParen + 40)
    if (brace < 0 || (!h[1] && !/^\)\s*(?::[^=]{0,60})?=>/.test(arrow) && !/^\)\s*(?::[^{]{0,80})?\{/.test(arrow))) continue
    const end = closing(code, brace)
    if (end < 0) continue
    const body = code.slice(brace, end)
    helpers[nameH] = { act: ACTION.test(body), assert: /\bexpect\s*[.(]/.test(body) }
  }
  const calls = (body, key) => Object.entries(helpers).some(([n, h]) => h[key] && new RegExp(`(?<![.\\w$])${n.replace(/\$/g, '\\$')}\\s*\\(`).test(body))
  for (const t of code.matchAll(TEST_CALL)) {
    const open = t.index + t[0].length - 1
    const close = closing(code, open)
    if (close < 0) continue
    const rawArgs = src.slice(open + 1, close)
    const tm = rawArgs.match(/^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/)
    if (!tm) continue // not a test definition with a literal title
    const body = code.slice(open + 1, close)
    const title = tm[2]
    const ids = [...title.matchAll(/\[(A\d+)\]/g)].map((x) => x[1])
    const test = { title, ids, line: line(t.index) }
    if (!/\bexpect\s*[.(]/.test(body) && !calls(body, 'assert')) bad(`${name}:${test.line} test "${title.slice(0, 60)}" asserts nothing`)
    if (browser && new RegExp(EVALUATE.source).test(body) && !ACTION.test(body) && !calls(body, 'act')) {
      bad(`${name}:${test.line} test "${title.slice(0, 60)}" reads or changes the page from evaluate without one user action (click, fill, press, mouse, dragTo)`)
    }
    out.tests.push(test)
  }
  return out
}

const analysed = testFiles.map(analyse)
const total = analysed.reduce((n, f) => n + f.tests.length, 0)
if (!testFiles.length) bad('no test files in tests/')

// ---- acceptance.json: locked files and the id map
const metaPath = path.join(dir, 'acceptance.json')
let checks = 0, locked = 0
if (!fs.existsSync(metaPath)) {
  bad('no acceptance.json: the acceptance tests of this task were not written from the spec and locked')
} else {
  let meta = null
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) } catch (e) { bad(`acceptance.json is not valid JSON: ${e.message}`) }
  if (meta) {
    const list = Array.isArray(meta.checks) ? meta.checks : []
    const files = Array.isArray(meta.locked) ? meta.locked : []
    if (meta.version !== 1) bad('acceptance.json: version must be 1')
    if (!list.length) bad('acceptance.json lists no checks')
    if (!files.length) bad('acceptance.json lists no locked test files')
    const ids = list.map((c) => c?.id)
    if (ids.some((id) => !/^A\d+$/.test(id || '')) || new Set(ids).size !== ids.length) bad('acceptance.json: check ids must be unique and look like A1, A2, ...')
    const lockedNames = new Set()
    for (const f of files) {
      const p = typeof f?.path === 'string' ? f.path : ''
      if (!/^tests\/[\w./-]+\.(?:spec|test)\.tsx?$/.test(p) || p.includes('..')) { bad(`acceptance.json: locked path "${p}" is not a test file under tests/`); continue }
      const abs = path.join(dir, p)
      if (!fs.existsSync(abs)) { bad(`locked acceptance test is missing: ${p}`); continue }
      const sum = createHash('sha256').update(fs.readFileSync(abs)).digest('hex')
      if (sum !== f.sha256) bad(`locked acceptance test changed: ${p} (recorded ${String(f.sha256).slice(0, 12)}, now ${sum.slice(0, 12)})`)
      lockedNames.add(p)
    }
    const have = new Map()
    for (const f of analysed) if (lockedNames.has(f.name)) for (const t of f.tests) for (const id of t.ids) have.set(id, (have.get(id) || 0) + 1)
    const missing = ids.filter((id) => /^A\d+$/.test(id || '') && !have.has(id))
    if (missing.length) bad(`no locked test for acceptance check ${missing.join(', ')}: each check needs a test titled "[<id>] ..."`)
    checks = ids.length
    locked = lockedNames.size
  }
}

if (problems.length) {
  for (const p of problems) console.error(`  ${report ? 'WARN' : 'acceptance'}: ${p}`)
  if (!report) process.exit(1)
  console.log(`acceptance lint (report only): ${problems.length} findings in ${dir}`)
} else {
  console.log(`acceptance ok: ${dir} (${checks} checks, ${locked} locked files, ${total} tests in ${testFiles.length} files)`)
}
