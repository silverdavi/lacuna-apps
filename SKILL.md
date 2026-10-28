---
name: lacuna-app-community-app
description: Build guide for "Community app", a Lacuna app. Use when writing, testing, or preparing Community app for submission. It names the toolbox modules to use, the identity rules the app must follow, the manifest to fill, and the checks it must pass.
---

# Build Community app on Lacuna

Generated 2026-10-28 from toolbox catalog v1 by `platform/skills/generate-skill.mjs`. Regenerate it if the idea or the module list changes.

In this repository, start from `template/`. Import UI from `@lacuna/ui` (the `toolbox/` snapshot). Use tokens for color and type. Do not call the network. Do not use `eval`, `new Function`, or a remote script. `pnpm install && pnpm check` inside `template/` runs the manifest validator and the hex/px lint.

## The idea

A small shelf app. One list of items. Shared buttons and cards. Token colors and type.

| Field | Value |
|---|---|
| App id | `com.example.community-app` |
| Launcher name | Community app |
| Category | `productivity` |
| Relationship | `standalone` |
| Maintainer | Your name (third-party) |
| Price | Free. No in-app purchases, no ads. |

Relationship kinds: `standalone` is its own tile and listing. `family-member` joins the app family anchored by a parent app: it opens inside the parent's window and "Open with" menus and is listed in the parent's "Also in this family" row. `iteration-of` is a variant of a parent for another audience or configuration and works on the parent's record kinds. An app family is not a catalog suite; the suite is the `category`.

### Existing apps nearby

No registered app shares this app's capability modules or record kinds. Standalone is the default.

## What Lacuna already gives you

Lacuna is one identity under many profiles and spaces. Your app is a view and workflow over records the platform already governs. Do not build any of the following yourself: sign-in, user accounts, organizations, roles, sharing links, permission checks, contact lists, notifications, audit logs, or file storage. The host provides them, and the envelope around each record says who owns it and who may act on it.

Rules for the AI writing this app:

1. Import UI from the toolbox modules below. Do not write a parallel button, card, table, toolbar, or icon.
2. Read colors, type sizes, spacing, radii, shadows, and motion only from tokens (`var(--ink)`, `calc(13.5px * var(--tf))`, `calc(8px * var(--sf))`). Never write a hex value or a pixel font size.
3. Store data as records through the records API. Share by grant. Never copy another app's record into your own storage.
4. Do not call the network. If a feature truly needs an outside service, declare the origin in the manifest with a one-paragraph justification and expect review to ask about it.
5. The app must be useful with no AI model. If you add a model-backed feature, it is optional and off by default.
6. Do not generate or evaluate code at runtime (`eval`, `new Function`, remote scripts).
7. When you are unsure whether a module does something, read its source path in the table below instead of guessing, and leave a `TODO(toolbox)` note where a module is missing a function you need.

## Toolbox modules to use

| Module | Layer | Status | Why it is here | Use it for | Source today |
|---|---|---|---|---|---|
| `@lacuna/tokens` `^0.1.0` | 0 Design tokens | partial | base | Semantic color, type-ramp, spacing, radius, shadow, and motion tokens plus the theme knobs (appearance, type scale, density, font set, layout, colorway, contrast, motion). | `toolbox/ui/tokens.css`<br>`toolbox/ui/tokens/brand.css` |
| `@lacuna/ui` `^0.1.0` | 1 UI primitives and shell | exists | base | Presentation primitives: Title, Body, MonoLabel, Button, Card, Chip, Tag, Pills, Tabs, Table, Kpi, Avatar, layout helpers (Cols, Stack, Spread), ResizablePanel, and the ICONS family. | `toolbox/ui/index.tsx`<br>`toolbox/ui/icons.tsx`<br>`toolbox/ui/ui.css` |

### Modules that are not published packages yet

Only `@lacuna/ui`, `@lacuna/doc`, `@lacuna/formats`, `@lacuna/convert`, `@lacuna/units`, `@lacuna/preview`, `@lacuna/docx`, `@lacuna/pdf`, `@lacuna/image`, `@lacuna/video`, `@lacuna/math`, `@lacuna/calc`, `@lacuna/forms`, and `@lacuna/model` are real packages today, and a partial one may still keep some of its code elsewhere. Keep every toolbox call behind one adapter file per module (`src/toolbox/<module>.ts`) so that moving to the published package changes one import per module.

