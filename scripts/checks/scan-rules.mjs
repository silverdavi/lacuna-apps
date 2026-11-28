// The rules behind source-scan and bundle-scan. Scripts are read with the TypeScript compiler and its
// type checker, so a name is flagged only when it really is the browser's global (a local variable
// called `open` or a rectangle's `top` is fine). CSS and HTML are read as text.
//
// Families: network (fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, RTCPeerConnection,
// importScripts), code (eval, Function, string timers, dynamic import()), workers from a URL,
// document.cookie and document.write, window.open, top and parent, location assignment, and
// absolute http(s) URLs. The bundle scan adds dns-prefetch, preconnect and meta refresh.
import ts from 'typescript'
import path from 'node:path'

const FIX = {
  network: 'Apps cannot reach the network. Keep data on the device with the toolbox storage helpers.',
  code: 'Apps cannot run code built from text. Call the function directly.',
  import: 'Use a static import at the top of the file.',
  worker: 'Create workers with new Worker(new URL(\'./worker.ts\', import.meta.url)).',
  document: 'Use the toolbox storage helpers and render with React.',
  window: 'Apps run in a frame and cannot reach the page around them or open windows. Use links the person clicks.',
  location: 'Apps cannot navigate their page. Keep state in React, or change location.hash for in-app routes.',
  url: 'Bundle every image, font and file with the app and refer to it by a relative path.',
  html: 'Remove the tag. Apps do not load anything from other sites or reload themselves.',
}

// Globals (declared with `declare var` or `declare function` in the browser's type library).
const GLOBALS = {
  fetch: 'network', XMLHttpRequest: 'network', WebSocket: 'network', EventSource: 'network',
  RTCPeerConnection: 'network', webkitRTCPeerConnection: 'network', importScripts: 'network',
  eval: 'code', Function: 'code',
  open: 'window', top: 'window', parent: 'window', opener: 'window', frameElement: 'window',
}
// Members of the browser's interfaces, as Interface.member.
const MEMBERS = {
  'WindowOrWorkerGlobalScope.fetch': 'network', 'Window.fetch': 'network',
  'Navigator.sendBeacon': 'network',
  'Document.cookie': 'document', 'Document.write': 'document', 'Document.writeln': 'document',
  'Window.open': 'window', 'Window.top': 'window', 'Window.parent': 'window', 'Window.opener': 'window', 'Window.frameElement': 'window',
  'Location.assign': 'location', 'Location.replace': 'location',
}
// Property names flagged even when the checker cannot tell what owns them (an `any` value).
const DISTINCTIVE = new Set(['fetch', 'sendBeacon', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'RTCPeerConnection', 'webkitRTCPeerConnection', 'importScripts', 'cookie', 'eval'])
const GLOBAL_OBJECTS = new Set(['window', 'self', 'globalThis', 'document', 'navigator', 'top', 'parent', 'frames', 'location'])
const LABEL = {
  'Navigator.sendBeacon': 'navigator.sendBeacon', 'Document.cookie': 'document.cookie', 'Document.write': 'document.write',
  'Document.writeln': 'document.writeln', 'Window.open': 'window.open', 'Window.top': 'window.top', 'Window.parent': 'window.parent',
  'Window.opener': 'window.opener', 'Location.assign': 'location.assign', 'Location.replace': 'location.replace',
}

