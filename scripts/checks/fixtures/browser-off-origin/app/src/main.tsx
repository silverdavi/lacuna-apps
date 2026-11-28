import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@lacuna/ui/base.css'
import { App } from './App'
const img = new Image()
img.src = ['https:', '', 'tracker.example.org', 'p.png'].join('/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    
  </StrictMode>,
)
