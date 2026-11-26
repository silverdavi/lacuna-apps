// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/html-to-markdown 0.1.0: snapshot of lacuna-components htmlToMarkdown at d422a73 by sync-toolbox-components.py; a change gets a new version.
export interface HtmlToMarkdownOptions {
  /** Maximum nesting depth for lists; deeper items are flattened. Default 8. */
  maxListDepth?: number
  /** If true, wrap inline code in backticks. Default true. */
  inlineCode?: boolean
  /** If true, render <img> as Markdown image syntax. Default true. */
  images?: boolean
}

export { htmlToMarkdown } from './htmlToMarkdown'
