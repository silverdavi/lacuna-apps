// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// Visual-language check for one app: node scripts/design-lint.mjs <apps/slug> [--report] [--strict]
//
// An app must look like Lacuna before any feature code. This lint fails an app that
//   shell        does not load '@lacuna/ui/base.css' in src/main.tsx (fonts, tokens, UI classes, app kit),
//                or does not render <AppShell> from '@lacuna/ui'
//   color        writes a color literal (hex, rgb(), hsl(), oklch(), a named color) in src/ or index.html.
//                Colors come from tokens: var(--ink), var(--accent), ... Colors that are data (paint
//                swatches, chart series, game pieces) live in src/colors.ts, the one file this rule skips.
//   font         sets a font-family that is not var(--serif), var(--sans), var(--mono) or inherit
//   theme        forces a theme: data-appearance, color-scheme or prefers-color-scheme in src/ or index.html
//                (the host sets the theme; the default is light)
//   kit-override restyles the kit from the app's own CSS: a selector on .lc-* / .lk-*, body, html or :root
//   chrome       draws its own header, logo, or breadcrumb (AppShell owns those)
//   focus        sets outline (the kit paints the focus ring)
//   empty        uses EmptyState without actionLabel, or builds its own lc-empty box
//
// chrome, focus, and empty fail an app whose creating commit already had toolbox/ui/behavior.tsx.
// Older apps are not failed by those three. --report never fails.
//
// It reads only apps/<slug>/src and apps/<slug>/index.html. It never reads toolbox/, so the kit's own
// stylesheets (which hold the token values) cannot fail it.
//
// Apps made before the kit existed are reported, not failed, until they adopt it: an app is held to the
// rules when its src/main.tsx imports base.css, or when the commit that created it already had
// toolbox/ui/kit.tsx. --strict holds every app to those earlier rules; --report never fails.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const reportOnly = args.includes('--report')
const strict = args.includes('--strict')
const dir = args.find((a) => !a.startsWith('--'))
if (!dir) throw new Error('usage: design-lint.mjs <apps/slug> [--report] [--strict]')
const here = path.dirname(fileURLToPath(import.meta.url))
const root = fs.realpathSync(path.resolve(here, '..'))
const appDir = fs.existsSync(path.resolve(dir)) ? fs.realpathSync(path.resolve(dir)) : path.resolve(dir)
const slug = path.basename(appDir)
const relApp = path.relative(root, appDir).split(path.sep).join('/')

const KIT_FILE = 'toolbox/ui/kit.tsx'
const BEHAVIOR_FILE = 'toolbox/ui/behavior.tsx'
const BASE_IMPORT = /import\s+['"]@lacuna\/ui\/base\.css['"]/
const DATA_COLORS = 'src/colors.ts'

const problems = []
const bad = (rule, file, line, text, fix) => problems.push({ rule, file, line, text: text.trim().slice(0, 140), fix })

// ---------------------------------------------------------------- files
const files = []
const walk = (d) => {
  if (!fs.existsSync(d)) return
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== 'dist') walk(p)
    } else if (/\.(ts|tsx|js|jsx|mjs|css)$/.test(e.name) && !/\.(test|spec)\.[jt]sx?$/.test(e.name)) {
      files.push(p)
    }
  }
}
walk(path.join(appDir, 'src'))
const indexHtml = path.join(appDir, 'index.html')
if (fs.existsSync(indexHtml)) files.push(indexHtml)

// Comments are not code: blank them, keeping line numbers.
function stripComments(text, ext) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  if (ext === '.html') out = out.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
  if (ext !== '.css' && ext !== '.html') out = out.replace(/(^|[\s;{}()])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length))
  return out
}

// ---------------------------------------------------------------- is this app held to the rules?
function git(...a) {
  const r = spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : null
}
const mainTsx = ['src/main.tsx', 'src/main.ts', 'src/main.jsx'].map((f) => path.join(appDir, f)).find((f) => fs.existsSync(f))
const mainText = mainTsx ? fs.readFileSync(mainTsx, 'utf8') : ''
const adopted = BASE_IMPORT.test(stripComments(mainText, '.tsx'))
function bornWith(file) {
  if (!fs.existsSync(path.join(root, file))) return false
  const born = (git('log', '--diff-filter=A', '--format=%H', '--', `${relApp}/package.json`) ?? '').split('\n').filter(Boolean).pop()
  const at = born ?? 'HEAD'
  const r = spawnSync('git', ['-C', root, 'cat-file', '-e', `${at}:${file}`])
  return r.status === 0
}
const held = strict || adopted || bornWith(KIT_FILE)
// New chrome rules follow the birth of behavior.tsx, not --strict, so an older app stays unfailed.
const behaviorHeld = bornWith(BEHAVIOR_FILE)

