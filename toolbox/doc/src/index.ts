// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
export type { DocComment, DocData, DocModel, DocRevision } from './model'
export { REVISIONS_KEPT, appendRevision, paragraphsToHtml, type RevisionMeta } from './revisions'
export { DOC_ALLOWED_ATTR, DOC_ALLOWED_TAGS, sanitizeHtml, sanitizeHtmlReport, type SanitizeReport } from './sanitize'
export {
  exportDoc, exporterFor, htmlExporter, htmlImporter, importDoc, importerFor, registerExporter, registerImporter,
  type ConversionWarning, type DocExporter, type DocImporter, type FormatId, type ImportOptions, type Result,
} from './convert'
