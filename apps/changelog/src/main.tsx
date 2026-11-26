// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts, tokens, the Lacuna UI classes and the app kit. Keep this line: scripts/check.sh requires it.
import '@lacuna/ui/base.css'
import './app.css'
import { App } from './App'

// The page's inline bootstrap reads this flag to decide whether the host has
// already drawn the desk header. Standalone it is false (the app shows its own
// h1); when the launcher loads this page in an iframe it is true.
;(window as unknown as Record<string, unknown>)['__lacunaIsEmbedded'] = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
