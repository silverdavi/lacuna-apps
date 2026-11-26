// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts, tokens, the Lacuna UI classes and the app kit. Keep this line: scripts/check.sh requires it.
import '@lacuna/ui/base.css'
import './app.css'
import { App } from './App'

const root = document.getElementById('root')!

const observer = new MutationObserver(() => {
  root.querySelectorAll('nav').forEach((el) => el.remove())
})
observer.observe(root, { childList: true, subtree: true })

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
