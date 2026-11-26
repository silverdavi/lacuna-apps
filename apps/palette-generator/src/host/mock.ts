import { useLocalRecord } from '@lacuna/use-local-record'

export interface PaletteState {
  base: string
  scheme: string
  swatches: string[]
}

export interface PaletteStore {
  palette: PaletteState
}

const KEY = 'lacuna.palette-generator.state'
const VERSION = 1

export function usePaletteStore() {
  const { value, set, hydrated } = useLocalRecord<PaletteStore>({
    key: KEY,
    version: VERSION,
    defaultValue: {
      palette: {
        base: '',
        scheme: 'Complementary',
        swatches: [],
      },
    },
  })
  return { palette: value.palette, set, hydrated }
}
