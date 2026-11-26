// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Select,
} from '@lacuna/ui'
import { usePointerDraw, type Stroke } from '@lacuna/use-pointer-draw'
import { saveBlob } from '@lacuna/file-save-open'
import {
  annotationStore,
  documentStore,
  signatureStore,
  type Annotation,
  type Document,
  type Signature,
} from './host'

type Tab = 'Documents' | 'Signatures' | 'Annotations'

const TABS: Tab[] = ['Documents', 'Signatures', 'Annotations']

const PAD_W = 400
const PAD_H = 160

function pageCountFor(size: number): number {
  return Math.max(1, Math.ceil(size / 1000))
}

function signedName(name: string): string {
  return name.replace(/\.pdf$/i, '') + '-signed.pdf'
}

function traceStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, canvas: HTMLCanvasElement): void {
  const pts = stroke.points
  if (pts.length === 0) return
  const scale = canvas.width / canvas.clientWidth || 1
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const first = pts[0]
  if (!first) return
  ctx.moveTo(first.x * scale, first.y * scale)
  if (pts.length === 1) {
    ctx.lineTo(first.x * scale + 0.5, first.y * scale + 0.5)
  } else {
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]
      if (p) ctx.lineTo(p.x * scale, p.y * scale)
    }
  }
  ctx.stroke()
}

const SignatureCanvas = forwardRef<HTMLCanvasElement, { onDrawn?: () => void }>(function SignatureCanvas(
  { onDrawn },
  forwardedRef,
) {
  const internalRef = useRef<HTMLCanvasElement | null>(null)
  const setRefs = (node: HTMLCanvasElement | null) => {
    internalRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }
  const onDrawnRef = useRef(onDrawn)
  onDrawnRef.current = onDrawn
  const { surfaceProps, strokes, activeStroke, setWidth } = usePointerDraw({
    strokeWidth: 2,
    smoothing: 0.5,
    minDistance: 2,
    onStrokeEnd: () => onDrawnRef.current?.(),
  })

  useEffect(() => {
    setWidth(2)
  }, [setWidth])

  useEffect(() => {
    const canvas = internalRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of strokes) traceStroke(ctx, stroke, canvas)
    if (activeStroke) traceStroke(ctx, activeStroke, canvas)
  }, [strokes, activeStroke])

  const style: React.CSSProperties = {
    ...surfaceProps.style,
    width: '100%',
    height: 'auto',
    background: 'var(--paper)',
  }

  return (
    <div className="ps-pad-wrap">
      <canvas
        ref={setRefs}
        width={PAD_W}
        height={PAD_H}
        className="ps-pad"
        {...surfaceProps}
        style={style}
      />
    </div>
  )
})

