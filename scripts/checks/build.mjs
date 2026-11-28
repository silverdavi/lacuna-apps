// Builds one app with the gate's own Vite config. The app's vite.config.ts, PostCSS config and any other
// config file in its folder are never loaded, so nothing from the pull request runs at build time.
// Usage: node scripts/checks/build.mjs <appDir> <outDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { here, root } from './lib.mjs'

export async function buildApp(appDir, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true })
  await build({
    configFile: false,
    root: appDir,
    base: './',
    logLevel: 'warn',
    clearScreen: false,
    envDir: here,
    publicDir: path.join(appDir, 'public'),
    plugins: [react()],
    css: { postcss: { plugins: [] } },
    resolve: { preserveSymlinks: false },
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: false,
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
    },
    server: { fs: { allow: [root] } },
  })
  return outDir
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [appDir, outDir] = process.argv.slice(2)
  if (!appDir || !outDir) { console.error('Usage: build.mjs <appDir> <outDir>'); process.exit(2) }
  buildApp(path.resolve(appDir), path.resolve(outDir)).then(() => console.log(`built ${outDir}`), (e) => { console.error(e.message); process.exit(1) })
}
