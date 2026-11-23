// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// The app's one host: in the shelf it is the mock below; in Lacuna it will be the host API.
// The app code only talks to this interface, so the two swap without touching the UI.
import { createHost, type Clip, type Host, type Settings } from './mock'

export type { Clip, Host, Settings }

const host: Host = createHost()

export const clips = host.clips
export const settings = host.settings
