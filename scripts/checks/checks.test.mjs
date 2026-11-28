// node --test scripts/checks/checks.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packageKeys, addedPackages } from './lockfile.mjs'
import { signoffs } from './dco.mjs'
import { appTreeProblems } from './scope.mjs'
import { summary } from './run.mjs'

test('lockfile package keys, versions 6 and 9', () => {
  const v6 = "lockfileVersion: '6.0'\n\nimporters:\n\n  .:\n    dependencies: {}\n\npackages:\n\n  /react@19.3.1:\n    resolution: {integrity: x}\n\n  /@types/react@19.3.0:\n    dev: true\n"
  assert.deepEqual([...packageKeys(v6)], ['/react@19.3.1', '/@types/react@19.3.0'])
  const v9 = "lockfileVersion: '9.0'\n\npackages:\n\n  '@types/react@19.3.0':\n    resolution: {integrity: x}\n\n  react@19.3.1:\n    resolution: {integrity: y}\n\nsnapshots:\n\n  react@19.3.1: {}\n"
  assert.deepEqual([...packageKeys(v9)], ['@types/react@19.3.0', 'react@19.3.1'])
  assert.deepEqual(addedPackages(v6, v6.replace('packages:\n', 'packages:\n\n  /left-pad@1.3.0:\n    dev: false\n')), ['/left-pad@1.3.0'])
})

test('sign-off lines', () => {
  assert.deepEqual(signoffs('Add app\n\nSigned-off-by: Octo Maker <octo@users.noreply.github.com>\n'), [{ name: 'Octo Maker', email: 'octo@users.noreply.github.com' }])
  assert.deepEqual(signoffs('Add app\n\nsigned off by me'), [])
})

test('app trees with links, submodules or installed packages are refused', () => {
  const p = appTreeProblems([
    { mode: '100644', path: 'apps/a/src/main.tsx' },
    { mode: '120000', path: 'apps/a/src/link' },
    { mode: '160000', path: 'apps/a/vendor' },
    { mode: '100644', path: 'apps/a/node_modules/vite/index.js' },
    { mode: '100644', path: 'apps/a/.npmrc' },
  ])
  assert.deepEqual(p.map((x) => x.file), ['apps/a/src/link', 'apps/a/vendor', 'apps/a/node_modules/vite/index.js', 'apps/a/.npmrc'])
})

test('the summary escapes what the pull request controls', () => {
  const md = summary({ ok: false, slug: 'x', newApp: true, author: '<img src=x>', checks: [{ id: 'manifest', status: 'fail', blocking: true, rules: ['E1'], findings: [{ message: '| [link](javascript:x) `code`', fix: '**bold**' }] }] })
  assert.ok(!md.includes('<img'))
  assert.ok(!md.includes('[link]('))
  assert.ok(md.includes('\\*\\*bold\\*\\*'))
})
