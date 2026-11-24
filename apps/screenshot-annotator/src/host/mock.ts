import { useLocalRecord } from '@lacuna/use-local-record'
import type { AnnotationState } from './index'

export const DEFAULT_STATE: AnnotationState = {
  image: null,
  imageName: null,
  imageWidth: 0,
  imageHeight: 0,
  layers: [],
  rotation: 0,
  flipped: false,
}

export function useAnnotation() {
  return useLocalRecord<AnnotationState>({
    key: 'lacuna.screenshot-annotator',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })
}
