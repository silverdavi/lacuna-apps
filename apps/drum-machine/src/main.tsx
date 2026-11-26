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
  </StrictMode>,
)

// --- app-local styles (no color literals; kit tokens only) ---
const style = document.createElement('style')
style.textContent = `
.dm-grid { display: grid; grid-template-columns: auto repeat(16, minmax(calc(14px * var(--sf)), 1fr)); gap: calc(2px * var(--sf)); padding: calc(8px * var(--sf)); }
.dm-row { display: contents; }
.dm-head { }
.dm-label, .dm-colhead { display: flex; align-items: center; justify-content: center; font-size: calc(10px * var(--sf)); line-height: 1.2; color: var(--ink-60); padding: calc(2px * var(--sf)); }
.dm-label { justify-content: flex-start; text-transform: uppercase; letter-spacing: 0.08em; font-family: var(--mono); }
.dm-cell { appearance: none; border: calc(1px * var(--sf)) solid var(--ui-line2); background: var(--paper-deep); color: var(--ink-60); min-width: calc(14px * var(--sf)); min-height: calc(14px * var(--sf)); display: inline-flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: calc(10px * var(--sf)); cursor: pointer; }
.dm-cell.on { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.dm-cell.now { outline: calc(2px * var(--sf)) solid var(--ink); }
.dm-actions { display: flex; gap: calc(8px * var(--sf)); padding: calc(8px * var(--sf)); flex-wrap: wrap; }
.dm-readout { font-family: var(--mono); font-size: calc(11px * var(--sf)); color: var(--ink-60); padding: calc(6px * var(--sf)); }
.dm-tempo-readout { padding-top: 0; }
.dm-tracks { display: flex; flex-direction: column; gap: calc(6px * var(--sf)); padding: calc(8px * var(--sf)); }
.dm-track-row { display: grid; grid-template-columns: calc(64px * var(--sf)) auto 1fr auto; gap: calc(10px * var(--sf)); align-items: center; }
.dm-track-label { font-family: var(--mono); font-size: calc(11px * var(--sf)); color: var(--ink-80); text-transform: uppercase; letter-spacing: 0.06em; }
.dm-track-hits { font-family: var(--mono); font-size: calc(11px * var(--sf)); color: var(--ink-60); }
.dm-track-seq { font-family: var(--mono); font-size: calc(11px * var(--sf)); color: var(--ink-60); letter-spacing: 0.1em; }
.dm-tempo { display: flex; gap: calc(12px * var(--sf)); padding: calc(8px * var(--sf)); flex-wrap: wrap; align-items: flex-start; }
.dm-field { flex: 0 0 calc(160px * var(--sf)); display: flex; flex-direction: column; gap: calc(4px * var(--sf)); }
.dm-field .lc-field-label { font-size: calc(11px * var(--sf)); color: var(--ink-60); text-transform: uppercase; letter-spacing: 0.06em; }
.dm-tempo-nudges { display: flex; gap: calc(6px * var(--sf)); }
.dm-history-actions { display: flex; gap: calc(4px * var(--sf)); }
.lk-shell .lk-main { display: flex; flex-direction: column; gap: calc(12px * var(--sf)); }
`
document.head.appendChild(style)
