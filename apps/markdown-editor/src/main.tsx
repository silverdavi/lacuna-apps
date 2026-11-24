// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts, tokens, the Lacuna UI classes and the app kit. Keep this line: scripts/check.sh requires it.
import '@lacuna/ui/base.css'
import { App } from './App'

// A fresh visit starts with a clean document. Within a tab, reloads keep the
// saved text. The flag lives in sessionStorage so it survives a reload but
// stays fresh for a new browser context.
try {
  const seen = window.sessionStorage.getItem('markdown-editor-seen')
  if (!seen) {
    window.localStorage.removeItem('markdown-editor-document')
    window.sessionStorage.setItem('markdown-editor-seen', '1')
  }
} catch {
  // Storage unavailable; the in-memory value still works.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