// ---------------------------------------------------------------- rules
const NAMED = 'white|black|red|green|blue|yellow|orange|purple|pink|gr[ae]y|navy|teal|brown|cyan|magenta|silver|gold|maroon|olive|lime|aqua|fuchsia|indigo|violet|beige|ivory|tan|coral|salmon|crimson|khaki|orchid|plum|turquoise|tomato|lavender|(?:dark|light|medium|pale|deep|dim)[a-z]{3,}|[a-z]+(?:white|smoke|gr[ae]y)'
const COLOR_FN = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?!var\()/i
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/
const CSS_PAINT = String.raw`(?:color|background(?:-color|-image)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?|stop-color|flood-color)`
const JS_PAINT = String.raw`(?:backgroundColor|background|borderColor|border(?:Top|Right|Bottom|Left)?(?:Color)?|outlineColor|outline|boxShadow|textShadow|accentColor|caretColor|fill|stroke|stopColor|floodColor)`
const namedCss = new RegExp(String.raw`(?:^|[\s;{"'])${CSS_PAINT}\s*:\s*[^;}]*?(?<![\w-])(${NAMED})(?![\w-])`, 'i')
const namedJs = new RegExp(String.raw`(?<![\w-])${JS_PAINT}\s*[:=]\s*\{?\s*['"\x60][^'"\x60]*?(?<![\w-])(${NAMED})(?![\w-])`, 'i')
const namedStyleColor = new RegExp(String.raw`style=\{\{[^}]*(?<![\w-])color\s*:\s*['"\x60][^'"\x60]*?(?<![\w-])(${NAMED})(?![\w-])`, 'i')
const OK_FONT = /var\(--(serif|sans|mono)\)|\binherit\b/
const cssFont = /(?:^|[\s;{"'])font-family\s*:\s*([^;}\n]+)/i
const jsFont = /(?<![\w-])fontFamily\s*[:=]\s*(['"\x60][^'"\x60]*['"\x60]|[^,}\n]+)/
const cssFontShort = /(?:^|[\s;{"'])font\s*:\s*([^;}\n]+)/i
const jsFontShort = /(?<![\w-.])font\s*:\s*(['"\x60][^'"\x60]*['"\x60])/
const THEME = /data-appearance|color-scheme\s*:|colorScheme\s*[:=]|prefers-color-scheme/
const KIT_SELECTOR = /(^|[\s,}>+~])(\.l[ck]-[\w-]+|body|html|:root)(?=[\s,{:.>+~\[]|$)/

let usesShell = false
let importsShell = false
for (const file of files) {
  const rel = path.relative(appDir, file).split(path.sep).join('/')
  const ext = path.extname(file)
  const raw = fs.readFileSync(file, 'utf8')
  const text = stripComments(raw, ext)
  if (ext !== '.css' && ext !== '.html') {
    if (/<AppShell[\s>]/.test(text)) usesShell = true
    if (/import\s*\{[^}]*\bAppShell\b[^}]*\}\s*from\s*['"]@lacuna\/ui['"]/.test(text)) importsShell = true
  }
  const lines = text.split('\n')
  let depth = 0 // CSS: only lines at depth 0 are selectors
  lines.forEach((line, i) => {
    const n = i + 1
    const noVar = line.replace(/var\(--[\w-]+\)/g, 'VAR')
    if (rel !== DATA_COLORS) {
      const ent = ext === '.html' ? noVar.replace(/&#\w+;/g, '') : noVar
      if (HEX.test(ent) && !(ext !== '.css' && /(href|id|to|htmlFor|aria-\w+)=["'{]\s*['"]?#/.test(ent))) {
        bad('color', rel, n, line, 'use a token: var(--ink), var(--accent), var(--paper), ...; data colors go in src/colors.ts')
      } else if (COLOR_FN.test(noVar)) {
        bad('color', rel, n, line, 'use a token, or color-mix() of tokens; data colors go in src/colors.ts')
      } else if ((ext === '.css' && namedCss.test(noVar)) || (ext !== '.css' && (namedJs.test(noVar) || namedStyleColor.test(noVar) || (ext === '.html' && namedCss.test(noVar))))) {
        bad('color', rel, n, line, 'named colors are literals too; use a token')
      }
    }
    const fam = ext === '.css' || ext === '.html' ? cssFont.exec(line) : jsFont.exec(line) ?? cssFont.exec(line)
    if (fam && !OK_FONT.test(fam[1])) bad('font', rel, n, line, 'font-family is var(--serif), var(--sans) or var(--mono)')
    const short = ext === '.css' || ext === '.html' ? cssFontShort.exec(line) : jsFontShort.exec(line)
    if (short && !OK_FONT.test(short[1])) bad('font', rel, n, line, 'the font shorthand must name var(--serif), var(--sans) or var(--mono), or be inherit')
    if (THEME.test(line)) bad('theme', rel, n, line, 'do not set or detect the theme; the host does, and the default is light')
    if (ext === '.css') {
      if (depth === 0 && /[{,]\s*$/.test(line.trim()) && !line.trim().startsWith('@')) {
        const m = KIT_SELECTOR.exec(line)
        if (m) bad('kit-override', rel, n, line, `do not restyle ${m[2]}; use the component's props, or your own class on your own element`)
      }
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
      if (depth < 0) depth = 0
    }
  })
}
if (!mainTsx) bad('shell', 'src/main.tsx', 0, 'missing', 'start from template/: src/main.tsx imports \'@lacuna/ui/base.css\'')
else if (!adopted) bad('shell', path.relative(appDir, mainTsx), 0, "no import '@lacuna/ui/base.css'", "add: import '@lacuna/ui/base.css' (fonts, tokens, UI classes, app kit)")
if (!usesShell || !importsShell) bad('shell', 'src/App.tsx', 0, 'no <AppShell> from @lacuna/ui', "wrap the app: import { AppShell } from '@lacuna/ui' and render <AppShell name=... icon=... hue=...> as the outermost element")

// A new app does not draw chrome the shell already owns, and does not invent focus or an empty box.
if (behaviorHeld) {
  const chromeLine = [
    [/<header\b/, 'AppShell owns the header. Pass name, hue, and category. Do not draw a top bar.'],
    [/\blc-brand-home\b|\blc-brandname\b|\bBrandHome\b|<Mark\b|aria-label=["'](?:Lacuna home|Home)["']/, 'AppShell owns the logo link. Do not add another.'],
    [/\blc-cv-crumbs\b|\blc-crumb\b|\bBreadcrumbs\b|aria-label=["']Breadcrumb["']/, 'AppShell owns the breadcrumb. Pass category; the app name is the current page.'],
    [/\blc-desk-head\b|\blk-top\b|\blc-app-bar\b|\blc-topbar\b/, 'AppShell owns the top bar and the window title.'],
  ]
  for (const file of files) {
    const rel = path.relative(appDir, file).split(path.sep).join('/')
    const ext = path.extname(file)
    const text = stripComments(fs.readFileSync(file, 'utf8'), ext)
    text.split('\n').forEach((line, i) => {
      for (const [re, fix] of chromeLine) {
        if (re.test(line)) bad('chrome', rel, i + 1, line, fix)
      }
      if (/\boutline\s*:/.test(line)) bad('focus', rel, i + 1, line, 'the focus ring comes from the kit (:focus-visible, 2px accent). Do not set outline.')
      if (/\blc-empty\b/.test(line)) bad('empty', rel, i + 1, line, 'use EmptyState with actionLabel. Do not build an empty box.')
    })
    if (ext !== '.css' && ext !== '.html') {
      for (const m of text.matchAll(/<EmptyState\b[\s\S]*?>/g)) {
        if (!/\bactionLabel\s*=/.test(m[0])) {
          const line = text.slice(0, m.index).split('\n').length
          bad('empty', rel, line, m[0].split('\n')[0], 'EmptyState requires actionLabel, the words for the next action')
        }
      }
    }
  }
}

// ---------------------------------------------------------------- report
const fail = problems.length > 0 && held && !reportOnly
const tag = fail ? 'design-lint' : 'design-lint (report only)'
if (problems.length === 0) {
  console.log(`design-lint ok: ${slug} (${files.length} files${held ? '' : ', made before the kit'})`)
} else {
  const byRule = {}
  for (const p of problems) (byRule[p.rule] ??= []).push(p)
  console.log(`${tag}: ${slug}: ${problems.length} problem${problems.length === 1 ? '' : 's'} (${Object.entries(byRule).map(([r, l]) => `${r} ${l.length}`).join(', ')})`)
  if (!held) console.log('  made before the app kit and not yet moved to it: listed for a restyle, not failed')
  for (const [rule, list] of Object.entries(byRule)) {
    for (const p of list.slice(0, 12)) console.log(`  ${rule} ${p.file}${p.line ? ':' + p.line : ''}  ${p.text}\n      fix: ${p.fix}`)
    if (list.length > 12) console.log(`  ${rule} ... and ${list.length - 12} more`)
  }
}
process.exit(fail ? 1 : 0)
