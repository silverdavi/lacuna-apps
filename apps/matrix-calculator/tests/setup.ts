// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Test-only configuration: the locked acceptance spec reads the clipboard without asking the
// browser for permission, so the permission is granted on every context through contextOptions.
// This file is imported by acceptance.spec.ts; test.use applies to that spec's tests only.
import { test } from '@playwright/test'

test.use({ contextOptions: { permissions: ['clipboard-read', 'clipboard-write'] } })
