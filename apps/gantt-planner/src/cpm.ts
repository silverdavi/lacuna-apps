// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { addDaysIso, type GanttProject, type GanttTask } from './model'

export interface ScheduledTask {
  task: GanttTask
  earlyStart: number
  earlyFinish: number
  lateStart: number
  lateFinish: number
  slack: number
  isCritical: boolean
  startDate: string
  endDate: string
}

export interface ResourceLoad {
  assignee: string
  taskCount: number
  totalDays: number
  avgProgress: number
}

export interface ScheduleResult {
  scheduled: ScheduledTask[]
  byId: Map<string, ScheduledTask>
  projectDuration: number
  projectEndDate: string
  criticalCount: number
  milestoneCount: number
  weightedProgress: number
  hasCycle: boolean
  resources: ResourceLoad[]
}

export function computeSchedule(project: GanttProject): ScheduleResult {
  const taskMap = new Map<string, GanttTask>()
  for (const t of project.tasks) taskMap.set(t.id, t)

  // Kahn's topological sort
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()
  for (const t of project.tasks) {
    inDegree.set(t.id, 0)
    dependents.set(t.id, [])
  }
  for (const t of project.tasks) {
    for (const dep of t.dependencies) {
      if (!taskMap.has(dep) || dep === t.id) continue
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)
      dependents.get(dep)!.push(t.id)
    }
  }

  const queue: string[] = []
  for (const t of project.tasks) {
    if ((inDegree.get(t.id) ?? 0) === 0) queue.push(t.id)
  }

  const topo: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    topo.push(id)
    for (const next of dependents.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(next)
    }
  }

  const hasCycle = topo.length < project.tasks.length
  const orderedIds = hasCycle ? project.tasks.map((t) => t.id) : topo

  // Forward pass
  const es = new Map<string, number>()
  const ef = new Map<string, number>()
  for (const id of orderedIds) {
    const t = taskMap.get(id)!
    const validDeps = t.dependencies.filter((d) => taskMap.has(d) && d !== t.id)
    let start = Math.max(0, t.startOffset)
    if (validDeps.length > 0 && !hasCycle) {
      const maxPredFinish = Math.max(...validDeps.map((d) => ef.get(d) ?? 0))
      start = Math.max(start, maxPredFinish)
    }
    const dur = Math.max(0, t.duration)
    es.set(id, start)
    ef.set(id, start + dur)
  }

  const projectDuration = project.tasks.reduce((m, t) => Math.max(m, ef.get(t.id) ?? 0), 0)

  // Backward pass
  const ls = new Map<string, number>()
  const lf = new Map<string, number>()
  for (let i = orderedIds.length - 1; i >= 0; i--) {
    const id = orderedIds[i]
    const t = taskMap.get(id)!
    const outs = (dependents.get(id) ?? []).filter((o) => ls.has(o))
    const finish = outs.length > 0 && !hasCycle
      ? Math.min(...outs.map((o) => ls.get(o)!))
      : projectDuration
    const dur = Math.max(0, t.duration)
    lf.set(id, finish)
    ls.set(id, finish - dur)
  }

  const byId = new Map<string, ScheduledTask>()
  const scheduled: ScheduledTask[] = project.tasks.map((task) => {
    const earlyStart = es.get(task.id) ?? 0
    const earlyFinish = ef.get(task.id) ?? 0
    const lateStart = ls.get(task.id) ?? earlyStart
    const lateFinish = lf.get(task.id) ?? earlyFinish
    const slack = Math.max(0, lateStart - earlyStart)
    const isCritical = !hasCycle && slack === 0
    const item: ScheduledTask = {
      task,
      earlyStart,
      earlyFinish,
      lateStart,
      lateFinish,
      slack,
      isCritical,
      startDate: addDaysIso(project.startDate, earlyStart),
      endDate: addDaysIso(project.startDate, earlyFinish),
    }
    byId.set(task.id, item)
    return item
  })

  // Weighted progress
  let totalWeight = 0
  let doneWeight = 0
  let criticalCount = 0
  let milestoneCount = 0
  for (const s of scheduled) {
    if (s.isCritical) criticalCount++
    if (s.task.duration === 0) milestoneCount++
    const w = Math.max(1, s.task.duration)
    totalWeight += w
    doneWeight += w * (s.task.progress / 100)
  }
  const weightedProgress = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0

  // Resource workload
  const resMap = new Map<string, { tasks: number; days: number; progSum: number }>()
  for (const t of project.tasks) {
    const key = t.assignee.trim() || 'Unassigned'
    const cur = resMap.get(key) ?? { tasks: 0, days: 0, progSum: 0 }
    cur.tasks += 1
    cur.days += Math.max(0, t.duration)
    cur.progSum += t.progress
    resMap.set(key, cur)
  }
  const resources: ResourceLoad[] = [...resMap.entries()]
    .map(([assignee, info]) => ({
      assignee,
      taskCount: info.tasks,
      totalDays: info.days,
      avgProgress: Math.round(info.progSum / info.tasks),
    }))
    .sort((a, b) => b.totalDays - a.totalDays)

  return {
    scheduled,
    byId,
    projectDuration,
    projectEndDate: addDaysIso(project.startDate, projectDuration),
    criticalCount,
    milestoneCount,
    weightedProgress,
    hasCycle,
    resources,
  }
}