const URL_AT_START = /^\s*(?:https?:)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/i
const CSS_URL = /(?:url\(\s*['"]?\s*(?:https?:)?\/\/[a-z0-9-]+\.|@import\s+(?:url\(\s*)?['"]?\s*(?:https?:)?\/\/)/i

const COMPILER = {
  allowJs: true, checkJs: false, noEmit: true, noResolve: true, skipLibCheck: true, types: [],
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
}

const finding = (file, line, family, what) => ({ file, line, family, message: what, fix: FIX[family] })

// allow: prefixes, or exact addresses written as "=https://...".
function allowedUrl(text, allow) {
  const t = text.trim()
  return allow.some((p) => (p.startsWith('=') ? t === p.slice(1) : t.startsWith(p)))
}

export function urlLiteral(text, allow) {
  return (URL_AT_START.test(text) && !allowedUrl(text, allow)) || CSS_URL.test(text)
}

// Scans scripts. files: [{ name, text }] with names relative to the app or dist folder.
// mode: 'source' or 'bundle'. allow: URL prefixes that may appear (bundle only).
export function scanScripts(files, { mode = 'source', allow = [] } = {}) {
  if (!files.length) return []
  const virtual = new Map(files.map((f) => [path.resolve('/__scan__', f.name), f]))
  const host = ts.createCompilerHost(COMPILER, true)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, lang, ...rest) => {
    const v = virtual.get(path.resolve(name))
    if (v) return ts.createSourceFile(name, v.text, lang, true, kindOf(name))
    return getSourceFile(name, lang, ...rest)
  }
  host.fileExists = ((orig) => (name) => virtual.has(path.resolve(name)) || orig(name))(host.fileExists.bind(host))
  host.readFile = ((orig) => (name) => virtual.get(path.resolve(name))?.text ?? orig(name))(host.readFile.bind(host))
  const program = ts.createProgram([...virtual.keys()], COMPILER, host)
  const checker = program.getTypeChecker()
  const out = []

  const libOwner = (symbol) => {
    if (!symbol) return undefined
    if (symbol.flags & ts.SymbolFlags.Alias) return null
    const decls = symbol.declarations ?? []
    if (!decls.length) return null
    if (!decls.every((d) => program.isSourceFileDefaultLibrary(d.getSourceFile()))) return null
    for (const d of decls) {
      if ((ts.isVariableDeclaration(d) || ts.isFunctionDeclaration(d)) && (ts.isSourceFile(d.parent) || ts.isSourceFile(d.parent?.parent?.parent))) return 'global'
    }
    const p = decls[0].parent
    return p && (ts.isInterfaceDeclaration(p) || ts.isClassDeclaration(p)) && p.name ? p.name.text : null
  }
  // globalThis has no declaration of its own; the checker gives it the global scope's symbol.
  const isGlobalObject = (node) => {
    const sym = checker.getSymbolAtLocation(node)
    return libOwner(sym) === 'global' || (node.text === 'globalThis' && sym?.escapedName === 'globalThis')
  }
  const isGlobal = (node, ...names) => ts.isIdentifier(node) && names.includes(node.text) && libOwner(checker.getSymbolAtLocation(node)) === 'global'
  // `window.setTimeout`, `self.Worker` and the bare names all count.
  const calleeName = (expr) => {
    if (ts.isIdentifier(expr)) return libOwner(checker.getSymbolAtLocation(expr)) === 'global' ? expr.text : null
    if (ts.isPropertyAccessExpression(expr)) {
      const owner = libOwner(checker.getSymbolAtLocation(expr.name))
      return owner === 'global' || owner === 'WindowOrWorkerGlobalScope' || owner === 'Window' ? expr.name.text : null
    }
    return null
  }
  const isStringy = (node) => ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)
    || !!(checker.getTypeAtLocation(node).flags & ts.TypeFlags.StringLike)
  const relativeLiteral = (node) => ts.isStringLiteralLike(node) && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(node.text)
  const isLocationType = (node) => {
    const t = checker.getTypeAtLocation(node)
    return t.symbol?.name === 'Location' && libOwner(t.symbol) !== null
  }

  for (const sf of program.getSourceFiles()) {
    const v = virtual.get(path.resolve(sf.fileName))
    if (!v) continue
    const at = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 + (v.lineOffset ?? 0)
    const flag = (node, family, what) => out.push(finding(v.report ?? v.name, at(node), family, what))

    const visit = (node) => {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || (ts.isTypeNode(node) && !ts.isExpressionWithTypeArguments(node))) return
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return

      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0]
        if (mode === 'source' || !(arg && relativeLiteral(arg) && /^\.\.?\//.test(arg.text))) flag(node, 'import', 'dynamic import()')
      }

      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const name = calleeName(node.expression)
        const arg = node.arguments?.[0]
        if ((name === 'setTimeout' || name === 'setInterval') && arg && isStringy(arg)) flag(node, 'code', `${name} with a string of code`)
        if ((name === 'Worker' || name === 'SharedWorker') && ts.isNewExpression(node)) {
          const ok = arg && ts.isNewExpression(arg) && isGlobal(arg.expression, 'URL') && arg.arguments?.length === 2
            && relativeLiteral(arg.arguments[0]) && /import\.meta\.url/.test(arg.arguments[1].getText(sf))
          if (!ok) flag(node, 'worker', `${name} from a URL`)
        }
      }

      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const left = node.left
        if (isGlobal(left, 'location')) flag(node, 'location', 'assigning location')
        else if (ts.isPropertyAccessExpression(left)) {
          const owner = libOwner(checker.getSymbolAtLocation(left.name))
          if (left.name.text === 'location' && (owner === 'Window' || owner === 'Document' || owner === 'global')) flag(node, 'location', 'assigning location')
          else if (left.name.text !== 'hash' && isLocationType(left.expression)) flag(node, 'location', `assigning location.${left.name.text}`)
        }
      }

      if (ts.isElementAccessExpression(node)) {
        const obj = unwrap(node.expression)
        if (ts.isIdentifier(obj) && GLOBAL_OBJECTS.has(obj.text) && isGlobalObject(obj)) {
          const key = node.argumentExpression
          if (!ts.isStringLiteralLike(key) && !ts.isNumericLiteral(key)) flag(node, 'code', `computed access on ${obj.text}`)
          else if (GLOBALS[key.text] || DISTINCTIVE.has(key.text)) flag(node, GLOBALS[key.text] ?? 'network', `${obj.text}['${key.text}']`)
        }
      }

      if (ts.isIdentifier(node)) checkIdentifier(node)

      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        // Text shown to people (a placeholder such as "https://example.com") is not something the app loads.
        const shown = /^(?:placeholder|title|alt|aria-[a-z-]+|label|"aria-[a-z-]+")$/i
        const label = (ts.isJsxAttribute(node.parent) || ts.isPropertyAssignment(node.parent)) && node.parent.initializer === node && shown.test(node.parent.name.getText(sf))
        if (!label && urlLiteral(node.text, allow)) flag(node, 'url', `address of another site: ${node.text.trim().slice(0, 80)}`)
      }
      ts.forEachChild(node, visit)
    }

    const checkIdentifier = (node) => {
      const name = node.text
      const parent = node.parent
      const isMember = ts.isPropertyAccessExpression(parent) && parent.name === node
      if (!isMember && !(name in GLOBALS)) return
      if (isMember && !DISTINCTIVE.has(name) && !Object.keys(MEMBERS).some((k) => k.endsWith(`.${name}`)) && !(name in GLOBALS)) return
      // Names that declare something rather than use it.
      if (!isMember && parent && (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)
        || ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isFunctionDeclaration(parent) || ts.isBindingElement(parent)
        || ts.isClassDeclaration(parent) || ts.isLabeledStatement(parent) || ts.isJsxAttribute(parent) || ts.isPropertySignature(parent)
        || ts.isGetAccessor(parent) || ts.isSetAccessor(parent) || ts.isEnumMember(parent)) && parent.name === node) return
      if (!isMember && parent && ts.isBindingElement(parent) && parent.propertyName === node) return
      const symbol = checker.getSymbolAtLocation(node)
      const owner = libOwner(symbol)
      if (owner === null) return
      if (owner === undefined) {
        // Unknown owner: a property of an `any` value, or a global the type library does not declare.
        if (isMember ? DISTINCTIVE.has(name) : name in GLOBALS) flag(node, GLOBALS[name] ?? 'network', name)
        return
      }
      const key = owner === 'global' ? name : `${owner}.${name}`
      // Comparing with top or parent (am I framed?) reads nothing from the page around the app.
      const expr = isMember ? parent : node
      if ((name === 'top' || name === 'parent') && ts.isBinaryExpression(expr.parent)
        && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(expr.parent.operatorToken.kind)) return
      if (owner === 'global' && GLOBALS[name]) {
        if (name === 'open' && !(ts.isCallExpression(parent) && parent.expression === node) && !isMember) return
        return flag(node, GLOBALS[name], name === 'open' ? 'window.open' : name)
      }
      if (MEMBERS[key]) flag(node, MEMBERS[key], LABEL[key] ?? name)
    }

    visit(sf)
  }
  return out
}

