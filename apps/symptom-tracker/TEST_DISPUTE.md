# Disputed locked test: lacuna-apps/symptom-tracker

Spec: /home/agent/specs/lacuna-apps/symptom-tracker.md
Branch: agent/symptom-tracker (worktree: /home/agent/worktrees/lacuna-apps/symptom-tracker)

Supersedes the 2026-11-21 dispute for this app; both defects below were
re-verified on 2026-11-25 against the current lock recorded in
`apps/symptom-tracker/acceptance.json` — including a direct runtime probe in
this session: on the pinned Playwright Chromium, a context granted only
`['clipboard-read']` rejects `navigator.clipboard.writeText('direct-probe')`
with `NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Write
permission denied`, and a subsequent `navigator.clipboard.readText()`
resolves to `""`.

## [A8] export copies a CSV of the logged entries — unsatisfiable

`tests/acceptance.spec.ts:101-113` grants only `clipboard-read`:

```ts
await context.grantPermissions(['clipboard-read'])
...
await page.getByRole('button', { name: 'Export CSV' }).click()
const csv = await page.evaluate(() => navigator.clipboard.readText())
expect(csv).toContain('Date,Symptom,Severity')
```

No app code can satisfy this. The repo's own `@lacuna/use-clipboard` module
(`toolbox/modules/use-clipboard/0.1.0/src/useClipboard.ts:60`) writes with
`navigator.clipboard.writeText`, and every other app in the repo that
exports to the clipboard uses the same API. In the pinned Playwright
Chromium, `writeText` without the `clipboard-write` permission throws:

```
NotAllowedError: Failed to execute 'writeText' on 'Clipboard':
Write permission denied.
```

Verified in this worktree on 2026-11-25: with only `clipboard-read` granted,
a direct `navigator.clipboard.writeText('direct')` in page context fails with
the same `NotAllowedError` (probed via a throwaway spec). So the app-side
`writeText(csv)` in the Export CSV handler is rejected, the clipboard stays
empty, and `readText()` returns `""`. The comparison against other apps in
this repo confirms the intended pattern: `apps/kanban-board/tests/acceptance.spec.ts:75`
grants `['clipboard-read', 'clipboard-write']` for its A8 clipboard check;
this lock omits `clipboard-write`.

The check as specified (A8: "Export copies a CSV of the logged entries")
is implemented correctly by the app: `src/App.tsx` builds
`toCsv([['Date','Symptom','Severity'], ...])` from `@lacuna/csv-parse` and
`navigator.clipboard.writeText(csv)` in the Export CSV handler. A workable
rewrite is to grant both permissions in the test:
`await context.grantPermissions(['clipboard-read', 'clipboard-write'])`.
The test's own comment (lines 106-107) even anticipates this: "clipboard-read
is granted so the read below succeeds even though the user activation from
the click may already have expired" — it never considered that the write
itself needs its own permission.

## [A6] day detail shows the symptom logged on that day — unsatisfiable

`tests/acceptance.spec.ts:73-85` asserts:

```ts
const detail = page.getByRole('region', { name: 'Day detail' })
await expect(detail.getByText('Headache')).toBeVisible()
```

The same "Day detail" region also shows the per-entry delete control, whose
visible label is `Delete Headache` (A4 at line 60 requires exactly that
button: `page.getByRole('button', { name: 'Delete Headache' })`).
`getByText('Headache')` is a substring text match, so it resolves to two
elements inside the region:

```
1) <span class="lk-row-title">Headache</span>
2) <button type="button" class="lc-btn ghost">Delete Headache</button>
```

Playwright strict mode then rejects the assertion regardless of which
element is visible. No app can satisfy this: rendering the symptom name in
the region (required by the check) and rendering a delete button labeled
`Delete {name}` (required by A4) inside that same region are both mandatory,
and the substring match cannot be disambiguated from the app side. A
workable rewrite is to use an exact match,
`detail.getByText('Headache', { exact: true })`, or to scope the assertion
to the row text (e.g. `detail.locator('li').filter({ hasText: 'Headache' })`).

## Status

App-side work is complete: all other checks (A1–A5, A7, A9) pass, type
check, build, acceptance/reference/toolbox/design lint all pass. The two
locked tests above fail for the reasons documented here and must be amended
by the owner.
