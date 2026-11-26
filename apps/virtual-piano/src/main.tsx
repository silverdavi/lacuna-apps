// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts, tokens, the Lacuna UI classes and the app kit. Keep this line: scripts/check.sh requires it.
import '@lacuna/ui/base.css'
import { App } from './App'
import { attachKeydown } from './keys'

attachKeydown()

const appCss = `
.vk-keys { display: flex; flex-wrap: wrap; gap: calc(8px * var(--sf)); padding: calc(8px * var(--sf)); border: calc(1px * var(--sf)) solid var(--ui-line2); background: var(--paper-deep); }
.vk-key { flex: 1 1 calc(88px * var(--sf)); min-height: calc(52px * var(--sf)); display: inline-flex; flex-direction: column; align-items: center; gap: calc(2px * var(--sf)); }
.vk-key-hint { font-family: var(--mono); font-size: calc(10px * var(--tf)); color: var(--ink-60); }
.vk-summary { margin: 0; padding: calc(8px * var(--sf)) 0 0; font-family: var(--mono); font-size: calc(13px * var(--tf)); color: var(--ink); }
.vk-metronome { display: flex; flex-wrap: wrap; align-items: center; gap: calc(8px * var(--sf)); }
.vk-tempo { display: inline-flex; align-items: center; gap: calc(8px * var(--sf)); }
.vk-bpm { font-family: var(--mono); font-size: calc(13px * var(--tf)); color: var(--ink); }
.vk-tabs .lc-tab { color: var(--ink); }
`

const styleEl = document.createElement('style')
styleEl.textContent = appCss
document.head.appendChild(styleEl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
