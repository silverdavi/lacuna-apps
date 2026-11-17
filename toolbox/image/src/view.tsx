// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { ViewerImpl } from '@lacuna/preview'
import { decodeImage, releaseImage, type DecodedImage } from './index'

export const imageView: ViewerImpl<DecodedImage> = {
  prepare: (file) => decodeImage(file.bytes, file.format.id),
  View: ({ data, file }) => (
    <div className="lc-fp-image" data-testid="preview-image" data-width={data.width} data-height={data.height}>
      <img src={data.url} alt={file.name} width={data.width || undefined} height={data.height || undefined} />
    </div>
  ),
  dispose: releaseImage,
}
