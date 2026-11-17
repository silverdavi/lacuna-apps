This is the snapshot apps build against.

Import `@lacuna/ui`. The code is in `ui/`: `tokens.css`, `tokens/brand.css`, `ui.css`, and presentational components (buttons, cards, tables, fields, icons, the mark, breadcrumbs, a resizable panel). `modules.json` is the catalog `schema/validate.mjs` reads when it checks a manifest.

Color, type, spacing, radius, shadow, and motion come from the tokens. `tokens/brand.css` loads Newsreader, Public Sans, and Spline Sans Mono from `fonts/`, so apps make no font requests and work offline. The fonts are under the SIL Open Font License 1.1; the license texts are in `fonts/`.

The other folders (`calc`, `convert`, `doc`, `formats`, `forms`, `image`, `pdf`, `preview`) are workspace packages mirrored from the Lacuna monorepo by `scripts/sync-toolbox.sh`. Depend on one with `"@lacuna/<name>": "workspace:*"`. Edits made here are overwritten by the next sync; open an issue instead. `ui/` is hand-vendored and is not overwritten.