export function App() {
  const documents = useMemo(() => documentStore(), [])
  const signatures = useMemo(() => signatureStore(), [])
  const annotations = useMemo(() => annotationStore(), [])

  const [tab, setTab] = useState<Tab>('Documents')
  const [docs, setDocs] = useState<Document[]>([])
  const [sigs, setSigs] = useState<Signature[]>([])
  const [anns, setAnns] = useState<Annotation[]>([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [selectedSig, setSelectedSig] = useState('')
  const [page, setPage] = useState('1')
  const [padOpen, setPadOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('')
  const padRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    setDocs(documents.list())
    setSigs(signatures.list())
    setAnns(annotations.list())
  }, [documents, signatures, annotations])

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const doc = documents.add({ name: file.name, pageCount: pageCountFor(file.size) })
    setDocs(documents.list())
    setSelectedDoc((current) => current || doc.id)
    setStatus(`Added ${file.name}`)
  }

  const removeDoc = (id: string) => {
    documents.remove(id)
    setDocs(documents.list())
    setSelectedDoc((current) => (current === id ? '' : current))
  }

  const downloadSigned = (doc: Document) => {
    const blob = new Blob([new Uint8Array(Math.max(1, doc.pageCount))], { type: 'application/pdf' })
    saveBlob(blob, { filename: signedName(doc.name) })
  }

  const captureDraft = () => {
    const canvas = padRef.current
    if (!canvas) return
    setDraft(canvas.toDataURL('image/png'))
  }

  const saveSignature = () => {
    if (!draft) return
    const sig = signatures.add({
      name: `Signature ${signatures.list().length + 1}`,
      data: draft,
    })
    setSigs(signatures.list())
    setSelectedSig((current) => current || sig.id)
    setDraft('')
    setStatus(`Saved ${sig.name}`)
  }

  const removeSig = (id: string) => {
    signatures.remove(id)
    setSigs(signatures.list())
    setSelectedSig((current) => (current === id ? '' : current))
  }

  const placeSignature = () => {
    const doc = documents.list().find((d) => d.id === selectedDoc)
    const sig = signatures.list().find((s) => s.id === selectedSig)
    if (!doc || !sig) {
      setStatus('Select a document and a signature first')
      return
    }
    const pageNum = Math.max(1, Math.min(parseInt(page, 10) || 1, 10))
    annotations.add({
      documentId: doc.id,
      documentName: doc.name,
      signatureId: sig.id,
      signatureName: sig.name,
      page: pageNum,
    })
    setAnns(annotations.list())
    setStatus(`Placed ${sig.name} on page ${pageNum} of ${doc.name}`)
  }

  const deleteAnnotation = (id: string) => {
    annotations.remove(id)
    setAnns(annotations.list())
  }

  const docOptions = docs.map((d) => ({ value: d.id, label: d.name }))
  const sigOptions = sigs.map((s) => ({ value: s.id, label: s.name }))
  const pageOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }))

  return (
    <AppShell
      name="PDF Document Signer"
      icon="docs"
      hue="rust"
      category="Productivity"
      meta={`${docs.length} document${docs.length === 1 ? '' : 's'}`}
      status={status || undefined}
    >
      <div className="ps-tabs" role="tablist" aria-label="PDF Document Signer views">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`ps-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Documents' && (
        <div role="tabpanel" aria-label="Documents">
          <Card mono="Upload" title="PDF files">
            <Actions>
              <PrimaryButton onClick={() => document.getElementById('ps-file')?.click()}>Upload PDF</PrimaryButton>
            </Actions>
            <input
              id="ps-file"
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
          </Card>
          <Card mono={`${docs.length} saved`} title="Documents">
            {docs.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No documents yet"
                detail="Upload a PDF to start signing."
                actionLabel="Upload PDF"
              />
            ) : (
              <List label="Documents">
                {docs.map((doc) => (
                  <Row
                    key={doc.id}
                    hot={selectedDoc === doc.id}
                    title={doc.name}
                    meta={`${doc.pageCount} page${doc.pageCount === 1 ? '' : 's'}`}
                    action={
                      <span className="ps-row-actions">
                        <Button
                          kind="secondary"
                          ariaLabel={`Select ${doc.name}`}
                          onClick={() => setSelectedDoc(doc.id)}
                        >
                          Select
                        </Button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Download signed ${doc.name}`}
                          onClick={() => downloadSigned(doc)}
                        >
                          Download signed
                        </Button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete document ${doc.name}`}
                          onClick={() => removeDoc(doc.id)}
                        >
                          Delete
                        </Button>
                      </span>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </div>
      )}

      {tab === 'Signatures' && (
        <div role="tabpanel" aria-label="Signatures">
          <Card mono="Draw" title="Signature pad">
            <Actions>
              <PrimaryButton
                onClick={() => {
                  setPadOpen(true)
                  setDraft('')
                }}
              >
                Draw signature
              </PrimaryButton>
              <Button kind="secondary" disabled={!draft} onClick={saveSignature}>
                Save signature
              </Button>
            </Actions>
            {padOpen && (
              <div className="ps-pad-area">
                <SignatureCanvas ref={padRef} onDrawn={captureDraft} />
                <Actions>
                  <Button
                    kind="ghost"
                    onClick={() => {
                      captureDraft()
                      setPadOpen(false)
                    }}
                  >
                    Done
                  </Button>
                </Actions>
              </div>
            )}
            {draft && !padOpen && (
              <img className="ps-draft" src={draft} alt="Signature preview" />
            )}
          </Card>
          <Card mono="Place" title="Place on a document">
            <FormGrid>
              <Select label="Document" value={selectedDoc} onChange={setSelectedDoc} options={docOptions} />
              <Select label="Signature" value={selectedSig} onChange={setSelectedSig} options={sigOptions} />
              <Select label="Page" value={page} onChange={setPage} options={pageOptions} />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={placeSignature}>Place signature</PrimaryButton>
            </Actions>
          </Card>
          <Card mono={`${sigs.length} saved`} title="Signatures">
            {sigs.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No signatures yet"
                detail="Draw one in the signature pad above."
                actionLabel="Draw signature"
              />
            ) : (
              <List label="Signatures">
                {sigs.map((sig) => (
                  <Row
                    key={sig.id}
                    hot={selectedSig === sig.id}
                    title={sig.name}
                    action={
                      <span className="ps-row-actions">
                        <Button
                          kind="secondary"
                          ariaLabel={`Select ${sig.name}`}
                          onClick={() => setSelectedSig(sig.id)}
                        >
                          Select
                        </Button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete signature ${sig.name}`}
                          onClick={() => removeSig(sig.id)}
                        >
                          Delete
                        </Button>
                      </span>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </div>
      )}

      {tab === 'Annotations' && (
        <div role="tabpanel" aria-label="Annotations">
          <Card mono={`${anns.length} placed`} title="Annotations">
            {anns.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No annotations yet"
                detail="Place a signature on a document to see it here."
                actionLabel="Place signature"
              />
            ) : (
              <List label="Annotations">
                {anns.map((ann) => (
                  <Row
                    key={ann.id}
                    title={ann.documentName}
                    meta={`${ann.signatureName} · Page ${ann.page}`}
                    action={
                      <Button
                        kind="ghost"
                        ariaLabel="Delete annotation"
                        onClick={() => deleteAnnotation(ann.id)}
                      >
                        Delete annotation
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  )
}
