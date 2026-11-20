import { readImage, writeImage, type ImageRecord } from './mock'

export function loadImage(): ImageRecord | null {
  return readImage()
}

export function saveImage(record: ImageRecord): void {
  writeImage(record)
}
