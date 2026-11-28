// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz'

export interface ArchiveEntry {
  name: string
  data: Uint8Array
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

async function streamTransform(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart])
  const stream = blob.stream().pipeThrough(transform)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

export async function gzipCompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('GZIP compression is not supported in this browser')
  }
  return streamTransform(bytes, new CompressionStream('gzip'))
}

export async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('GZIP decompression is not supported in this browser')
  }
  return streamTransform(bytes, new DecompressionStream('gzip'))
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    return await streamTransform(bytes, new CompressionStream('deflate-raw'))
  } catch {
    return null
  }
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Deflate decompression is not supported in this browser')
  }
  return streamTransform(bytes, new DecompressionStream('deflate-raw'))
}

export async function packZip(entries: ArchiveEntry[], compress = true): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name)
    const crc = crc32(entry.data)
    let payload = entry.data
    let method = 0

    if (compress && entry.data.length > 64) {
      const deflated = await deflateRaw(entry.data)
      if (deflated && deflated.length < entry.data.length) {
        payload = deflated
        method = 8
      }
    }

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, method, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, payload.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    locals.push(local, payload)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, method, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, payload.length, true)
    cv.setUint32(24, entry.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)

    offset += local.length + payload.length
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + 22)
  let pos = 0
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

export async function unpackZip(bytes: Uint8Array): Promise<ArchiveEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const dec = new TextDecoder()

  // Find End of Central Directory signature
  let eocdPos = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdPos = i
      break
    }
  }
  if (eocdPos < 0) throw new Error('Invalid ZIP archive: missing End of Central Directory')

  const totalEntries = view.getUint16(eocdPos + 10, true)
  let cdPos = view.getUint32(eocdPos + 16, true)
  const entries: ArchiveEntry[] = []

  for (let i = 0; i < totalEntries; i++) {
    if (cdPos + 46 > bytes.length || view.getUint32(cdPos, true) !== 0x02014b50) {
      throw new Error('Corrupt ZIP central directory')
    }
    const method = view.getUint16(cdPos + 10, true)
    const compSize = view.getUint32(cdPos + 20, true)
    const nameLen = view.getUint16(cdPos + 28, true)
    const extraLen = view.getUint16(cdPos + 30, true)
    const commentLen = view.getUint16(cdPos + 32, true)
    const localOffset = view.getUint32(cdPos + 42, true)
    const name = dec.decode(bytes.subarray(cdPos + 46, cdPos + 46 + nameLen))
    cdPos += 46 + nameLen + extraLen + commentLen

    if (name.endsWith('/')) continue

    const localNameLen = view.getUint16(localOffset + 26, true)
    const localExtraLen = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const raw = bytes.subarray(dataStart, dataStart + compSize)

    let data: Uint8Array
    if (method === 0) {
      data = raw.slice()
    } else if (method === 8) {
      data = await inflateRaw(raw)
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${name}`)
    }
    entries.push({ name, data })
  }
  return entries
}

// USTAR TAR packer (adapted from ankitrohatgi/tarballjs, MIT)
export function packTar(entries: ArchiveEntry[]): Uint8Array {
  const enc = new TextEncoder()
  const blocks: Uint8Array[] = []

  for (const entry of entries) {
    const header = new Uint8Array(512)
    const nameBytes = enc.encode(entry.name.slice(0, 99))
    header.set(nameBytes, 0)
    header.set(enc.encode('0000644\0'), 100)
    header.set(enc.encode('0000000\0'), 108)
    header.set(enc.encode('0000000\0'), 116)
    header.set(enc.encode(`${entry.data.length.toString(8).padStart(11, '0')}\0`), 124)
    const mtime = Math.floor(Date.now() / 1000)
    header.set(enc.encode(`${mtime.toString(8).padStart(11, '0')}\0`), 136)
    header.fill(0x20, 148, 156)
    header[156] = 0x30 // regular file '0'
    header.set(enc.encode('ustar\0'), 257)
    header.set(enc.encode('00'), 263)

    let sum = 0
    for (let i = 0; i < 512; i++) sum += header[i]!
    header.set(enc.encode(`${sum.toString(8).padStart(6, '0')}\0 `), 148)

    blocks.push(header)
    const paddedLen = Math.ceil(entry.data.length / 512) * 512
    const dataBlock = new Uint8Array(paddedLen)
    dataBlock.set(entry.data, 0)
    blocks.push(dataBlock)
  }

  blocks.push(new Uint8Array(1024)) // two 512-byte zero blocks end TAR
  const total = blocks.reduce((s, b) => s + b.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const b of blocks) {
    out.set(b, pos)
    pos += b.length
  }
  return out
}

export function unpackTar(bytes: Uint8Array): ArchiveEntry[] {
  const dec = new TextDecoder()
  const entries: ArchiveEntry[] = []
  let offset = 0

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512)
    let allZero = true
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        allZero = false
        break
      }
    }
    if (allZero) break

    const nameRaw = dec.decode(header.subarray(0, 100)).replace(/\0.*$/, '')
    const prefixRaw = dec.decode(header.subarray(345, 500)).replace(/\0.*$/, '')
    const name = prefixRaw ? `${prefixRaw}/${nameRaw}` : nameRaw
    const sizeStr = dec.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim()
    const size = parseInt(sizeStr || '0', 8)
    const typeFlag = header[156]

    offset += 512
    if (!Number.isFinite(size) || size < 0 || offset + size > bytes.length) {
      throw new Error('Corrupt TAR header size')
    }
    if (name && (typeFlag === 0 || typeFlag === 0x30)) {
      entries.push({ name, data: bytes.subarray(offset, offset + size).slice() })
    }
    offset += Math.ceil(size / 512) * 512
  }
  return entries
}

export async function readIncomingFiles(files: File[]): Promise<{ entries: ArchiveEntry[]; sourceLabel: string }> {
  const out: ArchiveEntry[] = []
  let sourceLabel = files.length === 1 ? files[0]!.name : `${files.length} files`

  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer())
    const lower = f.name.toLowerCase()

    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      const unpacked = await unpackZip(bytes)
      out.push(...unpacked)
      sourceLabel = `${f.name} (ZIP)`
    } else if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const gunzipped = await gzipDecompress(bytes)
      if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || isTarBuffer(gunzipped)) {
        out.push(...unpackTar(gunzipped))
        sourceLabel = `${f.name} (TAR.GZ)`
      } else {
        out.push({ name: f.name.replace(/\.gz$/i, '') || 'decompressed.bin', data: gunzipped })
        sourceLabel = `${f.name} (GZIP)`
      }
    } else if (lower.endsWith('.tar') || isTarBuffer(bytes)) {
      out.push(...unpackTar(bytes))
      sourceLabel = `${f.name} (TAR)`
    } else {
      out.push({ name: f.name, data: bytes })
    }
  }
  return { entries: out, sourceLabel }
}

function isTarBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 512) return false
  const magic = new TextDecoder().decode(bytes.subarray(257, 262))
  return magic === 'ustar'
}

export async function buildArchive(
  entries: ArchiveEntry[],
  format: ArchiveFormat,
  baseName: string,
): Promise<{ blob: Blob; filename: string; mime: string }> {
  const clean = baseName.replace(/\.(zip|tar\.gz|tgz|tar|gz)$/i, '') || 'archive'
  if (format === 'zip') {
    const bytes = await packZip(entries, true)
    return { blob: new Blob([bytes as BlobPart], { type: 'application/zip' }), filename: `${clean}.zip`, mime: 'application/zip' }
  }
  if (format === 'tar') {
    const bytes = packTar(entries)
    return { blob: new Blob([bytes as BlobPart], { type: 'application/x-tar' }), filename: `${clean}.tar`, mime: 'application/x-tar' }
  }
  const tarBytes = packTar(entries)
  const gzBytes = await gzipCompress(tarBytes)
  return { blob: new Blob([gzBytes as BlobPart], { type: 'application/gzip' }), filename: `${clean}.tar.gz`, mime: 'application/gzip' }
}

export function createSampleEntries(): ArchiveEntry[] {
  const enc = new TextEncoder()
  return [
    { name: 'README.md', data: enc.encode('# Project Bundle\n\nPacked offline with Lacuna Archive Studio.\n') },
    { name: 'config.json', data: enc.encode('{\n  "version": "1.0.0",\n  "offline": true,\n  "formats": ["zip", "tar", "tar.gz"]\n}\n') },
    { name: 'notes/changelog.txt', data: enc.encode('v1.0.0 - Initial release\nv1.0.1 - Added TAR.GZ conversion\n') },
  ]
}
