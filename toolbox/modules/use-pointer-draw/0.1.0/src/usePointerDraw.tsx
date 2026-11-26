// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-pointer-draw 0.1.0: snapshot of lacuna-components usePointerDraw at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import type * as React from 'react';

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface PointerDrawOptions {
  /** Base stroke width in CSS px. Default 2. */
  strokeWidth?: number;
  /** Smoothing factor 0–1 (0 = raw, 1 = max smoothing). Default 0.5. */
  smoothing?: number;
  /** Minimum distance between recorded points, in CSS px. Default 2. */
  minDistance?: number;
  /** Zoom limits. Default { min: 0.1, max: 10 }. */
  zoomLimits?: { min: number; max: number };
  /** Called on every new stroke point (for live rendering). */
  onPoint?: (point: Point, stroke: Stroke) => void;
  /** Called when a stroke is completed. */
  onStrokeEnd?: (stroke: Stroke) => void;
  /** Called when the transform changes (pan or zoom). */
  onTransform?: (t: Transform) => void;
}

export interface SurfaceProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  style: CSSProperties;
}

export interface PointerDrawReturn {
  /** Attach to the drawing surface element. */
  surfaceProps: SurfaceProps;
  /** Current transform (pan offset + zoom scale). */
  transform: Transform;
  /** All completed strokes. */
  strokes: Stroke[];
  /** The stroke currently being drawn, or null. */
  activeStroke: Stroke | null;
  /** True while a pointer is down and drawing. */
  isDrawing: boolean;
  /** Clear all strokes. */
  clear: () => void;
  /** Reset transform to identity. */
  resetTransform: () => void;
  /** Set the current stroke color (applies to next stroke). */
  setColor: (color: string) => void;
  /** Set the current stroke width (applies to next stroke). */
  setWidth: (width: number) => void;
}

const IDENTITY: Transform = { x: 0, y: 0, scale: 1 };

interface PendingPoint {
  x: number;
  y: number;
  pressure: number;
}

function clampScale(scale: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, scale));
}

function logical(
  clientX: number,
  clientY: number,
  baseX: number,
  baseY: number,
  t: Transform,
): { x: number; y: number } {
  return {
    x: (clientX - baseX - t.x) / t.scale,
    y: (clientY - baseY - t.y) / t.scale,
  };
}

function smoothPoints(raw: Point[], s: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i]!;
    const prev = out[out.length - 1];
    out.push(
      i === 0 || !prev
        ? p
        : {
            x: (1 - s) * p.x + s * prev.x,
            y: (1 - s) * p.y + s * prev.y,
            pressure: (1 - s) * p.pressure + s * prev.pressure,
          },
    );
  }
  return out;
}

