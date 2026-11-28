# Contributing

Add an app under `apps/<slug>/`. Copy `template/` for a Vite and React starter that already imports `@lacuna/ui`. The manifest is `lacuna.app.json`. From the repository root, `node schema/validate.mjs` checks every app and the starter.

The pull request names the manifest path, attaches a light screenshot and a dark screenshot, includes a Built with line, and carries a Developer Certificate of Origin sign-off. `git commit -s` adds the sign-off. The certificate is [DCO.txt](DCO.txt). There is no CLA.

Inside `template/`, `pnpm install && pnpm check` runs the manifest validator and a lint for hex colors and for pixel sizes that are not token math (`calc(13.5px * var(--tf))`, `calc(8px * var(--sf))`).

Import UI from `@lacuna/ui` in `toolbox/`. Read color, type, spacing, radius, shadow, and motion from tokens. Do not call the network. Do not use `eval` or `new Function`.

Bugs and feature requests use the issue forms.

Apps that contain `OWNERS.md` are first-party seeds. They do not count as community contributors.

Questions that are not bug reports go in Discussions.
