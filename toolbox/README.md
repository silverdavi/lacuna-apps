This is the snapshot apps build against.

Import `@lacuna/ui`. The code is in `ui/`: `tokens.css`, `tokens/brand.css`, `ui.css`, presentational components (buttons, cards, tables, fields, icons, the mark, breadcrumbs, a resizable panel), and the app kit (`kit.tsx`, `kit.css`): the page frame `AppShell`, the right rail, list rows, select, checkbox, and the error state. `behavior.tsx` is the primary action, the 24px hit target, the focus ring, and `EmptyState` (`actionLabel`). `adopt.tsx` is the one-line mount for an app that still has its own page. `ui/KIT.md` lists every component and token an app may use. `modules.json` is the catalog `schema/validate.mjs` reads when it checks a manifest.

An app loads the look with one line in `src/main.tsx`: `import '@lacuna/ui/base.css'`. That brings the fonts, the tokens, the UI classes and the kit. Color, type, spacing, radius, shadow, and motion come from the tokens.

The fonts are bundled in `fonts/`, so an app never requests a font CDN and works offline: Newsreader, Public Sans, and Spline Sans Mono, each under the SIL Open Font License 1.1 (`fonts/OFL-*.txt`).
