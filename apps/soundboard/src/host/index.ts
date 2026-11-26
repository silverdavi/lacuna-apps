// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createSoundboardHost, type SoundboardHost } from './mock'

export type { Clip, Scores } from './mock'

let host: SoundboardHost | null = null

export function getHost(): SoundboardHost {
  if (!host) host = createSoundboardHost()
  return host
}
