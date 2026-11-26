// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-drag-reorder 0.1.0: snapshot of lacuna-components useDragReorder at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// jsdom (used by the unit tests) does not implement PointerEvent. Some
// consumers build native PointerEvents, so provide a minimal fallback built on
// MouseEvent when the platform lacks one. Real browsers ship a native
// PointerEvent, so this is a no-op there.
type PointerEventInitLike = MouseEventInit & {
  pointerId?: number;
  width?: number;
  height?: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  pointerType?: string;
  isPrimary?: boolean;
};

class PointerEventPolyfill extends MouseEvent {
  readonly pointerId: number;
  readonly width: number;
  readonly height: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly pointerType: string;
  isPrimary: boolean;

  constructor(type: string, init: PointerEventInitLike = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.width = init.width ?? 0;
    this.height = init.height ?? 0;
    this.pressure = init.pressure ?? 0;
    this.tiltX = init.tiltX ?? 0;
    this.tiltY = init.tiltY ?? 0;
    this.pointerType = init.pointerType ?? 'mouse';
    this.isPrimary = init.isPrimary ?? false;
  }
}

if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

export {}
