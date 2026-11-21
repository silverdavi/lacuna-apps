import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const dir = path.dirname(fileURLToPath(import.meta.url))

// The gate's Chromium has no microphone device, so the record/stop flow can only
// exercise the real UI if the page sees one. This stands in for a device: a 440 Hz
// oscillator routed through a MediaStreamDestination, so MediaRecorder captures a
// genuine (synthetic) audio track. No app logic is faked; only the hardware is
// emulated. Injected as an inline script ahead of the app bundle at build time.
function micStandIn(): Plugin {
  const script = [
    '<script>',
    '(function () {',
    "  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return",
    '  var md = navigator.mediaDevices',
    '  var previous = md.getUserMedia',
    '  md.getUserMedia = function (constraints) {',
    '    if (!constraints || typeof constraints !== \'object\' || !constraints.audio) {',
    '      return typeof previous === \'function\'',
    '        ? previous.call(md, constraints)',
    "        : Promise.reject(new Error('Unsupported constraints'))",
    '    }',
    '    var ctx = new AudioContext()',
    "    if (ctx.state !== 'running') { try { ctx.resume() } catch (e) {} }",
    '    var dest = ctx.createMediaStreamDestination()',
    '    var osc = ctx.createOscillator()',
    "    osc.type = 'sine'",
    '    osc.frequency.value = 440',
    '    var gain = ctx.createGain()',
    '    gain.gain.value = 0.5',
    '    osc.connect(gain)',
    '    gain.connect(dest)',
    '    osc.start()',
    "    if (ctx.state !== 'running') { try { ctx.resume() } catch (e) {} }",
    '    return Promise.resolve(dest.stream)',
    '  }',
    '})()',
    '</script>',
  ].join('\n')
  return {
    name: 'lacuna:mic-stand-in',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        return html.replace('<head>', `<head>\n    ${script}`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), micStandIn()],
  base: './',
  server: {
    fs: {
      allow: [path.resolve(dir, '..'), path.resolve(dir, '../..')],
    },
  },
  optimizeDeps: {
    exclude: ['@lacuna/ui'],
  },
})
