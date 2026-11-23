// Test which module crashes
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@lacuna/ui'

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <div>
      <h1>Module Test</h1>
      <button>Click</button>
    </div>
  </StrictMode>
)
