# Brand kits: a supplied logo, colours, fonts and screenshots

When the user supplies a brand, the film is built from it: the real logo assembles, the brand's colours are the
palette, the brand's typeface sets the copy, the product's own screens become live UI. The house taste covers only
what the kit leaves out. This page is the intake (`scripts/brand.py`), the rules a supplied brand keeps, the logo
devices and the deck on a brand.

Contents: 1. Intake · 2. Colours · 3. Fonts · 4. Logo · 5. Screenshots and photos · 6. The deck on a brand ·
7. Logo devices · 8. Checks

## 1. Intake

```
python3 scripts/brand.py <kit folder or files> [--name "Product"] [--colours colours.json] [--accent '#…']
                         [--font "Family"] [--font-file f.woff2 ...] [--project films/x] [--dry-run]
bash scripts/new-film.sh films/x --brand <kit>        (the same, at scaffold time)
python3 scripts/brand.py --check                     (after an edit)
```

It writes `brand/brand.json` (what was supplied and how each role was mapped), `src/brand/tokens.ts` (the colour
block marked `cinetic:brand-supplied`), `src/brand/logo.ts` (the logo's parts), `src/brand/identity.ts` (the name),
vendored fonts and `src/brand/assets.ts` (screenshots and photos). Record the supplied brand in `BRIEF.md`: the
critics read it, and it is why a supplied serif wordmark or a supplied orange is not a fault.

## 2. Colours

From a colours file (JSON keys, CSS custom properties, text, a GIMP palette: names such as primary, accent,
background, surface, text give the roles) or `--accent`; with none, measured from the logo and the screenshots. The
accent is the named one or the most chromatic.

- **The kit's own greys and papers are the grounds.** Paper, soft panels, hairlines, secondary text, the slate and the
  raised surfaces each take a supplied neutral at their lightness first; what the kit leaves out is derived at the
  recipe's lightness on the kit's neutral (its greys' hue, chroma no higher than theirs and 0.025; plain grey when it
  has none), never at the accent's hue. A ground at the accent's hue turns a one-accent brand into a wash of its own
  colour (a cobalt brand on cobalt grounds).
- **One accent.** A second brand hue is recorded for product UI states and imagery, never as a second accent. The
  accent keeps to its share of the picture (`references/brand-and-color.md`).
- **Supplied colours skip the house colour bans** and are checked only for contrast (statements 7:1 on the stage the
  brand plays: paper for a light brand, the brand's ink for a dark one, or the accent lifted on the slate; the accent
  3:1 on it) and the one-accent rule. Each marker says what the kit supplied:
  `// cinetic:brand-supplied the kit colour background`.

## 3. Fonts

Licensed files are vendored into `src/brand/fonts/<family>/` with an `@font-face` sheet (upright faces only; the
family and weight come from the font's own tables); a Google font name is vendored with
`node scripts/add-font.mjs <name> --brand-supplied`. The brand's typeface takes the dealt direction's weights and case.
A supplied serif or italic is the brand's identity and passes the type bans (`cinetic:brand-supplied`).

## 4. Logo

SVG preferred (parsed into parts for `LogoMark`, `AssembledMark` and the lockup), PNG accepted (placed whole, moved
by the camera and masks only). A logo with live text gets a note to outline it (`scripts/outline-text.py`). The
originals stay in `brand/logo/`. A supplied logo retires the starter mark's stand-in notice; the sample mark stays as
`LogoMark`'s fallback.

`logoParts(svgText, { split: 'leaves' | 'top' | 'ids' })` (`src/brand/Mark.tsx`) parses paths, rects, circles,
ellipses, polygons and lines inside groups with transforms and class or inline styles, normalises the viewBox into a
100-unit box (aspect kept, centred), and returns each part with its paths, fills, box and centre.
`<LogoMark logo size poses fill only />` draws it part by part; `pathPolys()` turns a part into footprints for a
relief (the mark cast as blocks under the key, assembling with shadows). Parts with holes extrude as solid footprints.

Never redraw a supplied logo, never change its proportions or colours, never add a glow or bevel to it. Move its real
parts.

## 5. Screenshots and product photos

Copied into `public/brand/` and listed in `src/brand/assets.ts`. Rebuild screenshots as live UI with the product kit
at film size (every web size ×1.9, nothing under 36 px; `references/product-ui.md`): a rebuilt screen can press,
count, scroll and change state on its beat. Where a screen cannot be rebuilt, the image itself only moves under the
camera (push, pan, a mask, a loupe), never squashed or animated as if it were live. Product photos are graded with
the film's imagery (`references/imagery.md`).

## 6. The deck on a brand

`python3 scripts/deck.py ... --brand brand/brand.json [--keep palette,type]` maps the dealt palette's ground / ink /
accent roles and proportions onto the brand:

- ground: the brand's own grey or paper where one sits within 0.12 L of the recipe's ground, else the recipe's
  lightness on the brand's neutral (never at the accent's hue, chroma at most 0.025);
- a colour world takes a second brand colour (30° or more from the accent) near its lightness, else a neutral ground
  at that lightness with a note;
- ink: the brand neutral with the most contrast when it holds 7:1, else the recipe's ink on the brand's neutral;
- accent: always the brand's. When the dealt palette cannot hold the brand accent at 3:1, the sheet moves to the
  direction's palette that can and says why.

The direction's world, light, camera, signature and lockup kind stay: a brand changes the colours and type of a
direction, not its idea.

## 7. Logo devices (`fx/Wordmark`, `brand/Mark`)

The lockup is the film's own device: the last move of the story's object lands as the mark (the element that rose in
the relief becomes the mark's accent part; the stepped collage settles into the wordmark), lit by the key, off-centre
or as a crop of the last plane. Never a mark, a wordmark and a tagline centred over a radial glow
(`end-card-template` warns).

- **Assemble.** `assembleState(frame, { parts: [{ from: edge | [dx, dy], at, dur, curve: 'stop' | ease, distance,
  lead, pop }] })` and `assembleFor(logo, { start, x, y, size })` (a house plan: alternating edges, uneven gaps of
  about 4/3/3/7/7/4 f at 24 fps, long thin parts as constant-speed stripes that stop dead, other parts front-loaded,
  details under 3 % of the mark pop last). `assembleFrames()` gives onsets, landing frames and the build's length.
  `<AssembledMark logo parts x y size />`.
- **Lockup.** `lockupState(frame, { at, shrink, snap, settle, slide, wordmark })`: a short ease-in shrink, a snap to
  half size in one frame on the hit, a settle ×0.68, then the slide (`M.lockup`, about 40 f at 60 fps, peak speed past
  the middle) while the name rises in from the slide's middle; then the lock (the one held frame run of the film).
  `lockupFrames()`, `<Lockup />`. The snap is declared (one sample on it).
- **Swing.** `swingState(frame, { at, from, to, back, backFrames, spring, scaleFrom, tau, recede, spin })`: an
  anticipation back-swing (about 16° over 2 f at 24 fps) into the one logo spring (`SPR.logoSwing`, 15-18 % over),
  scale falling exponentially, then a slow recede and an optional slow turn that keeps the held mark alive.
- **Hot glyphs.** `hotGlyphState(frame, i, { start, every, born?, peak?, accent, ink, hold, cool })`: letters arrive
  on a grid (house every 6 f) at the accent and cool to ink (house 44 f). `<HotGlyphs />`.
- **Tracking.** `trackingState(frame, { at, from, to, frames })` (house +0.032 em → 0 over 10 f): a wordmark
  tightening into place; a tracking collapse (5 f, cubic-in) as an exit.
- More lockups in the device book: [logo and end card](devices/logo-and-end-card.md).

## 8. Checks

- `brand.py --check` (contrast on the brand's stage, the one-accent rule, `palette.py --check-tokens`).
- `lint-film.mjs`: every supplied colour or banned look carries `cinetic:brand-supplied <what>`; `accent-count` still
  applies (the brand's colour is the one accent).
- `look-audit.py --tokens src/brand/tokens.ts` (or `--brand '#…,#…'`) lets supplied colours pass the banned-hue check.
- The critics read `BRIEF.md`'s brand lines and `brand/brand.json`.
