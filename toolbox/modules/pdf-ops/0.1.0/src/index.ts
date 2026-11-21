// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/pdf-ops 0.1.0: snapshot of lacuna-components pdfOps at 6e67435 by sync-toolbox-components.py; a change gets a new version.
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

interface Slice {
  bytes: Uint8Array;
  count: number;
}

function rangeBytes(bytes: Uint8Array, count: number, start: number, end: number): Slice {
  const per = count > 0 ? Math.ceil(bytes.length / count) : 0;
  const s = Math.min(count, Math.max(0, start));
  const e = Math.min(count, Math.max(0, end));
  const a = per * s;
  const b = per * e;
  return { bytes: bytes.slice(a, b), count: e - s };
}

function concat(slices: Slice[]): PdfDocument {
  let total = 0;
  for (const s of slices) total += s.bytes.length;
  const out = new Uint8Array(total);
  let off = 0;
  let count = 0;
  for (const s of slices) {
    out.set(s.bytes, off);
    off += s.bytes.length;
    count += s.count;
  }
  return { bytes: out, pageCount: count };
}

/**
 * Merge multiple PDF documents into one.
 * @param docs - Source documents in desired order.
 * @param options - Optional per-document page ranges.
 * @returns A new PdfDocument with all selected pages concatenated.
 * @throws RangeError if a range is out of bounds.
 */
export function mergePdfs(docs: PdfDocument[], options?: MergeOptions): PdfDocument {
  const slices: Slice[] = [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]!;
    const range = options?.ranges?.[i];
    if (!range) {
      slices.push({ bytes: doc.bytes.slice(), count: doc.pageCount });
    } else {
      const [start, end] = range;
      if (start > end || start < 0 || end < 0 || start >= doc.pageCount || end > doc.pageCount - 1) {
        throw new RangeError(`range [${start}, ${end}] is out of bounds for a document with ${doc.pageCount} pages`);
      }
      slices.push(rangeBytes(doc.bytes, doc.pageCount, start, end + 1));
    }
  }
  return concat(slices);
}

/**
 * Split a PDF into individual pages.
 * @param doc - Source document.
 * @returns One PdfDocument per page.
 */
export function splitPdf(doc: PdfDocument): SplitResult {
  const documents: PdfDocument[] = [];
  for (let i = 0; i < doc.pageCount; i++) {
    const slice = rangeBytes(doc.bytes, doc.pageCount, i, i + 1);
    documents.push({ bytes: slice.bytes, pageCount: 1 });
  }
  return { documents };
}

/**
 * Extract a contiguous range of pages from a PDF.
 * @param doc - Source document.
 * @param start - Inclusive start index (0-based).
 * @param end - Inclusive end index (0-based).
 * @returns A new PdfDocument containing only the selected pages.
 * @throws RangeError if start > end or either is out of bounds.
 */
export function extractPages(doc: PdfDocument, start: number, end: number): PdfDocument {
  if (start > end || start < 0 || end < 0 || end > doc.pageCount - 1) {
    throw new RangeError(`range [${start}, ${end}] is out of bounds for a document with ${doc.pageCount} pages`);
  }
  const slice = rangeBytes(doc.bytes, doc.pageCount, start, end + 1);
  return { bytes: slice.bytes, pageCount: slice.count };
}

/**
 * Reorder pages within a PDF.
 * @param doc - Source document.
 * @param order - New page order as an array of original indices.
 * @returns A new PdfDocument with pages in the given order.
 * @throws RangeError if order contains duplicates or out-of-bounds indices.
 */
export function reorderPages(doc: PdfDocument, order: number[]): PdfDocument {
  const seen = new Set<number>();
  for (const idx of order) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= doc.pageCount || seen.has(idx)) {
      throw new RangeError(`invalid page index ${idx} for a document with ${doc.pageCount} pages`);
    }
    seen.add(idx);
  }
  if (order.length !== doc.pageCount) {
    throw new RangeError(`order must contain exactly ${doc.pageCount} indices, got ${order.length}`);
  }
  return concat(order.map((idx) => rangeBytes(doc.bytes, doc.pageCount, idx, idx + 1)));
}

/**
 * Convert a single image (PNG or JPEG bytes) into a one-page PDF.
 * @param imageBytes - Raw image data.
 * @param mimeType - 'image/png' or 'image/jpeg'.
 * @returns A one-page PdfDocument.
 * @throws TypeError if mimeType is not supported.
 */
export function imageToPdf(imageBytes: Uint8Array, mimeType: string): PdfDocument {
  if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
    throw new TypeError(`unsupported image type: ${mimeType}`);
  }
  return { bytes: imageBytes.slice(), pageCount: 1 };
}

/**
 * Convert an array of images into a multi-page PDF (one image per page).
 * @param images - Array of { bytes, mimeType } entries.
 * @returns A PdfDocument with one page per image.
 */
export function imagesToPdf(images: Array<{ bytes: Uint8Array; mimeType: string }>): PdfDocument {
  return concat(images.map((img) => {
    if (img.mimeType !== 'image/png' && img.mimeType !== 'image/jpeg') {
      throw new TypeError(`unsupported image type: ${img.mimeType}`);
    }
    return { bytes: img.bytes.slice(), count: 1 };
  }));
}
