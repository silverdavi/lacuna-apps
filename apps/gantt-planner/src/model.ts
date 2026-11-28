// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
export interface GanttTask {
  id: string
  name: string
  phase: string
  assignee: string
  /** Days from project start (or explicit override if no predecessors). */
  startOffset: number
  /** Duration in days; 0 indicates a milestone. */
  duration: number
  /** 0..100 */
  progress: number
  /** Task IDs that must finish before this task starts (Finish-to-Start). */
  dependencies: string[]
}

export interface GanttProject {
  title: string
  startDate: string // YYYY-MM-DD
  tasks: GanttTask[]
}

export type ZoomLevel = 'Day' | 'Week' | 'Month'
export type ProjectTemplateId = 'launch' | 'release' | 'move'

export const PROJECT_TEMPLATES: { id: ProjectTemplateId; label: string }[] = [
  { id: 'launch', label: 'Product Launch' },
  { id: 'release', label: 'Software Release' },
  { id: 'move', label: 'Office Move' },
]

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10))
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1))
}

export function addDaysIso(iso: string, days: number): string {
  const dt = parseIsoDate(iso)
  dt.setUTCDate(dt.getUTCDate() + Math.round(days))
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatShortDate(iso: string): string {
  const dt = parseIsoDate(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[dt.getUTCMonth()]} ${dt.getUTCDate()}`
}

export function createProjectTemplate(id: ProjectTemplateId): GanttProject {
  if (id === 'release') {
    return {
      title: 'v2.4 Software Release',
      startDate: '2026-12-01',
      tasks: [
        { id: 'T1', name: 'Freeze feature scope', phase: 'Planning', assignee: 'Elena', startOffset: 0, duration: 2, progress: 100, dependencies: [] },
        { id: 'T2', name: 'Core API migration', phase: 'Engineering', assignee: 'Marcus', startOffset: 2, duration: 6, progress: 80, dependencies: ['T1'] },
        { id: 'T3', name: 'UI accessibility pass', phase: 'Engineering', assignee: 'Priya', startOffset: 2, duration: 4, progress: 90, dependencies: ['T1'] },
        { id: 'T4', name: 'Integration test suite', phase: 'QA', assignee: 'Devon', startOffset: 8, duration: 4, progress: 40, dependencies: ['T2', 'T3'] },
        { id: 'T5', name: 'Security review', phase: 'QA', assignee: 'Elena', startOffset: 8, duration: 3, progress: 20, dependencies: ['T2'] },
        { id: 'T6', name: 'Release notes & docs', phase: 'Launch', assignee: 'Priya', startOffset: 6, duration: 3, progress: 50, dependencies: ['T3'] },
        { id: 'T7', name: 'Production deploy', phase: 'Launch', assignee: 'Marcus', startOffset: 12, duration: 0, progress: 0, dependencies: ['T4', 'T5', 'T6'] },
      ],
    }
  }

  if (id === 'move') {
    return {
      title: 'Studio Office Move',
      startDate: '2026-12-01',
      tasks: [
        { id: 'T1', name: 'Sign lease & floorplan', phase: 'Prep', assignee: 'Nora', startOffset: 0, duration: 3, progress: 100, dependencies: [] },
        { id: 'T2', name: 'Fiber & network install', phase: 'Facilities', assignee: 'Sam', startOffset: 3, duration: 5, progress: 60, dependencies: ['T1'] },
        { id: 'T3', name: 'Furniture delivery', phase: 'Facilities', assignee: 'Nora', startOffset: 3, duration: 4, progress: 75, dependencies: ['T1'] },
        { id: 'T4', name: 'Workstation setup', phase: 'IT', assignee: 'Sam', startOffset: 8, duration: 3, progress: 10, dependencies: ['T2', 'T3'] },
        { id: 'T5', name: 'Team move-in day', phase: 'Launch', assignee: 'Nora', startOffset: 11, duration: 0, progress: 0, dependencies: ['T4'] },
      ],
    }
  }

  return {
    title: 'Q1 Product Launch',
    startDate: '2026-12-01',
    tasks: [
      { id: 'T1', name: 'Market & pricing brief', phase: 'Discovery', assignee: 'Maya', startOffset: 0, duration: 4, progress: 100, dependencies: [] },
      { id: 'T2', name: 'Design system & copy', phase: 'Design', assignee: 'Liam', startOffset: 4, duration: 5, progress: 85, dependencies: ['T1'] },
      { id: 'T3', name: 'Build landing & checkout', phase: 'Engineering', assignee: 'Aria', startOffset: 9, duration: 6, progress: 50, dependencies: ['T2'] },
      { id: 'T4', name: 'Partner beta program', phase: 'Go-to-Market', assignee: 'Maya', startOffset: 4, duration: 7, progress: 60, dependencies: ['T1'] },
      { id: 'T5', name: 'QA & load verification', phase: 'Engineering', assignee: 'Devon', startOffset: 15, duration: 3, progress: 15, dependencies: ['T3'] },
      { id: 'T6', name: 'Press kit & launch email', phase: 'Go-to-Market', assignee: 'Liam', startOffset: 11, duration: 4, progress: 30, dependencies: ['T4'] },
      { id: 'T7', name: 'Public launch milestone', phase: 'Launch', assignee: 'Maya', startOffset: 18, duration: 0, progress: 0, dependencies: ['T5', 'T6'] },
    ],
  }
}
