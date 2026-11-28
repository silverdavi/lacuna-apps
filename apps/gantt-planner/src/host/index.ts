// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { createMockValue } from '@lacuna/host-mock'
import { createProjectTemplate, type GanttProject } from '../model'

function isValidProject(v: unknown): v is GanttProject {
  if (!v || typeof v !== 'object') return false
  const p = v as Partial<GanttProject>
  return (
    typeof p.title === 'string' &&
    typeof p.startDate === 'string' &&
    Array.isArray(p.tasks)
  )
}

export const projectStore = createMockValue<GanttProject>({
  key: 'lacuna:gantt-planner:project:v1',
  fallback: createProjectTemplate('launch'),
  validate: isValidProject,
})
