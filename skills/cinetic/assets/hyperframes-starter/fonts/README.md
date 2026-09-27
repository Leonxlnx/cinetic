# fonts/

Every face the film uses ships here as a local `.woff2`, declared with `@font-face` in the file that uses it (inside the `<template>` for an act in `compositions/`).

Why local:
- HyperFrames embeds a small set of common families and silently aliases other well-known system names to one of them, so a family you name but don't ship can render as a different face with no warning.
- A hosted web-font link is fetched at build time and fails when the render runs offline.
- `hyperframes lint` reports `font_family_without_font_face` for any family it cannot resolve.

The starter uses one variable sans, Geist, as a stand-in: its `@font-face` block in `index.html` carries a `cinetic:placeholder` marker, and `lint-film.mjs` fails until you choose the family for this brand's personality (`references/brand-and-color.md` §2 in the skill) and delete the marker. `npm install` runs `setup.mjs`, which copies the face here from its `@fontsource-variable/*` package:

```
fonts/geist-latin-wght-normal.woff2   <-  node_modules/@fontsource-variable/geist/files/
```

To swap the family, or to add a mono (for code or tabular numbers):
1. `npm i -D @fontsource-variable/newsreader` (or the brand's package; the file is `files/<name>-latin-wght-normal.woff2`).
2. Add a line to `COPIES` in `setup.mjs`, e.g. `['node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2', 'fonts/newsreader-latin-wght-normal.woff2']`, then run `node setup.mjs`.
3. Add its `@font-face` block and use the family name literally in `font-family` (lint cannot see through `var(...)`).

For brand-supplied fonts, convert them to `.woff2` (for example `fonttools ttLib.woff2 compress Brand.ttf`, which needs the `brotli` module) and put them here directly. A variable font needs one `@font-face` with a weight range (`font-weight: 100 900`); static fonts need one block per weight. Keep each family's licence file next to its fonts when you hand the project on.

`bash scripts/hf-finish.sh` refuses to render when an `@font-face` `url(...)` points at a missing file, because the fallback face would otherwise ship silently.
