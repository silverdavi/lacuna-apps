// node --test scripts/checks/scan-rules.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanScripts, scanCss, scanHtml } from './scan-rules.mjs'

const scan = (text, opts) => scanScripts([{ name: 'a.tsx', text }], opts).map((f) => `${f.line} ${f.family} ${f.message}`)

test('each family is found', () => {
  const found = scan([
    "fetch('/x')",
    'new XMLHttpRequest()',
    "new WebSocket('wss://x')",
    "new EventSource('/e')",
    "navigator.sendBeacon('/b', '')",
    'new RTCPeerConnection()',
    "const m = import('./m')",
    "eval('1')",
    "new Function('return 1')",
    "setTimeout('go()', 10)",
    "new Worker('https://x.example.org/w.js')",
    'document.cookie',
    "document.write('x')",
    "window.open('/x')",
    'const a = top',
    'const b = window.parent',
    "location.href = '/x'",
    "window.location = '/y'",
    "const u = 'https://example.org/a.png'",
    "globalThis['fetch']",
    "const k = 'fe'; (window as any)[k]; window[k as any]",
    "(navigator as any).sendBeacon('/b')",
    ";(globalThis as any)[k]('/x')",
  ].join('\n'))
  const lines = new Set(found.map((f) => Number(f.split(' ')[0])))
  for (let i = 1; i <= 23; i++) assert.ok(lines.has(i), `line ${i} not flagged: ${found.join(' | ')}`)
})

test('ordinary code is not flagged', () => {
  const found = scan([
    "const [open, setOpen] = useState(false); open && setOpen(false)",
    'const rect = el.getBoundingClientRect(); const y = rect.top',
    'function f(parent: Node) { return parent.firstChild }',
    "const obj = { fetch: 1, top: 2 }; obj.fetch; obj.top",
    "location.hash = '#a'",
    'setTimeout(() => {}, 10)',
    "new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })",
    "const ns = 'http://www.w3.org/2000/svg'",
    "const p = 'http://'; s.startsWith('https://')",
    "let t: WebSocket | null = null;",
    "const framed = window.self !== window.top || self != parent;",
    "<input placeholder=\"https://example.com\" />",
  ].join('\n'), { allow: ['http://www.w3.org/'] })
  assert.deepEqual(found, [])
})

test('the bundle allows relative dynamic import and allowlisted addresses', () => {
  const found = scan("import('./chunk.js'); const e = 'https://react.dev/errors/' + 1", { mode: 'bundle', allow: ['https://react.dev/errors/'] })
  assert.deepEqual(found, [])
})

test('css and html', () => {
  assert.equal(scanCss('a.css', 'a { background: url(https://x.example.org/b.png) }\n@import "//cdn.example.org/x.css";').length, 2)
  assert.equal(scanCss('a.css', 'a { background: url(./b.png) } b { background: url(data:image/png;base64,AA) }').length, 0)
  const html = '<link rel="preconnect" href="/x"><meta http-equiv="refresh" content="5"><img src="https://x.example.org/a.png"><script>fetch("/x")</script>'
  const r = scanHtml('index.html', html, { mode: 'bundle' })
  assert.equal(r.findings.length, 3)
  assert.equal(scanScripts(r.scripts).length, 1)
  assert.equal(scanHtml('index.html', html, { mode: 'source' }).findings.length, 1)
})
