// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/converter-kit 0.1.0: snapshot of lacuna-components ConverterKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export interface ConverterPreset {
  id: string;
  label: string;
  /** The conversion function for this preset. */
  convert: (input: string) => string;
}

export interface ConverterKitProps {
  /** Unique key for the persisted record (history + last input). */
  recordKey: string;
  /** Available presets; the first is the default. */
  presets: ConverterPreset[];
  /** Optional label for the input pane (default "Input"). */
  inputLabel?: string;
  /** Optional label for the output pane (default "Output"). */
  outputLabel?: string;
  /** Optional label for the history section (default "History"). */
  historyLabel?: string;
  /** Maximum number of history entries to retain (default 20). */
  maxHistory?: number;
}

export { ConverterKit } from './ConverterKit';
