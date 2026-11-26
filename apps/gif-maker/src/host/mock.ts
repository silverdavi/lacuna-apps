// Local persistence for the gif-project record, built on @lacuna/use-local-record.
import { useLocalRecord } from '@lacuna/use-local-record'
import { GIF_PROJECT_DEFAULT, type GifProject } from './index'

const RECORD_KEY = 'lacuna.gif-maker.project'

export function useGifProject() {
  return useLocalRecord<GifProject>({
    key: RECORD_KEY,
    version: 1,
    defaultValue: GIF_PROJECT_DEFAULT,
  })
}
