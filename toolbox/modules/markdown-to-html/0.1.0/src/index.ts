// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/markdown-to-html 0.1.0: snapshot of lacuna-components markdownToHtml at 6e67435 by sync-toolbox-components.py; a change gets a new version.
export interface MarkdownToHtmlOptions {
  /** If true, task list checkboxes are rendered as disabled inputs. Default: true. */
  taskLists?: boolean;
  /** If true, tables are rendered as HTML tables. Default: true. */
  tables?: boolean;
}

export { markdownToHtml, parseMarkdown, sanitizeHtml } from './markdownToHtml'
