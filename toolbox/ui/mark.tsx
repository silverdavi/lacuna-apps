/**
 * Official Lacuna mark (brand/logos/lacuna-mark.svg).
 * 3×3 grid: colored L (coral→amber→teal→violet) + ink counters; center open with dot.
 * Below 24px the dot is dropped (favicon / dense chrome) — brand guidelines.
 * `ink`/`accent` retained for call-site compat; L colors are fixed brand property.
 */
export function Mark({ size = 18, ink = 'currentColor' }: { size?: number; ink?: string; accent?: string }) {
  const showDot = size >= 24
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ flexShrink: 0, display: 'block', color: 'var(--ink)' }}
      aria-hidden
    >
      <rect x="0" y="0" width="18" height="18" fill="#F06449" />
      <rect x="0" y="23" width="18" height="18" fill="#F2A33C" />
      <rect x="0" y="46" width="18" height="18" fill="#2EB8A6" />
      <rect x="23" y="46" width="18" height="18" fill="#7C6FE8" />
      <rect x="23" y="0" width="18" height="18" fill={ink} />
      <rect x="46" y="0" width="18" height="18" fill={ink} />
      <rect x="46" y="23" width="18" height="18" fill={ink} />
      <rect x="46" y="46" width="18" height="18" fill={ink} />
      {showDot && <circle cx="32" cy="32" r="2.5" fill={ink} />}
    </svg>
  )
}