- `@lacuna/tokens` is **partial**: the code exists at `app/packages/ui/src/tokens.css`, `app/packages/ui/src/theme.tsx`, `brand/tokens.css`, `brand/tokens/tokens.css`. Two token sets with different prefixes (--lacuna-* in brand/, --ink/--paper in packages/ui) mirrored by hand.

## Build target today

Third-party apps run in a cross-origin sandboxed iframe and reach Lacuna only through the host API (`hostApi ^1.0.0`): records, grants, boxes, and the file picker. You submit source, not a bundle. Lacuna builds it from `source.repository` at the submitted commit and serves the output from a separate app domain, so the reviewed code is the shipped code.

The sandbox runtime, the host API, and the submission endpoint do not exist yet. Until they do:

1. Copy `template/` and run `pnpm install && pnpm build` from a clean checkout. Commit the lockfile.
2. Import `@lacuna/ui` from `toolbox/`. Do not paste a second stylesheet of colors. Tokens only: `var(--ink)`, `calc(13.5px * var(--tf))`, `calc(8px * var(--sf))`.
3. Put every host call behind `src/host/` and mock it in `src/host/mock.ts` with fictional fixtures. Never use real personal data. Do not rely on cookies, `window.parent`, or `window.top`. The sandbox gives the app its own origin.
4. Set `entry.bundle` to `dist/index.html`, not a URL, and `source.repository` to the repository Lacuna will build. Do not call the network. Do not use `eval` or `new Function`.
5. Keep the manifest valid. From the repository root, `node schema/validate.mjs path/to/lacuna.app.json`.

## Identity rules

These come from `brand/guidelines/BRAND-GUIDELINES.md`, `app/packages/ui/DESIGN-GUIDELINES.md`, `app/packages/ui/VISUAL-SYSTEM.md`, and `app/scripts/naming-lint.cjs`. Review rejects an app that breaks them.

- **Tokens only.** Semantic tokens from `@lacuna/tokens`. If a color you need does not exist, ask for it in the submission notes.
- **Closed type ramp.** Base sizes 8, 9, 10.5, 12, 13.5, 15, 18, 22, 26, each multiplied by `var(--tf)`.
- **Spacing snaps to 4, 8, or 16**, multiplied by `var(--sf)`.
- **Font roles.** `var(--serif)` for record content and display names, `var(--sans)` for interface chrome, `var(--mono)` for status, breadcrumbs, and metadata. No other families.
- **Elevation.** `var(--shadow)` or `var(--shadow-active)`, a hard offset with no blur. No blurred shadows, gradients, or glow.
- **Icons.** One glyph from the `ICONS` family on a flat plate with a 1 px border. The plate hue comes from your category; you do not pick it. A new glyph is a design request, not a pasted SVG or emoji.
- **One accent per region.** Rust (`--accent`) marks the active item, the primary action, or the main number, once per region.
- **Naming register.** The app name and every record name is a noun phrase or an imperative, four words or fewer, no colon, no leading "A", "An", or "The", no "that" or "which" clause, and no words like guided, scenario, walkthrough, journey, or story. Record names are content names ("Lease, 44 Alder St.", "Week 31 close"). Metadata lines are quiet facts ("Due Aug 15").
- **Apps open as apps.** Your route `/app/community-app` opens the real surface: app bar, file rail of content-named records, the editor for the open record, and the context panel. Tours are optional.
- **Access is visible.** The context panel shows the record's envelope and access panel. Every denial states the reason, its scope, and a next action.
- **Motion** is 120 ms or less, with no spring and no bounce. Selection is an inverted fill or a 1 px border.
- **Knobs.** The app must look right in light and dark, compact and full density, and type scale S through 3XL. Check it in `/theme-lab`.
- **The mark** is never redrawn, recolored, or animated by an app.

## Data, permissions, and sharing

Record kinds this app works with:

- `community-app`: read, write, create. Own Community app records.

At runtime the app gets the intersection of three things: what the manifest declares, what the acting profile is granted, and what the space administrator allows. Declare the smallest set that makes the app work. Asking for more slows review and shows up on the install screen.

Third-party apps may not request `health`, `child`, `legal-privileged`, `government-id`, or `biometric` data in this phase. If the idea needs them, it has to wait or become a first-party app.

Hand-offs go through capabilities, not app ids. To send a record to be signed, request `sign:doc` and let the host pick the app the person uses.

