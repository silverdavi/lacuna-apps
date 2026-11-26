<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components pdfOps at 6e67435. -->

> `@lacuna/pdf-ops` `0.1.0`. To use it in an app: add `"@lacuna/pdf-ops": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/pdf-ops": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/pdf-ops'`.

# pdfOps

Pure functions to merge, split, reorder, and extract PDF pages and to convert PNG and JPEG images into PDF documents. Use it in file-converter and PDF-toolkit apps that need to manipulate document structure in the browser without a server.

## Signature

```ts
export interface PdfPage {
  /** Raw PDF page object (opaque binary or structured page data). */
  data: Uint8Array;
  /** Page index in the source document (0-based). */
  index: number;
}

export interface PdfDocument {
  /** Raw PDF bytes. */
  bytes: Uint8Array;
  /** Number of pages. */
  pageCount: number;
}

export interface MergeOptions {
  /** Optional page ranges per document: [start, end] inclusive, 0-based. Omit to use all pages. */
  ranges?: Array<[number, number]>;
}

export interface SplitResult {
  /** One PdfDocument per extracted page or range. */
  documents: PdfDocument[];
}

export function mergePdfs(docs: PdfDocument[], options?: MergeOptions): PdfDocument;
export function splitPdf(doc: PdfDocument): SplitResult;
export function extractPages(doc: PdfDocument, start: number, end: number): PdfDocument;
export function reorderPages(doc: PdfDocument, order: number[]): PdfDocument;
export function imageToPdf(imageBytes: Uint8Array, mimeType: string): PdfDocument;
export function imagesToPdf(images: Array<{ bytes: Uint8Array; mimeType: string }>): PdfDocument;
```

## Usage

```tsx
import { mergePdfs, splitPdf, extractPages, reorderPages, imageToPdf, imagesToPdf, type PdfDocument } from '@lacuna/pdf-ops';

const a: PdfDocument = { bytes: new Uint8Array([1, 1, 2, 2, 3, 3]), pageCount: 3 };
const b: PdfDocument = { bytes: new Uint8Array([4, 4, 5, 5]), pageCount: 2 };

const merged = mergePdfs([a, b]);
const partial = mergePdfs([a, b], { ranges: [[0, 1], [0, 0]] });
const pages = splitPdf(a);
const middle = extractPages(a, 1, 1);
const reversed = reorderPages(a, [2, 1, 0]);
const png = imageToPdf(new Uint8Array([137, 80, 78, 71]), 'image/png');
const multi = imagesToPdf([{ bytes: png.bytes, mimeType: 'image/png' }]);

console.log(
  merged.pageCount,
  partial.pageCount,
  pages.documents.length,
  middle.pageCount,
  reversed.pageCount,
  png.pageCount,
  multi.pageCount,
);
```
