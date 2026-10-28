// Truncated labels keep their layout and reveal the full string on hover.
// The popover is attached to document.body so overflow:hidden rails cannot clip it.
import { useEffect, useRef, useState, type CSSProperties } from 'react'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Line-clamp boxes report scrollHeight === clientHeight, so measure the unclamped text. */
function overflows(el: HTMLElement, lines: number): boolean {
  if (el.scrollWidth > el.clientWidth + 1) return true
  if (lines === 1) return false
  const cs = getComputedStyle(el)
  const probe = document.createElement('span')
  probe.textContent = el.textContent
  probe.style.cssText = [
    'position:fixed', 'left:-9999px', 'top:0', 'visibility:hidden',
    `width:${el.clientWidth}px`,
    `font:${cs.font}`,
    `letter-spacing:${cs.letterSpacing}`,
    `line-height:${cs.lineHeight}`,
    'white-space:normal',
    'display:block',
  ].join(';')
  document.body.appendChild(probe)
  const full = probe.getBoundingClientRect().height
  probe.remove()
  return full > el.clientHeight + 1
}

export function HoverLabel({
  text,
  lines = 1,
  className,
  style,
}: {
  text: string
  /** 2 clamps to two lines (folder and tile names). 1 ellipsizes on one line. */
  lines?: 1 | 2
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [box, setBox] = useState<{ x: number; y: number } | null>(null)

  const open = () => {
    const el = ref.current
    if (!el) return
    if (!overflows(el, lines)) return
    const r = el.getBoundingClientRect()
    const width = Math.min(320, window.innerWidth - 16)
    const x = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    const below = r.bottom + 6
    const y = below + 44 > window.innerHeight ? Math.max(8, r.top - 36) : below
    setBox({ x, y })
  }

  const close = () => setBox(null)

  useEffect(() => {
    if (!box) return
    const hide = () => setBox(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    const node = document.createElement('div')
    node.className = 'lc-hoverpop'
    node.setAttribute('role', 'tooltip')
    node.textContent = text
    node.style.left = `${box.x}px`
    node.style.top = `${box.y}px`
    document.body.appendChild(node)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      node.remove()
    }
  }, [box, text])

  return (
    <span
      ref={ref}
      className={cx('lc-hoverlabel', lines === 2 && 'lines-2', className)}
      style={style}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {text}
    </span>
  )
}
