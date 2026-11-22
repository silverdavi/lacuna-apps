import { useLocalRecord } from '@lacuna/use-local-record'

export interface CsvView {
  name: string
  text: string
  filter: string
}

const DEFAULT: CsvView = { name: '', text: '', filter: '' }

export function useCsvView() {
  return useLocalRecord<CsvView>({
    key: 'lacuna.csv-viewer.view',
    version: 1,
    defaultValue: DEFAULT,
  })
}
