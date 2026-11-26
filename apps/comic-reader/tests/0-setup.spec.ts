import { expect, test } from '@playwright/test'

import { existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The locked acceptance spec writes test-comic.cbz into this directory but does not
// create the directory itself. Ensure it exists before any acceptance test runs so
// the spec's beforeAll writeFileSync succeeds. This file sorts ahead of the
// acceptance spec, so its beforeAll runs first in the single-worker pool.
const FIXTURES = join(tmpdir(), 'comic-reader-acceptance')

test.beforeAll(() => {
  mkdirSync(FIXTURES, { recursive: true })
})

test('[A0] fixture directory exists for the acceptance run', () => {
  expect(existsSync(FIXTURES), 'fixture directory is present').toBe(true)
})
