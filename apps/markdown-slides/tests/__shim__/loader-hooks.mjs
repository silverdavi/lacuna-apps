// Node ESM loader hook that resolves the `playwright-shim:keyboard` import
// injected by the Babel plugin (press-sequentially.cjs) to the absolute path
// of the runtime shim (keyboard-shim.js) in this directory.
//
// The hook runs in the process that compiles the test files, so it is active
// for both the config loader and the tests themselves.
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const shimFile = path.join(here, 'keyboard-shim.js')
const shimImport = "from 'playwright-shim:keyboard'"

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('playwright-shim:')) {
      return { format: 'module', source: `export * from ${JSON.stringify(shimFile)}\n` }
    }
    if (url.includes('__shim__')) return nextLoad(url, context)
    const out = nextLoad(url, context)
    if (out.source === undefined) return out
    const text = out.source instanceof Uint8Array ? Buffer.from(out.source).toString('utf8') : String(out.source)
    if (!text.includes(shimImport)) return out
    return { ...out, source: text.replaceAll(shimImport, `from '${shimFile}'`) }
  },
})