## Manifest to fill

Save this as `lacuna.app.json` at the root of the app. The generator guessed `summary`, `tags`, `icon`, `capabilities`, and `availability` from the idea; correct them before building. Keep `pricing` as is, because the store is free-only at launch; paid apps come in a later phase.

```json
{
  "manifestVersion": 1,
  "id": "com.example.community-app",
  "name": "Community app",
  "version": "0.1.0",
  "summary": "A small shelf app.",
  "description": "A small shelf app. One list of items. Shared buttons and cards. Token colors and type. Copy this starter, rename the id, and keep the manifest valid.",
  "category": "productivity",
  "tags": [],
  "icon": "docs",
  "relationship": {
    "kind": "standalone"
  },
  "maintainer": {
    "type": "third-party",
    "name": "Your name",
    "contact": "you@example.com"
  },
  "pricing": {
    "model": "free",
    "inAppPurchases": false,
    "ads": false
  },
  "maturity": "demo-guided",
  "entry": {
    "type": "bundle",
    "route": "/app/community-app",
    "bundle": "dist/index.html"
  },
  "requires": {
    "hostApi": "^1.0.0",
    "modules": {
      "@lacuna/tokens": "^0.1.0",
      "@lacuna/ui": "^0.1.0"
    }
  },
  "capabilities": [
    "edit:community-app"
  ],
  "permissions": {
    "records": [
      {
        "kind": "community-app",
        "access": [
          "read",
          "write",
          "create"
        ],
        "purpose": "Own Community app records"
      }
    ],
    "platform": [
      "identity.profile.read",
      "files.pick",
      "files.save"
    ],
    "network": {
      "origins": []
    },
    "dataClasses": [],
    "availability": {
      "spaceTypes": [
        "any"
      ]
    }
  },
  "sharing": {
    "owns": [
      "community-app"
    ],
    "reads": [],
    "handoffs": []
  },
  "quality": {
    "tests": [
      "tests/community-app-open-and-reload.spec.ts",
      "tests/edit-community-app.spec.ts",
      "tests/community-app-denied-action.spec.ts"
    ],
    "themeMatrix": true,
    "keyboardOnly": true,
    "accessibilityScan": "axe",
    "worksWithoutNetwork": true
  },
  "source": {
    "repository": "https://github.com/silverdavi/lacuna-apps",
    "license": "MIT"
  }
}
```

Validate it:

```bash
node schema/validate.mjs path/to/lacuna.app.json
```

Errors block submission. Warnings about unpublished modules mean the app cannot ship until those modules exist.

## Tests the app must ship with

- `tests/community-app-open-and-reload.spec.ts`: create a record, edit it, reload, and find the edit; open it again by id from `/app/community-app/:recordId`.
- `tests/edit-community-app.spec.ts`: change a community-app record and see the change survive reload.
- `tests/community-app-denied-action.spec.ts`: a profile without a grant sees a denial with a reason and a next action, and the record's existence does not leak.
- Theme matrix: light and dark, compact and full, type scale S and 3XL (screenshots attached).
- Keyboard only: every action reachable, focus visible, Escape closes dialogs.

Put tests next to the app. `pnpm check` runs `schema/validate.mjs` and the hex/px lint.

## Submission checklist

- [ ] `lacuna.app.json` passes `node schema/validate.mjs` with no errors.
- [ ] The app name passes the naming register (the validator checks it). Record names pass too: inside the monorepo, route them through `app/apps/demo/src/naming.ts` so `pnpm lint:naming` covers them.
- [ ] No hex colors, literal font families, or pixel font sizes outside tokens (search the source for `#` followed by hex digits and for `px` without `var(--tf)` or `var(--sf)`).
- [ ] Every listed test passes locally.
- [ ] Theme matrix checked: light and dark, compact and full, type scale S and 3XL.
- [ ] Every action works from the keyboard; focus returns where it started after a dialog closes.
- [ ] An accessibility scan (axe or equivalent) reports no serious issues.
- [ ] No network calls except declared origins; no `eval` or remote scripts.
- [ ] The app works with no AI model configured.
- [ ] Records open by id from `/app/community-app/:recordId`, survive reload, and show their envelope.
- [ ] Denied actions show a reason and a next action instead of failing silently.
- [ ] Screenshots of the main surface in light and dark are attached to the submission.
