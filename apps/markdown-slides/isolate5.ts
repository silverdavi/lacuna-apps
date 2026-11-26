import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const shimDir = path.join(here, 'tests', '__shim__')
const shimFile = path.join(shimDir, 'keyboard-shim.js')
const shimFileUrl = pathToFileURL(shimFile).href
const shimSource = readFileSync(shimFile, 'utf8')
const shimImport = "from 'playwright-shim:keyboard'"

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('playwright-shim:')) {
      return { format: 'module', source: shimSource, shortCircuit: true }
    }
    if (url.includes('__shim__')) return nextLoad(url, context)
    const out = nextLoad(url, context)
    if (out.source === undefined) return out
    const text = out.source instanceof Uint8Array ? Buffer.from(out.source).toString('utf8') : String(out.source)
    if (!text.includes(shimImport)) return out
    return { ...out, source: text.replaceAll(shimImport, `from '${shimFileUrl}'`), shortCircuit: true }
  },
})

export default (async () => {
  const root = await import('../../playwright.config.ts')
  return { ...(typeof root.default === 'object' && root.default !== null ? root.default : {}) }
})()
