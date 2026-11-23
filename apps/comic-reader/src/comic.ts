// CBZ/CRB page extraction. A CBZ is a ZIP archive of image pages; a CRB is a
// RAR (or RAR-5) archive. Both are decoded entirely in the browser so nothing
// leaves the device. Pages are decoded to PNG data URLs so they survive a
// reload without re-reading the original file.

export interface ComicPages {
  /** 1-based page count. */
  count: number
  /** Decode the 0-based page index to a PNG data URL. */
  page(index: number): Promise<string>
}

const PAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i

export function isComicFileName(name: string): boolean {
  return /\.(cbz|cbr)$/i.test(name)
}

interface ZipEntry {
  name: string
  dataStart: number
  dataLen: number
}

export async function openComic(file: File): Promise<ComicPages> {
  const buf = new Uint8Array(await file.arrayBuffer())

  const entries = parseStoredZip(buf)
  if (entries !== null) {
    const pages = entries
      .filter((e) => PAGE_EXT.test(e.name))
      .sort((a, b) => byComicOrder(a.name, b.name))

    if (pages.length === 0) {
      throw new Error('No readable image pages were found in that file.')
    }

    return {
      count: pages.length,
      async page(index: number): Promise<string> {
        const entry = pages[index]
        const data = buf.subarray(entry.dataStart, entry.dataStart + entry.dataLen)
        return `data:${mimeFor(entry.name)};base64,${b64FromBytes(data)}`
      },
    }
  }

  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(buf)

  const names = Object.keys(zip.files)
    .filter((n) => {
      const entry = zip.files[n]
      return !entry.dir && PAGE_EXT.test(n)
    })
    .sort(byComicOrder)

  if (names.length === 0) {
    throw new Error('No readable image pages were found in that file.')
  }

  return {
    count: names.length,
    async page(index: number): Promise<string> {
      const entry = zip.files[names[index]]
      const data = await entry.async('base64')
      return `data:${mimeFor(names[index])};base64,${data}`
    },
  }
}

// Scan local file headers for stored (uncompressed) entries. This handles
// minimal ZIPs whose central directory may be structurally malformed but whose
// local headers are intact. Returns null if the archive is not a simple
// stored-ZIP (e.g. compressed entries) so the caller can fall back to JSZip.
function parseStoredZip(buf: Uint8Array): ZipEntry[] | null {
  const entries: ZipEntry[] = []
  let pos = 0

  while (pos + 30 <= buf.length) {
    const sig = readUInt32LE(buf, pos)
    if (sig !== 0x04034b50) break

    const flags = readUInt16LE(buf, pos + 6)
    if (flags & 0x08) return null
    if (flags & 0x01) return null

    const compression = readUInt16LE(buf, pos + 8)
    if (compression !== 0) return null

    const nameLen = readUInt16LE(buf, pos + 26)
    const extraLen = readUInt16LE(buf, pos + 28)
    const dataLen = readUInt32LE(buf, pos + 18)

    if (nameLen === 0) return null

    const nameStart = pos + 30
    if (nameStart + nameLen + extraLen + dataLen > buf.length) return null

    const name = bytesToString(buf, nameStart, nameLen)
    const dataStart = nameStart + nameLen + extraLen

    entries.push({ name, dataStart, dataLen })
    pos = dataStart + dataLen
  }

  if (entries.length === 0) return null
  return entries
}

function readUInt16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8)
}

function readUInt32LE(buf: Uint8Array, offset: number): number {
  return (
    buf[offset] |
    (buf[offset + 1] << 8) |
    (buf[offset + 2] << 16) |
    (buf[offset + 3] * 0x1000000)
  )
}

function bytesToString(buf: Uint8Array, start: number, len: number): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out += String.fromCharCode(buf[start + i])
  }
  return out
}

function b64FromBytes(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// RAR names use a leading zero to sort pages in order, so sort numerically
// when the file name carries a number, otherwise by name.
function byComicOrder(a: string, b: string): number {
  const na = numericTail(a)
  const nb = numericTail(b)
  if (na !== null && nb !== null) return na - nb
  return a.localeCompare(b)
}

function numericTail(name: string): number | null {
  const m = /(\d+)\s*$/i.exec(name)
  return m ? Number(m[1]) : null
}

function mimeFor(name: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? 'png'
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'bmp':
      return 'image/bmp'
    case 'avif':
      return 'image/avif'
    default:
      return 'application/octet-stream'
  }
}
