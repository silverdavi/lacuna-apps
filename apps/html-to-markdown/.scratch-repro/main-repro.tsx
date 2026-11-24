import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@lacuna/ui/base.css'
import { CodeArea } from '@lacuna/code-area'

function Repro() {
  return (
    <div>
      <h1 style={{ fontSize: 14 }}>CodeArea repro</h1>
      <CodeArea label="Out" value="- One\n- Two" language="md" readOnly />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Repro />
  </StrictMode>,
)
