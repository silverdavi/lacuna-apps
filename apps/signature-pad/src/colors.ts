// Data colors for the Signature Pad canvas: the selectable stroke inks.
// These are data (swatch values), not UI chrome, so they live here rather
// than as token references. 'ink' resolves to the kit's --ink at draw time.
export const INK_SWATCHES = [
  { label: 'Ink', value: 'ink' },
  { label: 'Red', value: 'rgb(214, 55, 44)' },
  { label: 'Blue', value: 'rgb(38, 86, 196)' },
  { label: 'Green', value: 'rgb(31, 143, 92)' },
] as const

export type InkValue = (typeof INK_SWATCHES)[number]['value']
