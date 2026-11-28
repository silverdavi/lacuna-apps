// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { createMockValue } from '@lacuna/host-mock'
import { createDiagramTemplate, type DiagramDoc } from '../model'

function isValidDiagram(v: unknown): v is DiagramDoc {
  if (!v || typeof v !== 'object') return false
  const d = v as Partial<DiagramDoc>
  return typeof d.title === 'string' && Array.isArray(d.nodes) && Array.isArray(d.edges)
}

export const diagramStore = createMockValue<DiagramDoc>({
  key: 'lacuna:diagram-studio:doc:v1',
  fallback: createDiagramTemplate('api'),
  validate: isValidDiagram,
})
