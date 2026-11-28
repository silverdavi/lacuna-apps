// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type SvgOutputTarget = 'svg-min' | 'png' | 'jpeg' | 'webp' | 'datauri' | 'css' | 'jsx'

export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <!-- Sample geometric badge -->
  <metadata>Created with Lacuna SVG Converter</metadata>
  <rect x="10.000" y="10.000" width="300.000" height="180.000" fill="rgb(245, 241, 232)" stroke="rgb(28, 28, 30)" stroke-width="3" />
  <circle cx="96.000" cy="100.000" r="52.000" fill="rgb(34, 87, 166)" />
  <polygon points="180,152 230,48 280,152" fill="rgb(196, 77, 45)" />
</svg>`

export interface SvgOptimizeOptions {
  stripComments: boolean
  stripMetadata: boolean
  roundDecimals: boolean
  minifyWhitespace: boolean
}

export function optimizeSvg(raw: string, opts: SvgOptimizeOptions): string {
  let out = raw.trim()
  if (opts.stripComments) {
    out = out.replace(/<!--[\s\S]*?-->/g, '')
  }
  if (opts.stripMetadata) {
    out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    out = out.replace(/<\?xml[\s\S]*?\?>/gi, '')
    out = out.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  }
  if (opts.roundDecimals) {
    out = out.replace(/(\d+\.\d{2,})/g, (m) => {
      const n = Number(m)
      return Number.isFinite(n) ? String(Number(n.toFixed(1))) : m
    })
  }
  if (opts.minifyWhitespace) {
    out = out.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim()
  }
  return out
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function svgToCssBackground(svg: string): string {
  return `background-image: url("${svgToDataUri(svg)}");`
}

export function svgToJsx(svg: string): string {
  const body = svg
    .replace(/class=/g, 'className=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/viewbox=/gi, 'viewBox=')
  return `export function Graphic(props: React.SVGProps<SVGSVGElement>) {\n  return (\n    ${body.replace('<svg', '<svg {...props}')}\n  )\n}\n`
}

export function parseSvgDimensions(svg: string): { width: number; height: number } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, 'image/svg+xml')
  const el = doc.querySelector('svg')
  if (!el) throw new Error('Input does not contain a valid <svg> element')
  const wAttr = parseFloat(el.getAttribute('width') ?? '')
  const hAttr = parseFloat(el.getAttribute('height') ?? '')
  if (Number.isFinite(wAttr) && wAttr > 0 && Number.isFinite(hAttr) && hAttr > 0) {
    return { width: Math.round(wAttr), height: Math.round(hAttr) }
  }
  const vb = (el.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  if (vb.length === 4 && Number.isFinite(vb[2]) && Number.isFinite(vb[3]) && vb[2]! > 0 && vb[3]! > 0) {
    return { width: Math.round(vb[2]!), height: Math.round(vb[3]!) }
  }
  return { width: 320, height: 200 }
}

export async function rasterizeSvg(
  svg: string,
  format: 'png' | 'jpeg' | 'webp',
  scale: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const dims = parseSvgDimensions(svg)
  const w = Math.max(1, Math.round(dims.width * scale))
  const h = Math.max(1, Math.round(dims.height * scale))
  const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp'

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Failed to render SVG'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    if (format === 'jpeg') {
      ctx.fillStyle = 'rgb(255, 255, 255)'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`Could not encode ${mime}`))),
        mime,
        0.92,
      )
    })
    return { blob, width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}
