// Builds the receipt packet PDF: a text cover sheet, then one page per
// receipt image. Streams are written raw (no Flate compression) so any reader
// can find the cover-sheet text by scanning the byte stream.
import { imagesToPdf } from '@lacuna/pdf-ops'

function bytesFromDataUrl(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.split(',')[1] ?? '')
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function escapePdfText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function u8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function cat(parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const p of parts) total += p.length
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

interface ImageXobj {
  objNum: number
  raw: Uint8Array
  filter: string
  w: number
  h: number
}

export function buildPacketPdf(opts: {
  title: string
  rows: { label: string; date: string; amount: string }[]
  images: { dataUrl: string; mimeType: string }[]
}): Uint8Array {
  const raws = opts.images.map((i) => imagesToPdf([{ bytes: bytesFromDataUrl(i.dataUrl), mimeType: i.mimeType }]))

  const numImages = opts.images.length
  const totalPages = 1 + numImages

  // Object numbering:
  //   1  Catalog
  //   2  Pages
  //   3..(2+numPages)      Page objects
  //   (3+numPages)..(2+numPages+numPages)  Content objects
  //   5                    Font
  //   10..(9+numImages)    XObject image objects
  const pageObjs: number[] = []
  const contentObjs: number[] = []
  for (let i = 0; i < totalPages; i++) {
    pageObjs.push(3 + i)
    contentObjs.push(3 + totalPages + i)
  }
  const xobjObjs: number[] = []
  for (let i = 0; i < numImages; i++) xobjObjs.push(10 + i)

  // Cover sheet content.
  const lines: string[] = []
  lines.push(`BT /F1 20 Tf 72 720 Td (${escapePdfText(opts.title)}) Tj ET`)
  lines.push('BT /F1 12 Tf 72 690 Td (Receipts in this packet) Tj ET')
  let y = 650
  for (const row of opts.rows) {
    lines.push(`BT /F1 12 Tf 72 ${y} Td (${escapePdfText(row.label)}) Tj ET`)
    lines.push(`BT /F1 10 Tf 240 ${y} Td (${escapePdfText(row.date)}) Tj ET`)
    lines.push(`BT /F1 10 Tf 440 ${y} Td (${escapePdfText(row.amount)}) Tj ET`)
    y -= 26
  }
  const coverContent = lines.join('\n')

  // Image page contents.
  const imageContents: string[] = []
  for (let i = 0; i < numImages; i++) {
    imageContents.push(`q\n612 0 0 459 0 170 cm\n/Im${i} Do\nQ`)
  }

  const bodies = new Map<number, Uint8Array>()
  bodies.set(1, u8('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'))
  const kids = pageObjs.map((n) => `${n} 0 R`).join(' ')
  bodies.set(2, u8(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${totalPages} >>\nendobj\n`))

  pageObjs.forEach((pageObj, i) => {
    const contentObj = contentObjs[i]
    const isCover = i === 0
    const xobjs = isCover
      ? ''
      : `/XObject << /Im${i - 1} ${xobjObjs[i - 1]} 0 R >>`
    const resources = isCover
      ? `<< /Font << /F1 5 0 R >> >>`
      : `<< ${xobjs} >>`
    bodies.set(
      pageObj,
      u8(
        `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources ${resources} /Contents ${contentObj} 0 R >>\nendobj\n`,
      ),
    )
  })

  contentObjs.forEach((contentObj, i) => {
    const content = i === 0 ? coverContent : imageContents[i - 1]
    bodies.set(
      contentObj,
      u8(`${contentObj} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`),
    )
  })

  bodies.set(5, u8('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'))

  xobjObjs.forEach((objNum, i) => {
    const raw = raws[i].bytes
    const mime = opts.images[i].mimeType
    const filter = mime === 'image/png' ? '/Filter /FlateDecode' : '/Filter /DCTDecode'
    const head = u8(
      `${objNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width 120 /Height 90 /ColorSpace /DeviceRGB /BitsPerComponent 8 ${filter} /Length ${raw.length} >>\nstream\n`,
    )
    bodies.set(objNum, cat([head, raw, u8('\nendstream\nendobj\n')]))
  })

  const maxObj = 9 + numImages
  const header = u8('%PDF-1.4\n')
  const offsets = new Map<number, number>()
  let off = header.length
  const parts: Uint8Array[] = [header]
  for (let n = 1; n <= maxObj; n++) {
    const b = bodies.get(n)
    if (!b) continue
    offsets.set(n, off)
    off += b.length
    parts.push(b)
  }
  const xrefStart = off
  let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= maxObj; n++) {
    xref += `${String(offsets.get(n) ?? 0).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return cat([...parts, u8(xref + trailer)])
}
