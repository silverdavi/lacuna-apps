This is the snapshot apps build against.

Import `@lacuna/ui`. The code is in `ui/`: `tokens.css`, `tokens/brand.css`, `ui.css`, and presentational components (buttons, cards, tables, fields, icons, the mark, breadcrumbs, a resizable panel). `modules.json` is the catalog `schema/validate.mjs` reads when it checks a manifest.

Color, type, spacing, radius, shadow, and motion come from the tokens. `tokens/brand.css` requests Newsreader, Public Sans, and Spline Sans Mono from Google Fonts. The font stacks name system fonts when that request does not run.
