import { useClipboard } from '@lacuna/use-clipboard'
import { Button } from '@lacuna/ui'

export type Swatch = {
  hex: string
  r: number
  g: number
  b: number
  h: number
  s: number
  l: number
  contrast: string
}

export function SwatchRow({
  swatch,
  onRemove,
}: {
  swatch: Swatch
  onRemove: () => void
}) {
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  return (
    <div className="swatch" style={{ background: swatch.hex }}>
      <div className="swatch-inner">
        <span className="swatch-hex">{swatch.hex}</span>
        <span className="swatch-hsl">{'hsl'}({swatch.h} {swatch.s}% {swatch.l}%)</span>
        <span className="swatch-contrast">Contrast: {swatch.contrast}</span>
      </div>
      <div className="swatch-actions">
        <Button kind="ghost" onClick={() => void copy(swatch.hex)}>
          {copied ? 'Copied' : 'Copy hex'}
        </Button>
        <Button kind="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  )
}
