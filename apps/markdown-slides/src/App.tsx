// Test: CodeArea with demo slide text directly
import { AppShell, Button } from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { useState } from 'react'

export function App() {
  const [text, setText] = useState('# Welcome\n\nThis is a test text.')

  return (
    <AppShell
      name="Test"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta="test"
      actions={
        <>
          <Button kind="secondary" ariaLabel="Copy">Copy</Button>
        </>
      }
    >
      <CodeArea value={text} onChange={setText} language="md" ariaLabel="Slide deck editor" tabSize={2} />
    </AppShell>
  )
}
