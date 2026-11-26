// Data colors for palette swatches. Kept here so App.tsx stays free of color literals.
export const WHITE: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }

export const PALETTE_COLORS: Record<string, string[]> = {
  Complementary: ['#00FF00', '#FF00FF', '#808080', '#000000'],
  Analogous: ['#0080FF', '#FF00FF', '#808080', '#000000'],
  Triadic: ['#00FFFF', '#FFFF00', '#808080', '#000000'],
}
