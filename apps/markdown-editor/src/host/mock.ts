// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockValue } from '@lacuna/host-mock'

export const docStore = createMockValue<string>({
  key: 'markdown-editor-doc',
  fallback: '',
})
