// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/file-tool-kit 0.1.0: snapshot of lacuna-components FileToolKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import type { BeforeAfterProps } from '@lacuna/before-after'
import type { ExportMenuProps } from '@lacuna/export-menu'

export interface FileToolKitOptions {
  /** Keyed by option id; values are rendered as labelled controls. */
  [key: string]: string | number | boolean
}

/** Shape of the forwarded FileDropZone props (the dependency is provided by the host). */
export interface FileDropZoneProps {
  /** Accessible label for the drop zone. */
  label?: string
  /** Accept attribute forwarded to the file input. */
  accept?: string
  /** Called with the dropped or chosen file. */
  onFile?: (file: File) => void
}

export interface FileToolKitProps {
  /** Accept attribute forwarded to the file input, e.g. "image/*". */
  accept?: string
  /** Maximum file size in bytes; files above this are rejected. */
  maxSizeBytes?: number
  /** Options panel: each key is an option id, value is the initial value. */
  options?: FileToolKitOptions
  /** Transform function: receives the raw File and current options, returns a Blob. */
  transform: (file: File, options: FileToolKitOptions) => Promise<Blob>
  /** Export formats offered in the ExportMenu. */
  exportFormats?: Array<'csv' | 'json' | 'png' | 'pdf' | 'print'>
  /** Optional label for the kit heading. */
  title?: string
  /** Forwarded to the internal FileDropZone. */
  dropZoneProps?: Omit<FileDropZoneProps, 'onFile'>
  /** Forwarded to the internal BeforeAfter. */
  beforeAfterProps?: Omit<BeforeAfterProps, 'before' | 'after'>
  /** Forwarded to the internal ExportMenu. */
  exportMenuProps?: Omit<ExportMenuProps, 'onExport'>
}
