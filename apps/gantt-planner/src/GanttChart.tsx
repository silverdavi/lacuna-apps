// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { addDaysIso, formatShortDate, type ZoomLevel } from './model'
import type { ScheduledTask } from './cpm'

interface GanttChartProps {
  startDate: string
  tasks: ScheduledTask[]
  projectDuration: number
  zoom: ZoomLevel
  selectedId: string | null
  onSelect: (id: string) => void
}

const ROW_H = 38
const HEADER_H = 36
const LABEL_W = 190
const BAR_H = 22
const BAR_Y_OFF = (ROW_H - BAR_H) / 2

function pxPerDay(zoom: ZoomLevel): number {
  if (zoom === 'Day') return 36
  if (zoom === 'Week') return 22
  return 12
}

export function GanttChart({
  startDate,
  tasks,
  projectDuration,
  zoom,
  selectedId,
  onSelect,
}: GanttChartProps) {
  const dayW = pxPerDay(zoom)
  const totalDays = Math.max(projectDuration + 4, 14)
  const chartW = LABEL_W + totalDays * dayW + 32
  const chartH = HEADER_H + Math.max(tasks.length, 1) * ROW_H + 16

  const rowIndexById = new Map<string, number>()
  tasks.forEach((s, i) => rowIndexById.set(s.task.id, i))

  const tickStep = zoom === 'Day' ? 1 : zoom === 'Week' ? 3 : 7
  const ticks: number[] = []
  for (let d = 0; d <= totalDays; d += tickStep) ticks.push(d)

  return (
    <div className="gp-chart-scroll">
      <svg
        className="gp-svg"
        width={chartW}
        height={chartH}
        viewBox={`0 0 ${chartW} ${chartH}`}
        role="img"
        aria-label={`Project Gantt timeline with ${tasks.length} tasks`}
      >
        <defs>
          <marker
            id="gp-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,1 L7,4 L0,7 Z" className="gp-arrow-head" />
          </marker>
        </defs>

        {/* Header background */}
        <rect x={0} y={0} width={chartW} height={HEADER_H} className="gp-header-bg" />
        <line x1={0} y1={HEADER_H} x2={chartW} y2={HEADER_H} className="gp-grid-strong" />
        <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={chartH} className="gp-grid-strong" />

        <text x={12} y={23} className="gp-header-text">TASK</text>

        {/* Vertical date grid & ticks */}
        {ticks.map((d) => {
          const x = LABEL_W + d * dayW
          return (
            <g key={d}>
              <line x1={x} y1={HEADER_H} x2={x} y2={chartH} className="gp-grid-line" />
              <text x={x + 4} y={23} className="gp-header-text">
                {formatShortDate(addDaysIso(startDate, d))}
              </text>
            </g>
          )
        })}

        {/* Row stripes and labels */}
        {tasks.map((item, idx) => {
          const y = HEADER_H + idx * ROW_H
          const isSelected = item.task.id === selectedId
          return (
            <g key={item.task.id}>
              <rect
                x={0}
                y={y}
                width={chartW}
                height={ROW_H}
                className={isSelected ? 'gp-row-selected' : idx % 2 === 1 ? 'gp-row-alt' : 'gp-row-bg'}
              />
              <line x1={0} y1={y + ROW_H} x2={chartW} y2={y + ROW_H} className="gp-grid-line" />
              <text
                x={12}
                y={y + ROW_H / 2 + 4}
                className={`gp-row-label${item.isCritical ? ' critical' : ''}`}
              >
                {item.task.id} · {item.task.name.length > 20 ? `${item.task.name.slice(0, 19)}…` : item.task.name}
              </text>
            </g>
          )
        })}

        {/* Dependency arrows */}
        {tasks.map((item, toIdx) => {
          const toX = LABEL_W + item.earlyStart * dayW
          const toY = HEADER_H + toIdx * ROW_H + ROW_H / 2
          return item.task.dependencies.map((depId) => {
            const fromIdx = rowIndexById.get(depId)
            if (fromIdx === undefined) return null
            const fromItem = tasks[fromIdx]
            const fromX = LABEL_W + fromItem.earlyFinish * dayW
            const fromY = HEADER_H + fromIdx * ROW_H + ROW_H / 2
            const midX = Math.max(fromX + 10, toX - 10)
            const dPath =
              toX >= fromX + 8
                ? `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX - 2} ${toY}`
                : `M ${fromX} ${fromY} L ${fromX + 10} ${fromY} L ${fromX + 10} ${(fromY + toY) / 2} L ${toX - 10} ${(fromY + toY) / 2} L ${toX - 10} ${toY} L ${toX - 2} ${toY}`
            return (
              <path
                key={`${depId}->${item.task.id}`}
                d={dPath}
                className={`gp-dep-path${item.isCritical && fromItem.isCritical ? ' critical' : ''}`}
                markerEnd="url(#gp-arrow)"
              />
            )
          })
        })}

        {/* Task bars & milestones */}
        {tasks.map((item, idx) => {
          const y = HEADER_H + idx * ROW_H + BAR_Y_OFF
          const x = LABEL_W + item.earlyStart * dayW
          const isMilestone = item.task.duration === 0
          const isSelected = item.task.id === selectedId

          if (isMilestone) {
            const cy = HEADER_H + idx * ROW_H + ROW_H / 2
            const r = 8
            return (
              <g
                key={item.task.id}
                className="gp-bar-group"
                onClick={() => onSelect(item.task.id)}
              >
                <polygon
                  points={`${x},${cy - r} ${x + r},${cy} ${x},${cy + r} ${x - r},${cy}`}
                  className={`gp-milestone${item.isCritical ? ' critical' : ''}${isSelected ? ' selected' : ''}`}
                />
                <text x={x + 14} y={cy + 4} className="gp-bar-meta">
                  {formatShortDate(item.startDate)}
                </text>
              </g>
            )
          }

          const w = Math.max(item.task.duration * dayW, 18)
          const progW = Math.round((w * Math.min(100, Math.max(0, item.task.progress))) / 100)

          return (
            <g
              key={item.task.id}
              className="gp-bar-group"
              onClick={() => onSelect(item.task.id)}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={BAR_H}
                rx={2}
                className={`gp-bar${item.isCritical ? ' critical' : ''}${isSelected ? ' selected' : ''}`}
              />
              {progW > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={progW}
                  height={BAR_H}
                  rx={2}
                  className={`gp-bar-prog${item.isCritical ? ' critical' : ''}`}
                />
              )}
              <text x={x + w + 6} y={y + BAR_H / 2 + 4} className="gp-bar-meta">
                {item.task.assignee} · {item.task.progress}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
