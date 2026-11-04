# Brand and colour

Covers the brand's personality and what it decides, naming, exploring and building the mark, the lockup, the token file, the colour system (recipes, neutral grounds, one accent, colour as shares of the frame), surfaces, light on the ground, colour devices and colour in motion. Read it at Step 2, before writing `src/brand/tokens.ts` and `src/brand/Mark.tsx`, and whenever a critic flags colour or says the film looks like a template. The numbers live in `src/lib/look.ts` (`NEUTRAL`, `COLOUR`, `RECIPE`, `STAGE`, `SHADOW`, `LIGHT`, `PICTURE`); they are house defaults with normal ranges.

**Contents**
1. [When the brand is supplied](#1-when-the-brand-is-supplied)
2. [Personality → choices](#2-personality--choices)
3. [Naming](#3-naming)
4. [Exploring the mark](#4-exploring-the-mark)
5. [Mark construction](#5-mark-construction)
6. [The lockup](#6-the-lockup)
7. [The token file](#7-the-token-file)
8. [The accent](#8-the-accent)
9. [Neutrals, the recipes and the stage](#9-neutrals-the-recipes-and-the-stage)
9b. [Colour as shares of the frame](#9b-colour-as-shares-of-the-frame)
10. [Palettes that read as generated](#10-palettes-that-read-as-generated)
11. [Surfaces: the card material](#11-surfaces-the-card-material)
12. [Light on the ground and banding](#12-light-on-the-ground-and-banding)
12b. [Colour devices: gradients, spectral accents, glow and glass](#12b-colour-devices-gradients-spectral-accents-glow-and-glass)
13. [Colour in motion](#13-colour-in-motion)

---

## 1. When the brand is supplied

The brand wins. Everything below is for what you have to invent, plus the method for fitting a real brand into a film. With a kit, run `python3 scripts/brand.py <kit>` first (`references/brand-kits.md`): it maps the kit's own greys and papers onto the grounds, takes the brand accent, vendors the fonts and splits the logo into parts.

- **Colours.** Map them to roles: the kit's greys and papers become the grounds by lightness (never a ground at the accent's hue), the darkest neutral `ink`. Choose *one* brand colour as the film's accent and write down its meaning. A second brand colour is the film's support hue (§9b): in product UI states, data and imagery, beside the accent in 10–30 % of the film; never a second accent.
- **Typeface.** Use it, serif and condensed included. Ship it locally (`@font-face` or a `@fontsource-variable/*` package) and gate it with `FontGate`.
- **Supplied things the hard bans would catch** (their orange, their cream paper, their serif wordmark face) are the brand's identity, so they stay. List each one in `BRIEF.md` as a brand-supplied exception, so the critics don't flag it, and mark the lines that set it with `// cinetic:brand-supplied <what>` (in the file's leading comment it covers the whole file), so `lint-film.mjs` accepts them. `palette.py` takes `--brand-supplied` for the same reason.
- **Logo.** Use the vector file. Don't redraw or "improve" it. Find the device in its geometry (a dot, a corner, a counter, a stroke end); if there is none, the device is the accent colour itself. Build the sting by splitting the logo along its existing shapes.
- **Wordmark only.** Take the device from a letter feature: the dot of an i, a crossbar, a terminal. A letter you redraw inside the word must share the typeface's stroke weight, terminals (flat or round) and curve tension; a hand-built letter next to stock ones reads as a patch. Trace the font's own glyph (`outline-text.py` gives its path) and change only the feature that carries the idea.
- **Brand guidelines that conflict with a rule here** (a gradient in the logo, a second accent): follow the guidelines, and use the rule to limit the damage. Show the gradient only in the logo, and let the second colour appear only in UI.

## 1b. Other products' marks

A product that works with other products shows them as their owners publish them: the mail app's own four-colour
mark, the model's own spark, never a generic envelope or a star standing in. It reads as a real product at once.

- **Only what the product really touches.** A real mark appears only for what the product works with, imports from,
  runs on or names: its integrations, sources, models and platforms. Never to imply an endorsement, a partnership or a
  customer it does not have; never a mark in a slot that would read as "used by".
- **Fetched, never redrawn.** `node scripts/logos.mjs search <name>`, then `get <name> --film .`: the official colour
  files from open collections whose terms allow use (the mark, its dark-ground version, the wordmark, one-colour
  files), cleaned and trimmed to the art. The brand's official full-colour mark or app tile is taken before another
  collection's one-colour glyph or older drawing (`--source <collection>` forces one). Colours and proportions stay as published: no recolouring into the palette,
  no squeeze, no outline or effect on the mark itself. The tile, the chip and the shadow round it are the film's.
- **The newest mark, never a retired one.** Brands redraw their marks (the 2026 Google Workspace icons, the 2025
  Microsoft 365 icons, the gradient G, the X for the bird, YouTube's 2024 red) and a collection often still holds the
  old file under the brand's name. `scripts/logo-brands.json` lists, for the brands a launch film shows most, the
  current mark (the month it changed, what it looks like, the brand page it was checked against) with its
  fingerprint, the collections that carry it, and the marks and colours the brand retired. `get` takes the current
  file first, skips a retired one with a note and prints the version (`mark: the current mark: …, since 2026-05`);
  when no open collection draws the current mark it stops and names the brand page: download the file there and pass
  it with `--file` (or keep the old one knowingly with `--allow-outdated`). `logos.mjs check <film>` flags every
  retired mark in a film, in the record or placed by hand under `public/`.
- **Clear space kept.** The kit sets a mark at its optical size with room round it (`AppIcon` 54 % of the tile,
  `LogoChip` half the pill's height, `InlineLogo` 1.0 cap height); a brand's own guidelines (minimum size, clear space,
  grounds; `guidelines` in the record) win over these numbers.
- **The record, not a credit.** `public/logos/logos.json` keeps each file's source, its licence as read and the
  trademark owner; it goes into the delivery notes. Nothing is credited on screen. `logos.mjs check` passes before
  delivery (every owner named: an owner the tool does not know is confirmed on the brand's own site and passed with
  `--owner`).
- **Their colours are imagery, not the palette.** The accent rule counts the film's own colours: `look-audit.py` leaves
  out the pixels of every mark with a record in `public/logos/logos.json`, where the film draws it on each frame. The
  kit tags each mark `data-logo`, and the layout audit logs where it is, so pass `--layout` from
  `layout-audit.sh --every 6` (a mark moving from a ring into a sentence is followed); a mark drawn outside the kit
  gets a declared track (`--mark-track`). Never `--brand` for a mark's colours: that flag is the film's own brand. Marks stay marks (a ring, a wall, a ticker, a chip, a word in a
  line), never a ground or a flood.
- **One treatment per row, in the film's material.** Official colours fight a film's palette when every mark sits on
  its own: a row of marks takes ONE treatment at ONE size (`LogoRow`, `LogoTile`): `tile` (the default: each mark on a
  neutral tile in the film's card material, light on a light or mid ground, dark on a dark one, official colours at one
  optical size), `ink` (every mark in the film's ink from the brand's own one-colour file: the quietest row, for a
  monochrome or colour-field film, and only when every brand in the row publishes one; otherwise the whole row tiles),
  `bare` (official marks alone on a light page) or `chip` (mark and name on pills of one height). Never a brand's own
  colour tile among neutral tiles, never mixed sizes, never three colour marks bare on a coloured field.
  `logoRowCheck()` lists a row's faults.
- **Real marks by default where they belong.** When the product has integrations the brief asks for them (Step 0), and
  the templates' rings, walls, tickers and chips show their marks (`kit/logos.tsx`); the text pill is the fallback
  until a mark is fetched. Generic icons (`kit/icons.ts`) are for generic actions only (send, search, a lock).
- **Use the parts.** `LogoRow`, `LogoTile`, `AppIcon`, `LogoChip`, `InlineLogo`, `LogoWall`, `LogoRing`, `BrandLogo`
  (`references/product-ui.md` §5); check them on `npx remotion still KitLogos` and `KitLogoWall` at half size.

## 2. Personality → choices

Every invented brand starts from three adjectives, written in `TREATMENT.md` before any colour or face is picked. The adjectives decide the choices below; taste then refines them. Without this step every film drifts to the same cool, light, geometric-sans minimalism, which is this skill's own house style and reads as a template the second time a viewer sees it.

| Personality (three adjectives) | Look and face (`scripts/faces.json`) | Weight and case | Tracking (display) | Stage | Accent family | Corners and shapes | Motion character |
|---|---|---|---|---|---|---|---|
| **Calm, clear, unhurried** (notes, reading, journaling) | the **friendly** look: `manrope` (it runs light), or the neutral look's `inter` at a light touch | Manrope 600 display, 500 text (Inter 450–500); sentence case | −0.01 to −0.02 em | light: tinted paper (L 0.93–0.99, C ≤ 0.015) or the mid stone, a soft ink | low chroma (0.08–0.12): ink blue, moss or sage green, teal | soft radii, organic curves, thin strokes | unhurried: 40–60 f moves on `glideOut` and `settleOut`, linear creeps, no overshoot, long living holds |
| **Fast, exact, confident** (CI, APIs, build tools) | the **tight** look: `inter-tight`, with `geist-mono` or `jetbrains-mono` for numbers and logs | 600–650; lowercase or sentence case | −0.03 to −0.05 em | often dark: the mid slate (L 0.34), or a near-black ink stage on purpose | a hot signal (chroma 0.14–0.20): signal red, signal green, or a clean yellow on ink | square or 2–4 unit corners, hard edges, a visible grid | crisp: 18–26 f on `snapOut` and `whipBuild`, cuts on the track's accents, no overshoot; the crisp pace only when the brief asks for energy |
| **Bright, friendly, playful** (consumer, social, games) | the **geometric** look: `dm-sans`, or `google-sans-flex` with its roundness axis for a softer cut | 500–600; sentence case | −0.02 em | light, or one designed flood of the accent as the stage | one saturated primary: red, blue, green or yellow | big radii, pills, soft blobs | lively: quick `snapOut` arrivals and contact squash; overshoot only on the film's one spring class (`SPR.landing`) |
| **Precise, quiet, expensive** (finance, legal, premium) | the **neutral** look: `inter` (the default), or `geist` | 400–500, a light touch; sentence case | −0.02 to −0.03 em | the mid slate or a deep dark stage (neutral or toward the brand's greys), or a bright neutral paper with fine rules | deep jewel tones at restrained chroma (0.10–0.16): emerald, sapphire, a deep red | 2–6 unit corners, hairlines, fine rules | slow and exact: `settleOut` and `strongInOut`, 48–72 f, no overshoot |
| **Raw, mechanical, honest** (dev tools, infrastructure, hardware) | the **technical** look: `geist` with `geist-mono` as the voice, `jetbrains-mono` for long code | 500–700; lowercase | 0 for mono, −0.02 em for the sans | concrete grey (neutral) or dark | safety yellow (on ink or concrete) or signal red | square corners, cut notches, rules, registration marks | mechanical: detents (`SPR.criticalFast`), `Stepped` holds, hard stops, conveyors |
| **Warm, kind, steady** (health, care, community) | the **friendly** look: `manrope` or `plus-jakarta-sans` | 500–600; sentence case | −0.01 em | a light, neutral stage with soft greys: the warmth comes from the type, the shapes and the motion, never from a beige paper | from the product's world: leaf or sage green, sky blue, a soft red | rounded 12–24 unit corners, organic shapes | soft: `glideOut` and `SPR.critical`, no overshoot |

Every face in the table is in the face set (`scripts/faces.json`, `references/copy-and-type.md` §6: free under the SIL OFL 1.1, on npm as `@fontsource-variable/*` 5.3.x, family `"<Name> Variable"`, with its weight and tracking offsets against the house numbers). The look is the decision; the face inside it follows, and the neutral look in Inter is the default when no adjective pulls elsewhere. Rounded, techno, script and condensed faces are not in the set: picked for character they read cheap at film size. How to install and load one is in `references/copy-and-type.md` §6.

- **Inside the hard bans.** Every row is a sans (plus an optional mono) on neutral grounds, with one accent from red, green, teal, blue or yellow, because serif "elegance", beige-and-orange warmth and purple gradients are what generated work defaults to (`SKILL.md`, "Hard bans"). Personality comes from which sans, its weight, case and spacing, the stage's lightness, the accent's family and chroma, the corners and the motion. When the user's brand supplies a serif, a warm paper or an orange, it wins (§1) and goes into `BRIEF.md` as an exception.
- **Light or dark is a brand decision.** A dark stage fits dev and infrastructure tools, night, focus and security products, anything named for fire, heat or energy, and premium brands that want a cinematic feel. A light stage fits documents, reading, health, consumer and anything used in daylight. The starter is light only because it has to be something; its paper is a stand-in like the rest of it.
- **Weight carries tone.** A calm brand rarely wants a heavy grotesk wordmark; a fast tool rarely wants a hairline one.
- **The motion character sets speed, not the copy grammar.** In every row text arrives in fragments, one at a time, with picture between them (`references/copy-and-type.md` §2b). A fast tool gets quicker moves and cuts, and the crisp pace when the brief asks for energy; its words still never land as a whole sentence.
- **Write the choices down** next to the adjectives in `TREATMENT.md`: family, weights, case, stage, accent family, corners, motion character. Critics check the film against them.
- **Check against the house style.** Put a still of your film next to the starter's demo and a Tessel frame. If a stranger could believe they are one brand, the personality hasn't reached the pixels yet.

## 3. Naming

Only when the user has no name. A good name hands the film a device.

**Criteria**
- 1–2 syllables, 4–7 letters, spelled the way it sounds.
- A real word, or a clipped one, whose second meaning is the product's verb: tessellation for a calendar that fits pieces together, a plumb line for code review, a keel for a money buffer.
- No generic suffixes (-ify, -ly, -io, -hub, -flow, -base, -stack, -labs) and no "AI" in the name.
- You can't check trademarks, so flag the collision risk in `BRIEF.md` rather than asserting the name is free.

**Four routes.** Generate five candidates per route, then score them.

| Route | Question | Examples across different products |
|---|---|---|
| Tool | What tool does this job in the physical world? | Plumb, Level, Awl, Shim, Gauge |
| Material | What substance behaves like the product? | Loam, Slate, Flint, Tallow |
| Phenomenon | What natural event is the result? | Hush, Lull, Ebb, Drift |
| Structure | What shape does the output have? | Tessel, Weft, Lattice, Keel |

**Score** each on *ownable* (it sounds like this product and no other), *sayable* (a stranger can spell it after hearing it once) and *filmable* (it suggests a device or a grammar). Say the top three aloud inside the logline, then pick.

**Wordmark.** Set it in the brand's family at the weight and tracking the personality chose (§2). Lowercase reads approachable and sentence case reads institutional; choose one and match it in copy. Allow one custom detail only if it carries the idea. No swooshes, gradient fills or custom ligatures.

## 4. Exploring the mark

The first mark you think of is usually the one every other startup already has. Explore before you build.

1. **Sketch 6–10 directions, each from a different source:**
   - the name's meaning (a hillside gives a slope, a plumb line gives a weighted string);
   - a letterform (the initial drawn as a path, not typed in a box);
   - the product's own object (a card, a row, a reading, a fold);
   - the idea's metaphor;
   - a pure geometric construction;
   - negative space (a cut or gap that carries the idea).
2. **Render them all on one sheet** and look at it, large, at 64 px, at 32 px on the dark stage and at 16 px (the pattern below).
3. **Score each 0–2** on five questions:
   - **ownership:** does it belong to this brand and no other?
   - **16 px:** is it still distinct at favicon size?
   - **name link:** does it say the name or the idea?
   - **ten startups:** could it belong to ten other startups? (2 means no.)
   - **misread:** what does it read as at 64 px in half a second? Look at the 64 px column for half a second with the names covered, or give only that column to a subagent with no brief and ask it to name each symbol in two words. 0 if the first read is a common symbol: a minus or a plus, an emoticon, a menu (hamburger) or a "more" row of dots, a padlock, a play or pause button, a check, an eye, a slider or settings icon, a hash, a ± or ÷. 1 if it reads as some other letter or object. 2 if it reads as itself, or as nothing but a mark. A 0 rejects the drawing, not the idea: change the geometry and run the test again. People meet the mark small and fast (an avatar, a favicon, a lower third), and a mark that reads as a minus sign is a minus sign.
   - **the word test** (only when the mark is a letter of the name, or replaces one): show the whole lockup, 300 px wide, for half a second to a subagent with no brief and ask it to type the word it read. It must type the name. A letter redrawn past recognition (a leg cut into a hook, a shoulder that no longer closes) reads as another letter, and a detached part reads as punctuation that splits the word ("h.alden"). A failed word test rejects the drawing, however good the idea: the reader meets the name before the story.
4. **Pick one, then refine it** (§5): gaps, stroke weights, optical corrections, the signature detail. Write the sheet's scores and the winner's reason in `TREATMENT.md`.

**The house cliché.** Some shapes are this skill's own vocabulary, and a film that lands on them looks like every other film made with it: a geometric block with an accent dot, a dome over a block, a letter in a rounded square, and generic stacked bars. The starter's placeholder mark (dome, block, dot) and Tessel's mark (two blocks and a red dot tiling a square) both come from this family. Don't reuse either, and treat any direction in the family as a failed "ten startups" test unless the concept truly requires it.

**The sheet.** One still with every direction, registered in the `Stills` folder of `src/Root.tsx` as `<Still id="MarkSheet" component={MarkSheet} width={W} height={H} />` and rendered with `npx remotion still MarkSheet out/stills/mark-sheet.png`:

```tsx
// src/brand/MarkSheet.tsx: every mark direction on one still, large, at 32 px on ink and at 16 px.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FontGate } from '../lib/FontGate';
import { C, typeStyle } from './tokens';

/** One direction: its name, where it came from, and its drawing in a 100-unit box. */
type Direction = { name: string; source: string; draw: (ink: string, accent: string) => React.ReactNode };

// Weft, a shift-rota app (invented): six directions, each from a different source, and the refined winner.
export const DIRECTIONS: Direction[] = [
  { name: 'over-under', source: 'name', draw: (ink) => (
    <path fill={ink} d="M44 0H56V52H44Z M0 24H36V40H0Z M64 24H100V40H64Z M0 60H100V76H0Z M44 84H56V100H44Z" />
  ) },
  { name: 'w as a path', source: 'letterform', draw: (ink) => (
    <path d="M8 22 L30 82 L50 38 L70 82 L92 22" fill="none" stroke={ink} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
  ) },
  { name: 'rota row', source: 'product object', draw: (ink, acc) => (
    <>
      <rect x={0} y={38} width={28} height={24} rx={8} fill={ink} />
      <rect x={36} y={38} width={28} height={24} rx={8} fill={acc} />
      <rect x={72} y={38} width={28} height={24} rx={8} fill={ink} />
    </>
  ) },
  { name: 'shuttle', source: 'metaphor', draw: (ink) => (
    <path fillRule="evenodd" fill={ink} d="M0 50C30 18 70 18 100 50C70 82 30 82 0 50Z M36 50C44 42 56 42 64 50C56 58 44 58 36 50Z" />
  ) },
  { name: 'checker', source: 'geometry', draw: (ink) => <path fill={ink} d="M0 0H46V46H0Z M54 54H100V100H54Z" /> },
  { name: 'pulled thread', source: 'negative space', draw: (ink) => (
    <path fillRule="evenodd" fill={ink} d="M0 12Q0 0 12 0H88Q100 0 100 12V88Q100 100 88 100H12Q0 100 0 88Z M24 44H100V56H24Z" />
  ) },
  // added after the misread test: the weft passes under the left warp and over the right one
  { name: 'over-under, two warps', source: 'name, refined', draw: (ink) => (
    <path fill={ink} d="M14 0H34V100H14Z M66 0H86V36H66Z M66 64H86V100H66Z M42 40H100V60H42Z" />
  ) },
];

const Cell: React.FC<{ d: Direction }> = ({ d }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
      <svg width={220} height={220} viewBox="0 0 100 100">{d.draw(C.ink, C.accent)}</svg>
      <svg width={64} height={64} viewBox="0 0 100 100">{d.draw(C.ink, C.accent)}</svg>
      <div style={{ background: C.ink, padding: 10, display: 'flex' }}>
        <svg width={32} height={32} viewBox="0 0 100 100">{d.draw(C.paper, C.accent)}</svg>
      </div>
      <svg width={16} height={16} viewBox="0 0 100 100">{d.draw(C.ink, C.accent)}</svg>
    </div>
    <div style={{ ...typeStyle('ui'), color: C.mute }}>{`${d.name} · ${d.source}`}</div>
  </div>
);

export const MarkSheet: React.FC = () => (
  <FontGate>
    <AbsoluteFill style={{ background: C.paper, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'center', justifyItems: 'center', padding: 64 }}>
      {DIRECTIONS.map((d) => <Cell key={d.name} d={d} />)}
    </AbsoluteFill>
  </FontGate>
);
```

How Weft's sheet scored (ownership / 16 px / name link / ten startups / misread):

| Direction | Scores | At 64 px it reads as | Verdict |
|---|---|---|---|
| over-under (name) | 2 / 2 / 2 / 2 / **0** | "±", a plus over a minus | the right idea in the wrong drawing: a short vertical over a long horizontal bar is the plus-minus sign before it is thread. Refined, not dropped |
| w as a path | 1 / 2 / 1 / 1 / 2 | the letter w | a letter; fine as a favicon, weak as an idea |
| rota row | 1 / 0 / 1 / 0 / 0 | the "more" menu (three dots) | a UI icon at every size |
| shuttle | 1 / 1 / 1 / 1 / 0 | an eye | the visibility icon before it is a shuttle |
| checker | 0 / 2 / 0 / 0 / 1 | two squares | pure geometry any brand could own |
| pulled thread | 1 / 2 / 1 / 1 / 1 | a card with a slot | close to the house cliché |
| over-under, two warps (refined) | 2 / 2 / 2 / 2 / 1 | a woven join; at a glance, an H-like letter | the winner: the weft passes under one warp and over the next, which is what the name means, and no common symbol has that silhouette. A letter-like first read costs a point; a symbol would have cost the mark |

The first refinement tried three warps; at 64 px that read as a slider (settings) icon, another 0. The two-warp version keeps the over-and-under and loses the symmetry that made both drawings look like symbols. Symmetric crosses, bars and dots are where misreads live: an asymmetric break is usually the fix.

## 5. Mark construction

The mark is built from the same parts the film animates, so the logo sting and the end card come for free.

**Construction rules**
- **2–4 parts on a 100-unit grid.** A part can be a primitive (rectangle, circle, half-disc, quarter-circle) or a path: a letterform, the silhouette of the product's object, a cut-out. Paths are where ownable marks usually come from.
- **Gaps ≥ 8 units.** At 16 px, 8 units is 1.28 px, the smallest gap that survives downscaling. Smaller gaps fill in and turn the mark into a blob; they also crawl under perspective (see `references/chromium-rendering.md`).
- **Strokes ≥ 10 units** if the mark must work at 16 px (1.6 px). Otherwise draw a small-size variant that drops them.
- **One radius token for every rounded corner, and one signature detail that breaks it**: a point, a fold, one square corner among soft ones. That break is what the eye remembers at 16 px.
- **At most one part in the accent**, and only where that colour means something (the accent's meaning, §8). A mark entirely in ink is fine.
- **Optical corrections.** A circle beside a square of the same height looks smaller, so enlarge it a few percent. Horizontal bars look heavier than vertical bars of equal thickness, so thin them slightly.
- **It assembles.** Each part can enter on its own and land with a contact squash. That is the logo sting (`references/formats.md`).
- **It says the idea**: a thread passing over and under, a weight that points, a hull below a waterline.

**The starter's contract.** `src/brand/Mark.tsx` exports `MARK` (the geometry, which the acts read to place things), a `Mark` component with per-piece transforms, an `only` prop that draws a subset (one part alone, before the mark exists) and `placeMark()` for transform-only placement. Keep that contract and replace everything else: the number of parts, their SVG elements, which one carries the accent. The starter's `A`/`B`/`D` (a dome path, a block, an accent circle) are the placeholder's parts, not a template; when you change them, update the acts that read `MARK.D`. Plumb's mark has two parts, a string and a bob that comes to a point:

```ts
export const MARK = {
  A: { d: 'M26 42H74Q74 70 50 100Q26 70 26 42Z', cx: 50, cy: 64, w: 48, h: 58 }, // the bob, steel: the point finds the line
  B: { x: 45, y: 0, w: 10, h: 34, r: 0 }, // the string: 10 units, so 1.6 px at 16 px; 8 units above the bob
};
// in Mark: <path d={A.d} fill={ink} …/> and <rect … fill={ink} …/> (ink = C.paper on Plumb's dark stage);
// no part carries the accent, which belongs to the flagged line; the <circle> for D goes
```

More worked marks, in 100-unit coordinates:

| Brand | Source | Parts | Idea | What testing taught |
|---|---|---|---|---|
| Plumb | name | the string above; a bob with a flat top and curved sides meeting in a point, in steel (one colour, no accent) | a weight that points at the line that matters | a round bob under the string read as an exclamation mark at 16 px; the point made it a plumb bob |
| Hush | product object | a card (r 14) whose top-right corner folds down along a 45° line, the fold a triangle in the accent, 8 units from the card | the storm folded into one incident card | the first try, a pip inside a rounded square, was the house cliché and read as a notification badge |
| Keel | name | a waterline pill 0,34 → 100,48; 8 units below it, a fin that tapers from 36 units wide to 14, in hull red | the part below the line keeps you upright | a half-disc hull read as a sunrise over a horizon |
| Loam | product reading | a pot in section, 12-unit walls and an open top; the lower 42% filled in the accent, its surface a gentle curve | the healthy reading is the mark | three stacked bars read as a menu icon |

**Tests.** Render the starter's `Stills` folder (`npx remotion still Mark16 out/stills/mark16.png`, then `MarkLarge` and `MarkSizes`) and look at them:
1. **16 px:** every piece is distinct and every gap is visible.
2. **Silhouette:** all ink. The mark is still recognisable.
3. **One colour:** the accent becomes ink (or a knockout). The mark still works.
4. **Inverse:** paper on the ink stage.
5. **In motion:** each part alone reads as a piece of the product's world.
6. **Tell test:** it is not the house cliché (§4), a letter in a rounded square, a gradient blob, an abstract swoosh, a hexagon network, a four-point sparkle, or a generic UI icon (menu, toggle, chat bubble, sunrise, padlock), and it passes the misread test at 64 px (§4).

## 6. The lockup

- **Proportions.** Set the mark's height to the wordmark's cap height, or its ascender height for a lowercase name, then correct optically: a solid, heavy mark sits at 1.0× and an open or pointed one at up to 1.15×. The gap between mark and name is 0.25–0.4× the mark's height, and the two share a baseline. The starter's lockup (`src/acts/Act2.tsx`) measures the name's ink ascent with `inkBox()` and derives the rest.
- **Set it like a typographer: render three settings side by side.** A carelessly set wordmark beside a considered mark costs more than any animation gains, and the right setting is only visible in comparison. Render the lockup three ways on one still, at the end card's size and at a quarter of it, and look at both:

  | Setting | Mark : name ink ascent | Gap (× mark height) | Name weight | Tracking |
  |---|---|---|---|---|
  | A, tight | 1.0 | 0.25 | the display weight | display − 0.01 em |
  | B, balanced | 1.1 | 0.33 | display − 40 | the display tracking |
  | C, airy | 1.2 | 0.40 | display − 80 | display + 0.01 em |

  Pick the setting where the mark and the name read as one object at the small size; then check that the name's stems are within about 15% of the mark's stroke width (a heavy name beside a fine mark, or the reverse, reads as two logos), that the gap looks about as wide as the widest space inside the name, and that nothing at the join collides or floats. Write the winner as a `LOCKUP` token (`{ ratio, gap, weight, track }`) in `tokens.ts`, so the end card, the sting and `brand-kit.sh` set it the same way. Retune between the settings if none is right; the table is the starting spread, not the answer.
- **When the mark is part of the word** (a letter of the name is the mark, or the mark replaces one), there is no mark-beside-name setting to tune. Draw the lockup as one outlined SVG and export it from `src/brand/Mark.tsx` as `LockupSvg` (props `ink`, `dot`; one `<svg>` with a viewBox; the name outlined with `scripts/outline-text.py`, no live text). `brand-kit.sh` then writes it as is; point the `BrandLockup` still at the same drawing so the PNGs match. Run the word test (§4) on it.

```tsx
// src/brand/LockupSheet.tsx: register as a Still in Root.tsx, then npx remotion still LockupSheet out/stills/lockup-sheet.png
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FontGate } from '../lib/FontGate';
import { inkBox } from '../lib/measure';
import { Mark } from './Mark';
import { C, FONT, TYPE } from './tokens';
const NAME = 'weft'; // the wordmark, as COPY sets it
const D = TYPE.display;
const SETTINGS = [ // mark height : the name's ink ascent, gap in mark heights, weight, tracking (em)
  { id: 'A tight', ratio: 1.0, gap: 0.25, weight: D.weight, track: D.track - 0.01 },
  { id: 'B balanced', ratio: 1.1, gap: 0.33, weight: D.weight - 40, track: D.track },
  { id: 'C airy', ratio: 1.2, gap: 0.4, weight: D.weight - 80, track: D.track + 0.01 },
];
const Lockup: React.FC<{ size: number; s: (typeof SETTINGS)[number] }> = ({ size, s }) => {
  const markH = inkBox(NAME, size, s.weight).ascent * s.ratio; // measured under FontGate: the real face
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: markH * s.gap }}>
      <Mark size={markH} />
      <span style={{ fontFamily: FONT.text, fontSize: size, fontWeight: s.weight, letterSpacing: `${s.track}em`, lineHeight: 1, color: C.ink }}>{NAME}</span>
    </div>
  );
};
export const LockupSheet: React.FC = () => (
  <FontGate>
    <AbsoluteFill style={{ background: C.paper, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
      {SETTINGS.map((s) => (
        <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
          <Lockup size={160} s={s} />
          <Lockup size={40} s={s} />
          <div style={{ fontFamily: FONT.text, fontSize: 24, color: C.mute }}>{`${s.id}: ${s.ratio}, gap ${s.gap}, ${s.weight}, ${s.track.toFixed(3)} em`}</div>
        </div>
      ))}
    </AbsoluteFill>
  </FontGate>
);
```
- **Scale in the frame.** At its resolved size the lockup spans about 28–45% of the frame's width (540–860 px at 1920), so it reads as the film's subject rather than a small object in a void. Measure it on the poster frame.
- **Centred, and built from the film's last element.** The lockup sits centred in the frame, and it comes out of what the film showed last: the last picture's element becomes the mark, the last word becomes the wordmark, the badge spins in from the last frame's light (the ten designs in `references/devices/logo-and-end-card.md`). Held 2–3 s on a creep, the one fact under it, the name once. What makes an end card stock is not the centring but a lockup that arrives from nowhere: a mark, a wordmark and a tagline faded in over a radial gradient (`end-card-template`).
- **Optical centre.** Centre its visual mass, not its box, slightly above the frame's geometric centre.
- **Check it small.** Export the final frame, view it 480 px wide, and read the name. If you can't, the lockup is too small or too light.
- **Exports.** When you invented the brand, deliver it as files too (`bash scripts/brand-kit.sh`, `references/formats.md` §5).

## 7. The token file

`src/brand/tokens.ts` is the only place a colour, family, size or tracking value is written, and `scripts/lint-film.mjs` fails any hex colour that isn't declared there. The starter's file already has this shape; extend it rather than forking it. Its values are stand-ins marked `// cinetic:placeholder` (so are the starter's mark and demo name), and `lint-film.mjs` reports an error until you replace them and delete the markers: the film's palette comes from the user's brand or from the work in this file, never from the starter.

```ts
// Keel (a money app): precise, quiet, steady. Neutrals from scripts/palette.py --accent '#C92F33' --meaning 'set aside'
export const C = {
  ink: '#110F0E',    // type and marks (OKLCH 0.17 0.004 25, 17.8:1 on paper)
  ink2: '#1F1C1C',   // raised dark surfaces
  paper: '#F9F6F6',  // the stage: light and neutral (a dark stage is equally valid, §9)
  mist: '#EFECEC',   // canvas behind the product
  line: '#DBD8D8',   // hairlines, ≥ 1.5 px on screen
  mute: '#6B6868',   // secondary text: 5.1:1 on paper, safe at any size
  accent: '#C92F33', // MEANING: "set aside" (hull red, OKLCH 0.55 0.19 25). On what matters, 6-15 % of the frame on average; arrives in it, cools to ink.
  slate: '#35383C',  // the dark stage (RECIPE.slateMid, a neutral grey at L .34), when a shot goes dark
  accentLift: '#E8696B', // the accent lifted for the slate (L .74-.84): it signals by lightness there
  // second: '#…', // the support hue beside the accent: 40° or more from it, in 10-30 % of the film, ≤ 8 % of the frame
};
export const FONT = { text: '"Hanken Grotesk Variable", system-ui, sans-serif', mono: '"JetBrains Mono Variable", ui-monospace, monospace' };
export const FACES = ['440 16px "Hanken Grotesk Variable"', '520 16px "Hanken Grotesk Variable"', '400 16px "JetBrains Mono Variable"']; // what FontGate waits for
export const TYPE_FAMILY = 'calm'; // quiet and expensive: the calm family (references/copy-and-type.md §7)
export const TYPE = {  // one token per role at film size, the calm roles in Hanken (font-match.mjs: about 1 % wider than Geist)
  ui: { size: 40, weight: 440, track: 0, lead: 1.3 },
  caption: { size: 46, weight: 440, track: 0, lead: 1.3 },
  line: { size: 84, weight: 440, track: -0.01, lead: 1.2 },
  display: { size: 160, weight: 520, track: -0.02, lead: 1.05 },
  hero: { size: 200, weight: 520, track: -0.02, lead: 1.0 },
  giant: { size: 640, weight: 520, track: 0.01, lead: 0.9 },
};
// add as needed: SHADOW (§11), RADIUS ({ mark: 12, card: 20, chip: 10 }), a LOCKUP token (§6)
// `python3 scripts/palette.py --recipe <name> --accent '#…'` writes the colour block from a house recipe (§9)
```

Write the accent's meaning in its comment. Critics read it, and it stops the accent drifting into decoration.

## 8. The accent

**Meaning first, hue second.** The meaning comes from the story, usually from the device's role: *now*, *risk*, *water*, *handled*, *set aside*, *new*, *yours*. Write it as one word in the token comment.

**Rules**
- **One token.** Two near-identical reds in the code read as a mistake on screen.
- **On what matters, at its share.** The accent's hue family covers about 6–15 % of the frame on average outside imagery (the state that changed, the number, the mark), never the ground; no frame over 25 % except inside a declared colour event or the one designed flood (up to 2 s). A 1 % dot is too little; a frame in one hue is too much (§9b).
- **"Just happened."** New things arrive in the accent, hold it briefly and cool to ink (type: 18 f hold, a 13 f linear cool; UI and typed letters 10–30 f). The colour carries time without words.
- **One meaning.** Never success and error, never decoration ("the heading looked empty").
- **Check for collisions with UI semantics.** If the product UI shows errors in red and your accent is a red meaning "now", viewers will misread it. Choose another hue, or render UI errors with shape and a neutral.

**Choosing the hue.** Take it from the product's world: the safety yellow on a builder's level, water, the red antifouling paint below a hull's waterline, the red hand of a clock. Any hue in the allowed families (red, green, teal, blue, yellow) works when it is chosen for a reason. Then fit it to the stage:

| On | Accent lightness (OKLCH L) | Chroma | Graphics contrast |
|---|---|---|---|
| Tinted paper (light) | 0.43–0.67 (house 0.56) | 0.11–0.25 | ≥ 3:1 |
| The mid stone | 0.38–0.46 | about 0.16 | ≥ 3:1 |
| The mid slate (dark default) | 0.74–0.84 (a yellow: 0.86–0.90) | about 0.12 | ≥ 3:1 |
| A near-black ink stage | 0.63–0.85 (a yellow: 0.84–0.90) | 0.07–0.16 | ≥ 3:1 |
| A deep field (a colour event) | the same hue lifted to 0.78–0.86 | about 0.10 | ≥ 3:1 |

- **Below 0.08 chroma** the accent reads as a grey rather than a signal.
- **Yellow needs a dark stage** (or a flood with ink type on it): on paper it reaches about 1.4:1.

**The banned regions.** These are the colour hard bans (`SKILL.md`, "Hard bans") as numbers, measured on the colour as rendered (hex → OKLCH). `scripts/lint-film.mjs` (rule `banned-color`) and `scripts/palette.py` use exactly these values, so check a colour with either before you commit to it.

| Region | OKLCH | What it catches |
|---|---|---|
| Orange / amber | 31 ≤ h < 96 and C ≥ 0.05 | orange, amber, gold, brass, brown, coral, terracotta, and red-orange: vermilion `#F2461E` (h 34) and `#E14921` (h 35) |
| Beige / cream | 31 ≤ h < 118, L ≥ 0.70 and 0.007 ≤ C < 0.10 | beige, cream, tan, sand, khaki: any warm, light, low-chroma paper or surface |
| Purple / violet / indigo | 270 ≤ h < 340 and C ≥ 0.02 | indigo (`#4F46E5`, h 277), violet, purple, lavender, magenta; purple-to-blue gradients |
| Neon | C ≥ 0.27; or L ≥ 0.85 and C ≥ 0.15; or L ≥ 0.80 and C ≥ 0.18 (a yellow, 96 ≤ h < 118: only L ≥ 0.91 and C ≥ 0.15) | electric green, cyan, highlighter yellow, hot magenta: accents that glow on ink and vibrate on paper |

The edges were set so the reds stay: Tessel's `#EC2A3A` sits at h 24 and sRGB red `#FF0000` at h 29, while vermilion starts at h 33. The amber/yellow edge at h 96 keeps golden yellows out (`#FACC15` at h 92 and CSS `gold` at h 95, both also bright enough to count as neon) and lets a clean yellow (`#EBD235` at h 100) through. A neutral below C 0.007 carries no temperature and passes at any hue.

**Allowed accents, one per family.** The examples are invented brands, except Tessel.

| Family (OKLCH h) | Brand | Meaning | OKLCH | Hex | Stage | Contrast |
|---|---|---|---|---|---|---|
| Red (340–31) | Tessel | now | 0.61 0.225 24 | `#EC2A3A` | paper | 4.2:1 |
| Red | Keel | set aside | 0.55 0.19 25 | `#C92F33` | paper | 5.0:1 |
| Yellow (96–118) | Plumb | look here | 0.86 0.165 100 | `#EBD235` | ink | 12.7:1 (1.4:1 on paper) |
| Green (118–175) | Hush | handled | 0.76 0.10 165 | `#6FC5A1` | ink | 9.2:1 |
| Teal (175–225) | Weft | covered | 0.58 0.10 190 | `#018D87` | paper | 3.8:1 |
| Blue (225–270) | Loam | water | 0.60 0.14 245 | `#1F86CD` | paper | 3.7:1 |

**Build and audit the palette with `scripts/palette.py`.** `--recipe <name>` writes the tokens of a house colour system (§9) at the accent's hue; `--list-recipes` prints them; `--check-tokens src/brand/tokens.ts` checks a film's tokens (bans and bands on what the brand did not supply, contrast, the one-accent rule); `--ramp 'c1,c2,…'` checks a light field's stops. Given the accent (hex or `oklch(L C h)`), the stage (`--stage light|dark`) the temperature (`--temp neutral|grey|cool`: toward the accent, untinted, or cool) and optionally the stage's own hue from the brand's world (`--stage-hue H`, with `--stage-chroma C`; with `--family` it sets every hue the family names too, its field, its stage and a sky's fixed hue: a blue-black deep pool under a teal accent is `--family deepPool --stage-hue 245`), it prints a `C` block for `tokens.ts` with neutrals tinted toward the accent (kept neutral when the accent is a red or a yellow), every contrast against the stage, and the checks above (statements ≥ 7:1, secondary ≥ 4.5:1, accent ≥ 3:1, chroma, the lightness band), with a nearby fix when one fails. It refuses (exit 1) an accent or a `--paper` in a banned region unless you pass `--brand-supplied`. `--cover IMG` measures the accent's share of a still's pixels (within OKLab 0.08); on Tessel's frames it reads under 0.2% during the acts and 98% on the opening flood frame, the one designed exception.

## 9. Neutrals, the recipes and the stage

**Grounds are neutral, unless the film's ground family is a field.** Every ground and UI surface (paper, stone, slate,
ink, cards, wells, hairlines) is a grey at OKLCH C ≤ 0.025 (house 0.004–0.012), at the hue of the brand's own greys, or
toward the accent's hue at a chroma too low to read as a colour. A pixel under C 0.03 counts as neutral in the checks,
one at 0.06 or more as saturated. The exception is the film's dealt ground family (§9b): a deep field, a soft sky, a
pale gradient field or a band of the brand colour follows the family's own numbers, and the UI surfaces on it stay
neutral. Any other ground at the accent's own hue and chroma is a colour event (§9b): a frame washed in one hue hides
the accent it was meant to show.

**The recipes** (`RECIPE` in `lib/look.ts`, OKLCH [L, C] at the accent's hue; `palette.py --recipe` writes them):

| Recipe | Ground | Type | Accent | Use |
|---|---|---|---|---|
| `tintedPaper` | L .93–.99 (house .955), C .004–.015 (≤ .004 with a red or yellow accent) | ink L .15–.25 | L .43–.67, C .11–.25 | **the light default** |
| `stoneMid` | L .70–.80 (house .74), C .004–.012 (≤ .006 with a red or yellow accent) | ink L .12–.16 | L .38–.46 | the mid stone: matte relief, shadow play, a lit face reads against it |
| `slateMid` | L .30–.40 (house .34), C .004–.012 | L .96–.99 | L .74–.84 (a yellow .86–.90) | **the dark default**: deep enough for light type, light enough that shadows and lit faces still read |
| `inkStage` | L .06–.23 (house .15), C 0–.04 | L .92–.99 | L .63–.85, C .07–.16 | a near-black stage, for a film that wants it on purpose |
| `deepField` | the accent's hue at depth: L .34–.42, C .07–.13 (blue, teal or green) | L .96–.98 | the same hue at L .78–.86 | a **colour event** for a moment, under neutral UI, never the stage |
| `paperEditorial` | neutral L .945 | ink L .24 | | neutral paper with one material (a paper texture) used everywhere |
| `whiteWorld` | pure white (this system only) | ink L .13 | a one-hue lightness ramp | colour sweeps and a late arrival of full colour |

`palette.py --recipe slateMid` writes the starter's names, so the block pastes over `C` without turning a role over:
the stage is `slate` (with `slateRaised`), type is `paper`, `ink` stays the darkest type, mark and shadow that `fx/`
draws with, and the accent is written as `accent` and `accentLift`, under a `// stage: slate` line that `--check-tokens`
reads.

`STAGE` names the default per kind of ground: light `tintedPaper`, **dark `slateMid`**, mid `stoneMid`, colour
`deepField` (a declared event). The dark default is the mid slate, not near-black ink: a near-black void flattens
every shadow and lit face and reads as a screenshot of a dark-mode tool. The deck deals at least one mid or colour
ground when it can; plan a light/dark sequence and flip it on carried transitions (§13).

- **Ink.** Not pure black (`pure-ink` errors on `#000`): L 0.15–0.25 with chroma under 0.02. Pure black reads as a hole
  in the frame; a tinted ink reads as a material.
- **Paper.** A warm paper (chroma 0.007 and up toward hue 31–118) is beige, a hard ban, unless the brand supplied it.
  Pure white is for `whiteWorld` and for UI surfaces sitting on a paper (`pure-ink` warns on a `#FFF` ground without
  `LOOK.whiteWorld`).
- **Steps between them:** a raised surface (+0.01–0.08 L, or the ground with a dip shadow), a lit face (up to +0.10 L),
  hairlines, mute text (≥ 4.5:1). Contrast: statements ≥ 7:1, secondary lines ≥ 3:1 at caption size and up, anything
  smaller ≥ 4.5:1, graphics and the accent ≥ 3:1. A word set in the accent (a swapped word, a key word) over a busy
  picture or on a light chip is text, not a graphic: it takes the kit theme's `accentText` (the accent moved in
  lightness until it reads 4.5:1 on the theme's surface and raised faces, `textOn()` in lib/color.ts), while fills,
  bars and marks keep `accent`.
- **Ink stays ink.** A white radial wash laid over ink cards turns them into grey buttons.

**Palettes with character, inside the bans.** The bans leave a big space. The risk inside it is "default": framework blue on flat grey, which a viewer reads as a template before any motion plays. Derive the palette from the world the name and the product live in, then let `palette.py` check it. Some starting worlds:

| World | Stage | Neutrals | Accent (allowed family) |
|---|---|---|---|
| hillside, fjord, forest (calm, outdoors) | pale green-grey paper, or pine-black | moss-grey, slate | a deep pine or a clear lake teal |
| foundry, forge, workshop (heat, physical) | a true charcoal, no blue in it (`--temp grey`) | soot greys | a deep red used as heat and light: a lit edge, the glow of the material |
| night, focus, security | an ink-navy with body (`--stage-hue 235 --stage-chroma 0.03`) | blue slates | a cold cyan-teal |
| paper, ledger, archive (exact) | a cool white | graphite hairlines | a single ink blue with some depth, not framework blue |
| signal, traffic, energy (bold) | near-black | steel | a safety yellow on dark only |
| garden, health, care | a cool mint-white | sage greys | a leaf green |

- **Avoid the defaults.** Framework blues (hue about 260, the `#3B82F6` / `#2563EB` / `#1D4ED8` family), pure `#808080`-style greys, and pure black and white everywhere. Move the hue, lower the chroma and tint the greys, and the same "blue on grey" becomes a brand.
- **One colour story.** Stage, neutrals and accent come from the same world. A pine stage with a random coral accent is two brands.
- **The dev-tool dark theme is a default too.** A blue-grey near-black (`#0D1117`, OKLCH about 0.17 0.01 250) is what GitHub and every editor ship, so a film on it reads as a screenshot of a tool. `palette.py` notes it. Take a dark stage from the brand's world: a true charcoal, a pine-black (`--stage-hue 160`), a deep teal (`200`) or an ink-navy with real body.
- **In a dev tool, red means error.** Red status tags on UI rows read as an alarm, not a brand. When red is the brand, spend it on the brand's own thing (the material glowing, the device, the payoff) and keep the UI's states quiet: greys and one neutral "done" tone.

## 9b. Colour as shares of the frame

`look-audit.py` measures colour on the render and `grammar-score.mjs` scores it (`COLOUR` and `PICTURE` in
`lib/look.ts`):

| Reading | House target | Limit |
|---|---|---|
| Neutral pixels (C < 0.03) | 40 % of the frame or more over the film | |
| The accent's hue family (within 20°), outside imagery | 6–15 % of the frame on average | no frame over 25 % outside a declared colour event |
| Saturated pixels (C ≥ 0.06): colour mass | 4.5–32 %, about 11 % in a committed film (the floor is 2.2 %) | the wash ceiling: ≤ 32 % on average and no more than a quarter of the frames over half saturated (the floor fails at 60 % and 65 %) |
| A support hue | the default palette is the accent plus one support hue: a second brand colour, data beside the accent, a state the accent cannot be, or the photographs' own second hue; 40° or more from the accent in an allowed family, in 10–30 % of the samples, ≤ 8 % of the frame while it shows (under 9 % of the samples is a target miss: timid colour) | a hue in more than 80 % of the frames at over 15 % is a second accent (a warning) |
| A colour event | a deep field, an accent flood, a colour cut: declared (the timeline's `COLOUR` ranges or a primitive's `declares()` colour, written to `declared.colour` in the cues; `--colour-event FROM,TO`), or one designed flood up to 2 s | the ceilings pause inside it |

- **Commit to colour.** One accent on neutral with nothing beside it reads as timid: plan the colour mass per act
  (the accent on the hero state, the support hue on data or a second element, pictures, when the film has them, at
  their own chroma) and check it on the style stills before the film is built.
- **Colour mass comes from the right places:** the accent on what matters, the product's UI and the graphic fields
  in their colours, pictures (when the film has them) in their own colours (the `natural` grade is the default; tint,
  duotone and deep are device looks for one shot), the accent's own lightness steps, and a colour event for a moment. A one-accent dot on grey is not colour; grounds, surfaces, shadows and
  pictures all at the accent's hue is a wash (D15 in `references/taste-and-slop.md`).
- **Declare the support hue** in the tokens (`C.second`) so the one-accent checks leave it out and
  `src/kit` uses it. Imagery boxes are declared with `look-audit.py --imagery x,y,w,h` so natural colour inside a
  photograph is not read as designed colour.
- **Check a frame at thumbnail size:** if no brand colour shows on a key beat, the film has no identity; if everything
  is the accent's colour, it has no accent.

### Ground families: one field and its light for the whole film

A film stands on one ground family, dealt per film (`scripts/deck.py` prints it on the sheet; a template's deal picks it
from the name; `fx/Grounds` `FamilyGround` draws it and `familyInks()` gives its type, surface and field colours;
`palette.py --family` writes the tokens). The ground never cuts: the content moves over it, and the film's one colour
event is declared in `COLOUR`. Two films in a row never share a family.

Every family is a designed, LIT field, never a two-stop linear: a base colour and two or three lights (a key, a floor or
fill, a tinted lobe) entering from an edge or a corner with a gaussian falloff, mixed in OKLab, with a soft optical
vignette on the dark families, computed in float and dithered (±1.5 levels), baked once at the film's size
(`litFieldPixels`). The field holds STILL: no drift, no breathing; the content and a purposeful camera carry the motion.
`litFieldRange()` and `litFromEdge()` measure a field (a lit place spans 12 L* or more; no pool inside the frame).

| Family | What it is | Type | Colour field | The one colour event (`event` 0..1) |
|---|---|---|---|---|
| `nearWhite` | a paper sweep: near-white (L .99) lit from the top left, falling to L .93 in the far corner | ink | none | an accent lobe opens from the top right |
| `lightStudio` | a light grey studio sweep: a top key (L .97) over a floor falling to L .80 | ink | none | an accent lobe opens |
| `softSky` | a lit pale sky: deeper at the top (L .885, C .05, a cool hue), a pale horizon low | ink | the pale field | an accent lobe opens |
| `gradientField` | a pale tinted mesh: two lobes of the field hue from opposite corners, white light from the top left | ink | the pale field | the lobe deepens |
| `whiteBand` | white with one lit band of the brand colour across the top, fading down | ink | the band | the band floods the frame for one line |
| `blackField` | studio black (L .10, never `#000`): one soft key from above left (to L .23 at the top edge), a faint floor | white | none | the key takes the accent hue |
| `studio` | a mid slate cyclorama: a broad top key (L .47) over a slate floor (L .24): the stage for cards on a dark-mid ground | white | none | the key takes the accent hue |
| `deepPool` | a deep field at the accent's hue (L .20, C .05) with a glow rising from the bottom edge | white | the whole field | the glow rises |
| `duskMesh` | a deep tinted night: two lobes of the field hue (L .40 and .30) from opposite corners over L .135 | white | the lobes | the lobes rise and open |
| `floorGlow` | near-black with one glow of the field hue rising from the floor | white | the glow | the glow rises |
| `lightDark` | the problem on `nearWhite`, then the product on `blackField` | ink, then white | none | the turn to dark, once, on a seam |

- **The field's hue** is the accent's own when the accent is a blue, teal or green; with a red or yellow accent the
  field takes a cool 230, so a red never becomes a pink field and a yellow never a cream one.
- **A line on the field.** When the family has a colour field, at least one statement sits on it (white or ink type,
  whichever reads), and the key word may take the film's one accent ink; contrast is 4.5:1 or more once the line has
  settled. No box, marker or underline: the colour is the emphasis.
- **The bans stay.** No orange, amber, beige or cream grounds; no purple, violet or indigo; no neon. A family never
  takes a banned hue, whatever the accent.
- **Light stays motivated and still.** The light enters from an edge or a corner and holds; it never drifts, pulses or
  breathes behind the words (an aimless move in the ground reads as the frame wandering). look-audit's ground-haze read
  still applies to anything that is not the family's own field, and its banding read checks the bake survived.

### Worlds: a place with its own light (`fx/world`)

A world is a ground family that is a place: a real photograph or clip (`clouds`, `aerial`, `sea`, `nightCity`,
`macro`, `sky`, `studio`) or a built field (`blackField`, `electric`, `deepField`, `paleSky`, `nearWhite`), each with
a key light that the glass, the rims, the sweeps and glowing type read (`fx/light`; the parts and recipes are in
[lighting.md §8](lighting.md)). One world per film, dealt from the film's name (`dealWorld`), never cut. The built
worlds share the families' rules above: `blackField` and `nearWhite` are those families with a key, `deepField` is
`deepPool` with its light rising from the floor, `paleSky` is `softSky` with the sun's side bright, and `electric` is
the one saturated ground: a blue stage lit from the top, where white type and glass cards read as light.

- **Hue windows** (`worlds.ts` `WORLD_HUE`). The accent lends a world its hue only inside that world's window, else
  the world keeps its cool default: `electric` 228-266 (else a blue 258; a green or teal stage reads as a chroma key),
  `deepField` and `nightCity` 195-266 (else a navy 252), a plate's tint 195-266 (else a sky's 236: a sky is never
  green), the near-neutral `blackField`, `nearWhite` and `studio` 140-266 at a chroma too low to read as colour (else 245).
  A green, red or yellow brand keeps its accent for its marks and one signal; the ground stays cool.
- **Plates are graded for the film, baked.** `scripts/assets.mjs plate <world> --accent <the film's accent>` drains warm
  light from the picture (reds and yellows desaturated), sets saturation, gamma and contrast and a cool balance, puts
  the film's hue in the split, and writes a blurred copy for frosted glass. A warm sunset, a cream sky, an orange
  sodium street become cool and neutral; the picture never brings a banned colour into the film. In film a baked plate
  draws with no filter; a picture that was not baked takes a light set-in (World `spec` grade).
- **Type per world.** `spec.ink` and `spec.mute` are the world's type (white on the dark worlds and on plates with white
  type, a cool ink on `sky`, `studio`, `paleSky`, `nearWhite`); `spec.glass.text` on its glass; `spec.typeShadow` under a
  white line on a bright plate (a soft shadow in the plate's deep tone, never a light halo); `spec.glow` is the colour
  of light there (glowing type, sweeps, bloom).
- **Glass in a world.** §11 holds: glass where it reads, never the UI style of every panel. In a world it is
  `fx/light` Glass, which frosts the world's own ground and takes its rim, glint and sweep from the key; on a built
  field (nothing to frost) a pane is a veil carried by that light. One hero pane or input per shot; the rest of the
  UI is the opaque card material (§11).
- **The bans stay.** No orange, amber, beige or cream ground; no purple, violet or indigo (a deep field is navy, never
  violet, unless the brand supplies it, §1); no neon (the electric stage is bright because it is lit, its type and
  glass white, never a full-chroma glow).

## 10. Palettes that read as generated

Most of these are hard bans (§8 has the numbers); the rest are combinations to avoid when you invent. Use one only if the brand already does (§1).
- indigo or violet → blue gradients; a multi-hue gradient, rainbow, mesh or aurora used as a decorative wash behind everything (a gradient or spectral accent inside a device that does a job is allowed, §12b);
- a monochrome accent wash: grounds, surfaces and graded pictures all at the accent's hue;
- neon on black (the §8 neon region on an ink stage);
- glassmorphism as a UI style: frosted panels with a 10–20% white fill and a 1 px white border on every surface;
- beige, cream or sand grounds, and orange, amber or terracotta accents;
- a dark UI with a coloured glow behind every hero element.

## 11. Surfaces: the card material

Every card, panel, chip tile and lockup plate is one material (`kit/card` `Card`, and `kit/parts` `Surface` /
`surfaceShadow` / `keyFace`, which every kit part uses). A cheap card is a translucent grey slab, tilted, bobbing, with
no edge and no shadow; a premium one is:

- **Opaque, lit from above.** The face is solid, with a quiet vertical sheen (1-2 L* from top to bottom); never a
  diagonal wash, never a see-through fill. Light cards are near-white at the ground's neutral hue; dark cards sit
  8-12 L* over a dark ground (look-audit card-separation), their chroma held under .014 so a card never becomes a
  second accent.
- **An edge that catches the light.** A hairline round the edge (ink at 7 % on a light card, white at 8 % on a dark
  one) and an inner top highlight; both drawn over the content, so a photo filling the card keeps its edge.
- **Two shadows under the key.** A tight contact shadow and a broad soft ambient one, mostly straight down (a softbox
  from above), nudged away from the film's light; a third, wider layer while the card is lifted toward the lens
  (`lift` 0..1, a designed move, never an idle bob). On ink the hairline and the luminance step carry it.
- **Radius, padding and type by size.** Radius 24 / 34 / 46 px and padding 30 / 44 / 60 px at 1080p for cards under
  520, under 900 and wider; a nested radius is the outer minus the padding (`innerRadius`). Inside, the text face at
  film size (`cardText`: eyebrow 36 in capitals +0.06 em, title 60, body 44, meta 38, figure 132), never under
  `TEXT_MIN`.
- **Facing the camera, holding still.** No resting tilt (a tilt is a designed 3D move that lands flat) and no idle
  bobbing, floating or breathing inside a card.
- **Glass only with its backdrop.** `tone="glass"` blurs its own copy of the picture behind it (`backdrop`) under a
  light or dark tint and the same edge; without a backdrop it falls back to the solid face. Glass where it reads (a
  card over a photograph or footage), never as the UI style of every panel.
- **Never as decoration:** a halo or bloom round elements, an outer glow on text, an inner glow, a gradient border.
  `cardFaults()` lists a hand-drawn card's faults; look-audit's cheap-card read warns on a translucent slab or a
  shadowless card near its light ground.

## 12. Light on the ground and banding

- **Light is visible, not a tint.** A light field (`fx/LightField`: a floor glow, wandering pools, flowing bands, a rise
  into a reveal) swings the ground's lightness by 0.05–0.20 at chroma 0.13 or less at the accent's hue (`LIGHT`);
  behind UI keep it near neutral (C ≤ 0.025); a field that fills the frame at full chroma is a colour event. Pools
  wander about 240 px/s, loops repeat every 1–4 s, a reveal brightens the field ×2 over 0.9 s. A field at a few
  percent of accent alpha reads as a flat ground and does nothing (`references/lighting.md` §3).
- **Chromium renders CSS gradients in 8 bits.** A gradient spanning fewer than about 30 code values shows contour bands;
  nothing downstream removes bands quantized in the browser.
- **Bake every soft field as a dithered plate** with `scripts/dither-gradient.py --spec plates.json --out public/fx`
  (`--example` prints a spec; `--check` verifies one hue, chroma, the lightness swing and no banding), or
  `ditherPlate()` at render time for a plate sized to its text. Move plates by transform and opacity; cross-fade two
  plates to change colour, never animate stops. Load them with `<Img src={staticFile('fx/floor.png')} />`.
- Check with the ×12 contrast stretch (`--preview out/qa/bands`), the banding sheet from `scripts/forensics.py` and
  `look-audit.py <film or stills> --surfaces` (banding fails a ramp whose plateaus are as wide as its step spacing;
  the film audit runs it on full-resolution samples). Render soft fields through PNG intermediates when a JPEG pass
  flattens the dither, and keep the master's CRF where render.sh sets it.

## 12b. Colour devices: gradients, spectral accents, glow and glass

Rainbow, spectral and iridescent accents, multi-hue gradients, light and glow, glass and refraction are allowed when
they are part of a device that does a job: a border where coloured dots bleed into one spectral ring, a word that inks
along a colour path, a tile lit from beneath that spills onto its neighbours, a frame that blooms into light, a word
seen through fluted glass. The rules:

- **One dominant accent per film.** A spectral object is the film's one signal (one object, one border, one band, one
  plate); everything else stays in the film's inks over neutral grounds.
- **Every gradient baked and dithered**, one gradient family per film, stops ordered by lightness so no midpoint goes
  muddy; `gradient-shape` (stops more than 7° of hue apart) applies outside the device primitives.
- **Glow is physical:** a near-white core, a body in the accent, a falloff; motivated by something visible and moving
  with it; never a halo round an element or a radial plate behind the lockup.
- **No neon, no backdrop filter:** brightness comes from the core, not from full chroma; frost is two copies.
- Build them with the device primitives (`fx/Spectral`, `fx/Glow`, `fx/Glass`, `fx/Gradients`, `fx/Grades`,
  `fx/TypeFill`, `fx/BorderBleed`, `fx/Fringe`), which declare their light; the recipes and numbers are in the device
  book's [materials and VFX notes](devices/INDEX.md#materials-and-vfx).
- A supplied brand gradient or glow is the brand's (§1): `cinetic:brand-supplied`, as a baked plate.

## 13. Colour in motion

- **Mix in OKLab.** `interpolateColors` lerps gamma-encoded sRGB and rounds every channel each frame. A green accent relaxing to paper (`#08965A` → `#F5F6F7`) sits at `#7EC6A8` halfway in sRGB, darker and 8° off in hue, against `#93C6A7` in OKLab; between two distant colours the sRGB midpoint turns dark and muddy. Passing `oklch()` strings doesn't help, because they are converted to sRGB before the lerp. Use the starter's `mixColor(a, b, t)` from `src/lib/color.ts`, which mixes in OKLab and rounds once. The transient accent on type uses `accentFade()` (a linear cool, in sRGB by default because that is how the cool reads on screen, `'oklab'` for even lightness steps); a multi-stop colour path uses `pathColor()`.
- **Slow global ramps step at 8 bits** however you mix: `#101010` → `#141414` over 100 f has only 5 distinct values. Keep slow tint changes on small areas, hide them inside motion, or cross-fade to a dithered PNG plate, whose per-pixel noise spreads the steps out.
- **Plan the luminance flips.** Write the film's light/dark sequence as one row in the treatment. Tessel's is paper → accent (iris) → paper → ink (flood) → paper → accent (flood) → grey → paper.
  - Carry each flip on a moving shape from the device (an iris, flood, shutter or implosion). Never a hard cut to a different luminance, and never a crossfade through black, which dips about 25%.
  - Land flips on the track's accents or entries; a one-frame ground flip on a hit is a declared colour event (`FLASHES`).
  - At most one flip per bar, and the accent floods the frame only once (up to 2 s).
  - After a flip to dark, give the eye 12–20 f before any small type appears.
