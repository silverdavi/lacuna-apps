// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/gantt-bars 0.1.0: snapshot of lacuna-components GanttBars at 02e5289 by sync-toolbox-components.py; a change gets a new version.
export interface GanttBar {
  id: string;
  label: string;
  start: string; // ISO date 'YYYY-MM-DD'
  end: string;   // ISO date 'YYYY-MM-DD'
  dependsOn?: string[]; // ids of bars this bar depends on
}

export interface GanttBarsProps {
  bars: GanttBar[];
  onBarsChange: (bars: GanttBar[]) => void;
  width?: number;
  height?: number;
  dayWidth?: number; // pixels per day in the timeline
  onDragStart?: () => void;
  onDragEnd?: () => void;
  ariaLabel?: string; // accessible name for the container, defaults to "Gantt timeline"
}

export { GanttBars } from './GanttBars';
