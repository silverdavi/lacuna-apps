// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, Keys, List, PrimaryButton, Rail, Row, Select } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useImages, useSettings, type ImageRecord, type PageSize } from './host'

// Synthetic fixtures: first image is 1280x720, second 800x600, then they cycle.
const FIXTURE_DIMENSIONS: [number, number][] = [
  [1280, 720],
  [800, 600],
]

const PAGE_SIZES = [
  { value: 'A4', label: 'A4' },
  { value: 'Letter', label: 'Letter' },
]

export function App() {
  const [images, setImages] = useImages()
  const [settings, setSettings] = useSettings()

  function addImage() {
    setImages((current) => {
      const next = current.length + 1
      const [width, height] = FIXTURE_DIMENSIONS[(next - 1) % FIXTURE_DIMENSIONS.length]
      return [...current, { id: `img-${next}`, name: `Image ${next}`, width, height }]
    })
  }

  function moveUp(index: number) {
    if (index <= 0) return
    setImages((current) => {
      const next = [...current]
      const moved = next.splice(index, 1)[0]
      next.splice(index - 1, 0, moved)
      return next
    })
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id))
  }

  function downloadPdf() {
    const bytes = buildPdf(images, settings.pageSize)
    saveBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), { filename: 'images.pdf', mimeType: 'application/pdf' })
  }

  const pages = images.length

  return (
    <AppShell
      name="Image To PDF"
      icon="pdf"
      hue="rust"
      category="Productivity"
      meta={pages === 0 ? 'empty' : `${pages} image${pages === 1 ? '' : 's'}`}
      status={pages > 0 ? `Pages: ${pages}` : undefined}
      side={
        <Rail title="Output" chips={[`Page size: ${settings.pageSize}`, 'File: images.pdf', 'Format: PDF']}>
          <Keys items={[['A', 'Add image'], ['Up', 'Move up'], ['Backspace', 'Delete image']]} />
        </Rail>
      }
    >
      <Card mono="Output" title="Page size" accent>
        <FormGrid>
          <Select
            label="Page size"
            value={settings.pageSize}
            onChange={(value) => setSettings((current) => ({ ...current, pageSize: value as PageSize }))}
            options={PAGE_SIZES}
          />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={downloadPdf} disabled={pages === 0}>Download PDF</PrimaryButton>
        </Actions>
      </Card>

      <Card mono="Queue" title="Images" actions={pages > 0 ? <Button kind="secondary" onClick={addImage}>Add image</Button> : undefined}>
        {pages === 0 ? (
          <EmptyState
            mono="Empty"
            title="No images yet"
            detail="Add an image to start building the PDF."
            actionLabel="Add image"
            onAction={addImage}
          />
        ) : (
          <List label="Images">
            {images.map((image, index) => (
              <Row
                key={image.id}
                title={image.name}
                meta={`Page ${index + 1}`}
                value={`${image.width} x ${image.height}`}
                action={
                  <Actions>
                    {index > 0 && (
                      <Button kind="ghost" onClick={() => moveUp(index)} ariaLabel="Move up">
                        Move up
                      </Button>
                    )}
                    <Button
                      kind="danger"
                      onClick={() => removeImage(image.id)}
                      ariaLabel={`Delete ${image.name}`}
                    >
                      Delete
                    </Button>
                  </Actions>
                }
              />
            ))}
          </List>
        )}
      </Card>

      <Card mono="Summary">
        <KpiRow>
          <Kpi value={String(pages)} label="Pages" accent />
          <Kpi value={settings.pageSize} label="Page size" />
          <Kpi value="PDF" label="Format" />
        </KpiRow>
      </Card>
    </AppShell>
  )
}

// Minimal valid PDF: one page per image at the chosen page size, each page
// carrying the image name and dimensions as text. The page box differs between
// A4 (595 x 842) and Letter (612 x 792), so the byte sizes of the downloads
// differ.
function buildPdf(images: ImageRecord[], pageSize: PageSize): Uint8Array {
  const width = pageSize === 'A4' ? 595 : 612
  const height = pageSize === 'A4' ? 842 : 792
  const count = Math.max(images.length, 1)

  const head = '%PDF-1.4\n'
  const parts: string[] = [head]
  const offsets: number[] = [0]

  const push = (text: string) => {
    offsets.push(parts.join('').length)
    parts.push(text)
  }

  push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`)
  const kids = Array.from({ length: count }, (_, i) => `${i + 3} 0 R`).join(' ')
  push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${count} >>\nendobj\n`)

  for (let i = 0; i < count; i++) {
    const page = i + 3
    const content = page + 1
    const font = 3 + count * 2
    const image = images[i]
    const name = image ? escapePdfString(`${image.name} (${image.width} x ${image.height})`) : ''
    push(
      `${page} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${content} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>\nendobj\n`,
    )
    const stream = `BT /F1 12 Tf 36 ${height - 36} Td (${name} [${pageSize}]) Tj ET`
    push(`${content} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`)
  }

  const fontNum = 3 + count * 2
  push(`${fontNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)

  const body = parts.join('')
  const xrefStart = body.length
  let xref = `xref\n0 ${fontNum + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= fontNum; n++) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${fontNum + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  const full = body + xref + trailer
  const out = new Uint8Array(full.length)
  for (let i = 0; i < full.length; i++) out[i] = full.charCodeAt(i) & 0xff
  return out
}

function escapePdfString(text: string): string {
  return text.replace(/([\\()])/g, '\\$1')
}
