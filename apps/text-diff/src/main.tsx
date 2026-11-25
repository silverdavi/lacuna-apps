// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts, tokens, the Lacuna UI classes and the app kit. Keep this line: scripts/check.sh requires it.
import '@lacuna/ui/base.css'
import { App } from './App'

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === 3 && node.parentElement?.tagName === 'TEXTAREA') {
        node.parentElement.removeChild(node)
      }
    }
  }
})
observer.observe(document.body, { childList: true, subtree: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
