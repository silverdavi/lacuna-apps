# Dispute: locked acceptance test A7 (clipboard read) cannot pass as written

App: `apps/period-tracker`
Evidence: `/home/agent/factory/disputes/lacuna-apps/period-tracker-20261123-234526.md`

## Status

- All 9 acceptance checks are implemented in `apps/period-tracker`; the app builds and runs.
- 8 of 9 tests pass (`A1`-`A6`, `A8`, `A9`).
- `A7` fails for a reason that is not fixable in the app: the locked test reads the
  system clipboard without granting the clipboard-read permission.

## Failing test

`apps/period-tracker/tests/acceptance.spec.ts:59` (locked, hash-verified by
`scripts/acceptance-lint.mjs` — the spec file may not be edited):

```ts
test('[A7] exporting copies the ICS to the clipboard and reports it', async ({ page }) => {
  // ... adds two periods, then:
  await page.getByRole('button', { name: 'Export ICS' }).click()
  await expect(page.getByText('Calendar exported')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text.startsWith('BEGIN:VCALENDAR')).toBe(true)
})
```

## Why the app is correct

- The Export ICS button copies the generated ICS to the clipboard through the
  `@lacuna/use-clipboard` module and shows "Calendar exported" on success.
  The test's first assertion — `Calendar exported` is visible — passes.
- The app then stores nothing it could hand back: it only writes to the
  clipboard, exactly as the check text says ("exporting copies the ICS to the
  clipboard").

## Why the test cannot pass as written

`navigator.clipboard.readText()` requires the `clipboard-read` permission. The
locked test never grants it, and `playwright.config.ts` (repo-level, also not
app-specific) grants no permissions. In the headless Chromium that `pnpm check`
uses, `readText()` therefore throws:

```
NotAllowedError: Failed to execute 'readText' on 'Clipboard': Read permission
denied.
```

Reproduced with the app in its current state:

```
$ APP=period-tracker npx playwright test apps/period-tracker/tests/acceptance.spec.ts
  1) [A7] exporting copies the ICS to the clipboard and reports it
     page.evaluate: NotAllowedError: Failed to execute 'readText' on 'Clipboard':
     Read permission denied.
  1 failed, 12 passed
```

(The `copy` side works: writing to the clipboard in a user-gesture-driven
`page.click()` does not need the grant; only the test's subsequent `readText`
does.)

## What would make it pass

The test (or the Playwright config) must grant the permission before the
evaluate, e.g. in the test:

```ts
await context.grantPermissions(['clipboard-read', 'clipboard-write'])
```

This matches what other locked specs in this repo do for clipboard reads
(e.g. `apps/bill-splitter/tests/acceptance.spec.ts`). Neither the test file nor
the shared config can be changed from this task: the spec is hash-locked, and
editing the shared `playwright.config.ts` to grant clipboard-read globally would
change behavior for every other app's tests.

## Conclusion

A7 is defective as written: it asserts a permission-gated API without granting
the permission. The app implements the check correctly. Requesting a fix to the
locked spec (or a repo-level permission grant) so the gate can pass.
