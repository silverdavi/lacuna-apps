// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/export-menu 0.1.0: snapshot of lacuna-components ExportMenu at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export interface ExportOption {
  /** Unique identifier for the option. */
  id: string
  /** Display label. */
  label: string
  /** MIME type for the export. */
  mimeType: string
  /** File extension (without dot). */
  extension: string
  /** Function that produces the export data. */
  getData: () => string | Blob
}

export interface ExportMenuProps {
  /** List of export options to show in the menu. */
  options: ExportOption[]
  /** Base filename (without extension) for downloads. Default "export". */
  fileName?: string
  /** Accessible label for the trigger button. Default "Export". */
  ariaLabel?: string
  /** Whether the menu is disabled. Default false. */
  disabled?: boolean
  /** Called after a successful export. */
  onExport?: (optionId: string) => void
  /** Called if an export fails. */
  onError?: (optionId: string, error: Error) => void
}
