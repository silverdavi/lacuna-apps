import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@lacuna/ui/base.css'
import { App } from './App'
import { Extra } from './Extra'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Extra />
  </StrictMode>,
)