// (globalThis as any), window!, (<any>self) and parentheses all name the same object.
function unwrap(node) {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression
  return node
}

function kindOf(name) {
  if (name.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (name.endsWith('.ts') || name.endsWith('.mts') || name.endsWith('.cts')) return ts.ScriptKind.TS
  if (name.endsWith('.jsx')) return ts.ScriptKind.JSX
  return ts.ScriptKind.JS
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length

// Scans a stylesheet for addresses of other sites in url() and @import.
export function scanCss(name, text) {
  const out = []
  const re = /url\(\s*(['"]?)([^'")]*)\1\s*\)|@import\s+(['"])([^'"]*)\3/gi
  for (const m of text.matchAll(re)) {
    const target = (m[2] ?? m[4] ?? '').trim()
    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(target) && !/^data:/i.test(target)) out.push(finding(name, lineAt(text, m.index), 'url', `stylesheet loads ${target.slice(0, 80)}`))
  }
  return out
}

// Scans an HTML file. Returns { findings, scripts } where scripts are inline script bodies to scan.
export function scanHtml(name, text, { mode = 'source', allow = [] } = {}) {
  const out = []
  const scripts = []
  for (const m of text.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase()
    const attrs = Object.fromEntries([...m[2].matchAll(/([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map((a) => [a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? '']))
    const line = lineAt(text, m.index)
    for (const key of ['src', 'href', 'action', 'formaction', 'poster', 'data', 'srcset', 'background', 'xlink:href']) {
      const val = attrs[key]
      if (val !== undefined && /^\s*(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(val) && !allowedUrl(val, allow)) out.push(finding(name, line, 'url', `<${tag} ${key}> points at ${val.slice(0, 80)}`))
    }
    if (attrs.style && CSS_URL.test(attrs.style)) out.push(finding(name, line, 'url', `<${tag} style> loads another site`))
    if (mode === 'bundle') {
      const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/)
      if (tag === 'link' && rel.some((r) => ['dns-prefetch', 'preconnect', 'prerender'].includes(r))) out.push(finding(name, line, 'html', `<link rel="${attrs.rel}">`))
      if (tag === 'meta' && (attrs['http-equiv'] ?? '').toLowerCase() === 'refresh') out.push(finding(name, line, 'html', '<meta http-equiv="refresh">'))
    }
  }
  for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(m[1]) || !m[2].trim()) continue
    if (/type\s*=\s*["']?(?!module|text\/javascript)[^"'\s>]+/i.test(m[1])) continue
    scripts.push({ name: `${name}#script${scripts.length + 1}.js`, text: m[2], lineOffset: lineAt(text, m.index + m[0].indexOf('>') + 1) - 1, report: name })
  }
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const f of scanCss(name, m[1])) out.push({ ...f, line: f.line + lineAt(text, m.index) - 1 })
  }
  return { findings: out, scripts }
}
