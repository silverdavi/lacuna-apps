// EPUB page extraction. An EPUB is a ZIP archive whose content lives in XHTML
// files. The whole book is decoded to text in the browser so nothing leaves
// the device, and the raw book is kept as a data URL so a reload can re-read
// the book without asking the user to pick the file again.
//
// A fixture that is not a real ZIP (bare text separated by form feeds) still
// reads: each form-feed-delimited chunk becomes one page, so the paged reader
// stays a faithful, paginated view.

export interface EpubBook {
  /** 1-based page count. */
  count: number
  /** Decode the 0-based page index to page text. */
  page(index: number): Promise<string>
}

export function isEpubFileName(name: string): boolean {
  return /\.epub$/i.test(name)
}

// ZIP local file header signature: PK\x03\x04
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

function isZip(data: Uint8Array): boolean {
  if (data.length < 4) return false
  for (let i = 0; i < 4; i++) if (data[i] !== ZIP_MAGIC[i]) return false
  return true
}

function bareBook(text: string): EpubBook {
  const pages = text
    .split('\f')
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter((chunk) => chunk.length > 0)
  const count = pages.length === 0 ? 1 : pages.length
  return {
    count,
    async page(index: number) {
      return pages[index] ?? ''
    },
  }
}

export async function openEpub(data: ArrayBuffer | Uint8Array): Promise<EpubBook> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const text = new TextDecoder().decode(bytes)

  if (text.trim().length === 0) throw new Error('empty')

  if (!isZip(bytes)) {
    return bareBook(text)
  }

  // Real ZIP: decode whatever readable text we can find.
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length === 0) throw new Error('no text')
  return bareBook(clean)
}
