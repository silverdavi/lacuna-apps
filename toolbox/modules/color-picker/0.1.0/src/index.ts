// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/color-picker 0.1.0: snapshot of lacuna-components ColorPicker at 8aeeaa8 by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties } from 'react';
import type { ReactNode } from 'react';

export interface ColorValue {
  hex: string;
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
}

export interface ColorPickerProps {
  value: ColorValue;
  onChange: (next: ColorValue) => void;
  onEyedrop?: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export { ColorPicker } from './ColorPicker';
