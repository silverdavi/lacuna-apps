// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface SpriteInput {
  id: string
  name: string
  width: number
  height: number
  dataUrl: string
}

export interface PackedSprite extends SpriteInput {
  x: number
  y: number
}

export interface PackResult {
  width: number
  height: number
  sprites: PackedSprite[]
  pngBlob: Blob
  previewUrl: string
  jsonAtlas: string
  cssAtlas: string
}

const PX_UNIT = 'p' + 'x'

export function potpackSprites(inputs: SpriteInput[], padding: number): { width: number; height: number; sprites: PackedSprite[] } {
  const boxes = inputs.map((s) => ({
    sprite: s,
    w: s.width + padding,
    h: s.height + padding,
    x: 0,
    y: 0,
  }))

  let area = 0
  let maxWidth = 0
  for (const b of boxes) {
    area += b.w * b.h
    maxWidth = Math.max(maxWidth, b.w)
  }

  boxes.sort((a, b) => b.h - a.h)
  const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth)
  const spaces = [{ x: 0, y: 0, w: startWidth, h: Infinity }]
  let width = 0
  let height = 0

  for (const box of boxes) {
    for (let i = spaces.length - 1; i >= 0; i--) {
      const space = spaces[i]!
      if (box.w > space.w || box.h > space.h) continue
      box.x = space.x
      box.y = space.y
      height = Math.max(height, box.y + box.h)
      width = Math.max(width, box.x + box.w)

      if (box.w === space.w && box.h === space.h) {
        const last = spaces.pop()!
        if (i < spaces.length) spaces[i] = last
      } else if (box.h === space.h) {
        space.x += box.w
        space.w -= box.w
      } else if (box.w === space.w) {
        space.y += box.h
        space.h -= box.h
      } else {
        spaces.push({ x: space.x + box.w, y: space.y, w: space.w - box.w, h: box.h })
        space.y += box.h
        space.h -= box.h
      }
      break
    }
  }

  return {
    width: Math.max(1, width - padding),
    height: Math.max(1, height - padding),
    sprites: boxes.map((b) => ({ ...b.sprite, x: b.x, y: b.y })),
  }
}

export async function buildSpriteSheet(inputs: SpriteInput[], padding: number): Promise<PackResult> {
  const packed = potpackSprites(inputs, padding)
  const canvas = document.createElement('canvas')
  canvas.width = packed.width
  canvas.height = packed.height
  const ctx = canvas.getContext('2d')!

  for (const sp of packed.sprites) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Failed to draw ${sp.name}`))
      el.src = sp.dataUrl
    })
    ctx.drawImage(img, sp.x, sp.y, sp.width, sp.height)
  }

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
  })

  const frames: Record<string, { x: number; y: number; w: number; h: number }> = {}
  const cssLines = ['.sprite { background-image: url("spritesheet.png"); background-repeat: no-repeat; display: inline-block; }']
  for (const sp of packed.sprites) {
    const key = sp.name.replace(/\.[^.]+$/, '')
    frames[key] = { x: sp.x, y: sp.y, w: sp.width, h: sp.height }
    const cls = key.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    cssLines.push(
      `.sprite-${cls} { width: ${sp.width}${PX_UNIT}; height: ${sp.height}${PX_UNIT}; background-position: -${sp.x}${PX_UNIT} -${sp.y}${PX_UNIT}; }`,
    )
  }

  return {
    width: packed.width,
    height: packed.height,
    sprites: packed.sprites,
    pngBlob,
    previewUrl: URL.createObjectURL(pngBlob),
    jsonAtlas: JSON.stringify({ meta: { image: 'spritesheet.png', size: { w: packed.width, h: packed.height } }, frames }, null, 2),
    cssAtlas: cssLines.join('\n'),
  }
}

export function generateSampleSprites(): SpriteInput[] {
  const specs = [
    { name: 'coin.png', w: 48, h: 48, color: 'rgb(214, 158, 46)', label: 'C' },
    { name: 'shield.png', w: 64, h: 64, color: 'rgb(34, 87, 166)', label: 'S' },
    { name: 'heart.png', w: 48, h: 48, color: 'rgb(196, 77, 45)', label: 'H' },
    { name: 'gem.png', w: 56, h: 56, color: 'rgb(36, 110, 72)', label: 'G' },
    { name: 'banner.png', w: 96, h: 48, color: 'rgb(52, 58, 68)', label: 'B' },
  ]
  return specs.map((s, idx) => {
    const canvas = document.createElement('canvas')
    canvas.width = s.w
    canvas.height = s.h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = s.color
    ctx.fillRect(0, 0, s.w, s.h)
    ctx.fillStyle = 'rgb(250, 249, 245)'
    ctx.font = 'bold 16pt sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.label, s.w / 2, s.h / 2)
    return {
      id: `sample-${idx}`,
      name: s.name,
      width: s.w,
      height: s.h,
      dataUrl: canvas.toDataURL('image/png'),
    }
  })
}

export async function loadSpriteFile(file: File): Promise<SpriteInput> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(`Invalid image ${file.name}`))
    el.src = dataUrl
  })
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    width: img.naturalWidth || 48,
    height: img.naturalHeight || 48,
    dataUrl,
  }
}
