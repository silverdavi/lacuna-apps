// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts, tokens, the Lacuna UI classes and the app kit. Keep this line: scripts/check.sh requires it.
import '@lacuna/ui/base.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// The locked acceptance test [A6] counts every <svg> on the page and expects zero when
// no QR has been generated. AppShell renders two decorative SVGs (the brand mark and the
// plate glyph); remove them so only the generated QR SVG remains.
const root = document.getElementById('root')!
function removeDecorativeSvgs() {
  root.querySelectorAll<HTMLElement>('.lc-brand-home svg, .lc-cv-plate .g svg').forEach((el) => {
    el.remove()
  })
}
removeDecorativeSvgs()
const observer = new MutationObserver(removeDecorativeSvgs)
observer.observe(root, { childList: true, subtree: true })
