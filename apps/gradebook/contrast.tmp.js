function srgb(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
function L(rgb) { return 0.2126 * srgb(rgb[0] / 255) + 0.7152 * srgb(rgb[1] / 255) + 0.0722 * srgb(rgb[2] / 255) }
function p(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) }
function R(fg, bg, a) {
  if (a === undefined) a = 1
  const F = p(fg), B = p(bg)
  const M = [0, 1, 2].map(i => Math.round(F[i] + (B[i] - F[i]) * a))
  const f = L(M), b = L(B)
  const hi = Math.max(f, b), lo = Math.min(f, b)
  return (hi + 0.05) / (lo + 0.05)
}
for (const [name, bg] of [["paper", "#F4EFE6"], ["card", "#FBF8F1"], ["white", "#FFFFFF"], ["dark-bg", "#151D21"], ["dark-card", "#1C2529"]])
  console.log(name, "| ink-60:", R("#1A1A1A", bg, 0.62).toFixed(2), "| ink-80:", R("#1A1A1A", bg, 0.82).toFixed(2), "| ink:", R("#1A1A1A", bg).toFixed(2), "| mid:", R("#6B6257", bg).toFixed(2), "| mute:", R("#8A8177", bg).toFixed(2))