export function usePointerDraw(options?: PointerDrawOptions): PointerDrawReturn {
  const strokeWidth = options?.strokeWidth ?? 2;
  const minDistance = options?.minDistance ?? 2;
  const zoomMin = options?.zoomLimits?.min ?? 0.1;
  const zoomMax = options?.zoomLimits?.max ?? 10;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);

  const colorRef = useRef('var(--ink)');
  const widthRef = useRef(strokeWidth);
  const drawingRef = useRef(false);
  const pointsRef = useRef<PendingPoint[]>([]);
  const lastRef = useRef<PendingPoint | null>(null);
  const transformRef = useRef<Transform>(IDENTITY);
  const baseRef = useRef({ x: 0, y: 0 });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const commitTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    setTransform(next);
    optionsRef.current?.onTransform?.(next);
  }, []);

  const beginStroke = useCallback((e: React.PointerEvent) => {
    if (drawingRef.current) return;
    drawingRef.current = true;
    try {
      (e.currentTarget as Element | undefined)?.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; drawing works without it.
    }
    const t = transformRef.current;
    const base = baseRef.current;
    const pt = logical(e.clientX, e.clientY, base.x, base.y, t);
    const point: Point = { x: pt.x, y: pt.y, pressure: e.pressure };
    lastRef.current = { x: e.clientX, y: e.clientY, pressure: e.pressure };
    pointsRef.current = [
      { x: e.clientX, y: e.clientY, pressure: e.pressure },
    ];
    const stroke: Stroke = {
      points: [point],
      color: colorRef.current,
      width: widthRef.current,
    };
    optionsRef.current?.onPoint?.(point, stroke);
    setActiveStroke(stroke);
  }, []);

  const moveStroke = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const last = lastRef.current;
    if (!last) return;
    const pending: PendingPoint = {
      x: e.clientX,
      y: e.clientY,
      pressure: e.pressure,
    };
    const dist = Math.hypot(pending.x - last.x, pending.y - last.y);
    if (dist < minDistance) return;
    lastRef.current = pending;
    pointsRef.current = [...pointsRef.current, pending];
    const t = transformRef.current;
    const base = baseRef.current;
    const pt = logical(pending.x, pending.y, base.x, base.y, t);
    const point: Point = { x: pt.x, y: pt.y, pressure: pending.pressure };
    setActiveStroke((prev) => {
      if (!prev) return prev;
      const s = optionsRef.current?.smoothing ?? 0.5;
      const prevPoint = prev.points[prev.points.length - 1];
      const p: Point = prevPoint
        ? {
            x: (1 - s) * point.x + s * prevPoint.x,
            y: (1 - s) * point.y + s * prevPoint.y,
            pressure: (1 - s) * point.pressure + s * prevPoint.pressure,
          }
        : point;
      const next = { ...prev, points: [...prev.points, p] };
      optionsRef.current?.onPoint?.(p, next);
      return next;
    });
  }, [minDistance]);

  const endStroke = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      (e.currentTarget as Element | undefined)?.releasePointerCapture(e.pointerId);
    } catch {
      // Release is best-effort.
    }
    const pending = pointsRef.current;
    pointsRef.current = [];
    lastRef.current = null;
    if (pending.length === 0) {
      setActiveStroke(null);
      return;
    }
    const t = transformRef.current;
    const base = baseRef.current;
    const raw: Point[] = pending.map((p) => {
      const pt = logical(p.x, p.y, base.x, base.y, t);
      return { x: pt.x, y: pt.y, pressure: p.pressure };
    });
    const s = optionsRef.current?.smoothing ?? 0.5;
    const points = smoothPoints(raw, s);
    const stroke: Stroke = {
      points,
      color: colorRef.current,
      width: widthRef.current,
    };
    setActiveStroke(null);
    setStrokes((prev) => [...prev, stroke]);
    optionsRef.current?.onStrokeEnd?.(stroke);
  }, []);

  const cancelStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    pointsRef.current = [];
    setActiveStroke(null);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      beginStroke(e);
    },
    [beginStroke],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      moveStroke(e);
    },
    [moveStroke],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      endStroke(e);
    },
    [endStroke],
  );

  const onPointerLeave = useCallback(() => {
    cancelStroke();
  }, [cancelStroke]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const t = transformRef.current;
      const base = baseRef.current;
      const screenX = e.clientX - base.x;
      const screenY = e.clientY - base.y;
      const factor = Math.exp(-e.deltaY * 0.001);
      const nextScale = clampScale(t.scale * factor, zoomMin, zoomMax);
      const next: Transform = {
        x: screenX - ((screenX - t.x) / t.scale) * nextScale,
        y: screenY - ((screenY - t.y) / t.scale) * nextScale,
        scale: nextScale,
      };
      commitTransform(next);
    },
    [commitTransform, zoomMin, zoomMax],
  );

  const clear = useCallback(() => {
    setStrokes([]);
    setActiveStroke(null);
    drawingRef.current = false;
    lastRef.current = null;
    pointsRef.current = [];
  }, []);

  const resetTransform = useCallback(() => {
    commitTransform(IDENTITY);
  }, [commitTransform]);

  const setColor = useCallback((color: string) => {
    colorRef.current = color;
  }, []);

  const setWidth = useCallback((width: number) => {
    widthRef.current = width;
  }, []);

  const surfaceProps: SurfaceProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onWheel,
    style: {
      touchAction: 'none',
      display: 'block',
      cursor: 'crosshair',
    },
  };

  return {
    surfaceProps,
    transform,
    strokes,
    activeStroke,
    isDrawing: drawingRef.current,
    clear,
    resetTransform,
    setColor,
    setWidth,
  };
}
