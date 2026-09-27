# Brand and colour

Covers the brand's personality and what it decides, naming, exploring and building the mark, the lockup, the token file, the accent and its meaning, neutrals and stages, surfaces, tonal stages and colour in motion. Read it at Step 2, before writing `src/brand/tokens.ts` and `src/brand/Mark.tsx`, and whenever a critic flags colour or says the film looks like a template. Numbers are proven defaults and starting points, not dogma.

**Contents**
1. [When the brand is supplied](#1-when-the-brand-is-supplied)
2. [Personality → choices](#2-personality--choices)
3. [Naming](#3-naming)
4. [Exploring the mark](#4-exploring-the-mark)
5. [Mark construction](#5-mark-construction)
6. [The lockup](#6-the-lockup)
7. [The token file](#7-the-token-file)
8. [The accent](#8-the-accent)
9. [Neutrals and the stage](#9-neutrals-and-the-stage)
10. [Palettes that read as generated](#10-palettes-that-read-as-generated)
11. [Surfaces: shadow and hairline](#11-surfaces-shadow-and-hairline)
12. [Tonal stages and banding](#12-tonal-stages-and-banding)
13. [Colour in motion](#13-colour-in-motion)

---

## 1. When the brand is supplied

The brand wins. Everything below is for what you have to invent, plus the method for fitting a real brand into a film.

- **Colours.** Map them to roles: the darkest neutral becomes `ink`, the lightest `paper`. Choose *one* brand colour as the film's accent and write down its meaning. The other brand colours appear only inside the product UI, where they already live.
- **Typeface.** Use it, serif and condensed included. Ship it locally (`@font-face` or a `@fontsource-variable/*` package) and gate it with `FontGate`.
- **Logo.** Use the vector file. Don't redraw or "improve" it. Find the device in its geometry (a dot, a corner, a counter, a stroke end); if there is none, the device is the accent colour itself. Build the sting by splitting the logo along its existing shapes.
- **Wordmark only.** Take the device from a letter feature: the dot of an i, a crossbar, a terminal.
- **Brand guidelines that conflict with a rule here** (a gradient in the logo, a second accent): follow the guidelines, and use the rule to limit the damage. Show the gradient only in the logo, and let the second colour appear only in UI.

## 2. Personality → choices

Every invented brand starts from three adjectives, written in `TREATMENT.md` before any colour or face is picked. The adjectives decide the choices below; taste then refines them. Without this step every film drifts to the same cool, light, geometric-sans minimalism, which is this skill's own house style and reads as a template the second time a viewer sees it.

| Personality (three adjectives) | Typeface (`@fontsource-variable/*`) | Weight and case | Tracking (display) | Stage and temperature | Accent family | Corners and shapes | Motion character |
|---|---|---|---|---|---|---|---|
| **Calm, literary, unhurried** (notes, reading, journaling) | a text serif with warmth: `newsreader`, `literata`, `source-serif-4`; or a humanist sans, `source-sans-3` | 380–450 display, 400 text; sentence case | −0.01 to −0.02 em (serifs want less than sans) | a warm paper (L 0.96–0.97, C 0.008–0.015) and a warm ink | low chroma (0.06–0.10): ink blue, moss, clay | soft radii, organic curves, thin strokes | unhurried: 30–48 f moves on `outSoft` and `dolly`, no overshoot, long holds |
| **Fast, exact, confident** (CI, APIs, build tools) | a tight grotesk, `schibsted-grotesk` or `instrument-sans`, with `jetbrains-mono` for numbers and logs | 600–650; lowercase or sentence case | −0.03 to −0.05 em | often dark (ink L 0.14–0.18), cool or neutral | a hot signal (chroma 0.14–0.20): ember orange, signal yellow-green | square or 2–4 unit corners, hard edges, a visible grid | crisp: 12–20 f on `out` and `whip`, cuts on the beat, no overshoot |
| **Bright, friendly, bouncy** (consumer, social, games) | `bricolage-grotesque`, `fredoka` (rounded) or `nunito` | 600–800; sentence case | −0.02 em | light, or a saturated colour field as the stage | saturated primaries or warm brights | big radii, pills, blobs | playful: `SPR.pop` with 5–10% overshoot on landings, squash and stretch |
| **Precise, quiet, expensive** (finance, legal, premium) | `hanken-grotesk` or `public-sans`; `source-serif-4` for a display voice | 400–500, a light touch; sentence case | −0.02 to −0.03 em | a deep dark stage (near-black green or navy) or a bright paper with fine rules | deep jewel tones at low lightness, or a muted brass | 2–6 unit corners, hairlines, fine rules | slow and exact: `rest` and `dolly`, 36–60 f, no overshoot |
| **Raw, mechanical, honest** (dev tools, infrastructure, hardware) | a mono as the voice, `martian-mono` or `jetbrains-mono`, with `ibm-plex-sans` | 500–700; lowercase | 0 for mono, −0.02 em for the sans | concrete grey or dark | safety yellow or signal orange (on grey, never on beige) | square corners, cut notches, rules, registration marks | mechanical: detents (`SPR.detent`), steps, hard stops, conveyors |
| **Warm, kind, steady** (health, care, community) | a friendly sans, `figtree`, `nunito-sans` or `commissioner` | 500–600; sentence case | −0.01 em | a warm light stage | from the product's world: clay red, sage, sky | rounded 12–24 unit corners, organic shapes | soft: `outSoft`, 1–3% overshoot on arrivals |

Every package in the table exists on npm at 5.3.x and registers its family as `"<Name> Variable"` (for example `"Newsreader Variable"`, `"Schibsted Grotesk Variable"`). How to install and load one is in `references/copy-and-type.md` §6.

- **Warm and serif are allowed.** A warm, calm brand may use a warm paper and a serif or humanist face; that is a choice with a reason. What reads as generated is the *default*: beige with an orange accent on a brand that never asked for warmth, and a serif used as generic "elegance".
- **Light or dark is a brand decision.** A dark stage fits dev and infrastructure tools, night, focus and security products, anything named for fire, heat or energy, and premium brands that want a cinematic feel. A light stage fits documents, reading, health, consumer and anything used in daylight. The starter is light only because it has to be something; its paper is a stand-in like the rest of it.
- **Weight carries tone.** A calm brand rarely wants a heavy grotesk wordmark; a fast tool rarely wants a hairline one.
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
2. **Render them all on one sheet** and look at it, large, at 32 px on the dark stage and at 16 px (the pattern below).
3. **Score each 0–2** on four questions:
   - **ownership:** does it belong to this brand and no other?
   - **16 px:** is it still distinct at favicon size?
   - **name link:** does it say the name or the idea?
   - **ten startups:** could it belong to ten other startups? (2 means no.)
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

// Weft, a shift-rota app (invented): six directions, each from a different source.
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
];

const Cell: React.FC<{ d: Direction }> = ({ d }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
      <svg width={220} height={220} viewBox="0 0 100 100">{d.draw(C.ink, C.accent)}</svg>
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

How Weft's sheet scored (ownership / 16 px / name link / ten startups):

| Direction | Scores | Verdict |
|---|---|---|
| over-under (name) | 2 / 2 / 2 / 2 | the winner: a thread passing over one weft and under the next is what the name means, and it holds at 16 px |
| w as a path | 1 / 2 / 1 / 1 | a letter; fine as a favicon, weak as an idea |
| rota row | 1 / 0 / 1 / 0 | at 16 px it is the "more" menu icon |
| shuttle | 1 / 1 / 1 / 1 | reads as an eye before it reads as a shuttle |
| checker | 0 / 2 / 0 / 0 | pure geometry any brand could own |
| pulled thread | 1 / 2 / 1 / 1 | a rounded square with a slot: close to the house cliché |

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
  A: { d: 'M26 42H74Q74 70 50 100Q26 70 26 42Z', cx: 50, cy: 64, w: 48, h: 58 }, // the bob, in brass: the point finds the line
  B: { x: 45, y: 0, w: 10, h: 34, r: 0 }, // the string: 10 units, so 1.6 px at 16 px; 8 units above the bob
};
// in Mark: <path d={A.d} fill={dot} …/> and <rect … fill={ink} …/>; the <circle> for D goes
```

More worked marks, in 100-unit coordinates:

| Brand | Source | Parts | Idea | What testing taught |
|---|---|---|---|---|
| Plumb | name | the string above; a bob with a flat top and curved sides meeting in a point, in brass | a weight that points at the line that matters | a round bob under the string read as an exclamation mark at 16 px; the point made it a plumb bob |
| Hush | product object | a card (r 14) whose top-right corner folds down along a 45° line, the fold a triangle in the accent, 8 units from the card | the storm folded into one incident card | the first try, a pip inside a rounded square, was the house cliché and read as a notification badge |
| Keel | name | a waterline pill 0,34 → 100,48; 8 units below it, a fin that tapers from 36 units wide to 14, in hull red | the part below the line keeps you upright | a half-disc hull read as a sunrise over a horizon |
| Loam | product reading | a pot in section, 12-unit walls and an open top; the lower 42% filled in the accent, its surface a gentle curve | the healthy reading is the mark | three stacked bars read as a menu icon |

**Tests.** Render the starter's `Stills` folder (`npx remotion still Mark16 out/stills/mark16.png`, then `MarkLarge` and `MarkSizes`) and look at them:
1. **16 px:** every piece is distinct and every gap is visible.
2. **Silhouette:** all ink. The mark is still recognisable.
3. **One colour:** the accent becomes ink (or a knockout). The mark still works.
4. **Inverse:** paper on the ink stage.
5. **In motion:** each part alone reads as a piece of the product's world.
6. **Tell test:** it is not the house cliché (§4), a letter in a rounded square, a gradient blob, an abstract swoosh, a hexagon network, a four-point sparkle, or a generic UI icon (menu, toggle, chat bubble, sunrise, padlock).

## 6. The lockup

- **Proportions.** Set the mark's height to the wordmark's cap height, or its ascender height for a lowercase name, then correct optically: a solid, heavy mark sits at 1.0× and an open or pointed one at up to 1.15×. The gap between mark and name is 0.25–0.4× the mark's height, and the two share a baseline. The starter's lockup (`src/acts/Act2.tsx`) measures the name's ink ascent with `inkBox()` and derives the rest.
- **Scale in the frame.** At its resolved size the lockup spans about 28–45% of the frame's width (540–860 px at 1920), so it reads as the film's subject rather than a small object in a void. Measure it on the poster frame.
- **Optical centre.** Centre the lockup's visual mass, not its box, and sit it slightly above the frame's geometric centre.
- **Check it small.** Export the final frame, view it 480 px wide, and read the name. If you can't, the lockup is too small or too light.
- **Exports.** When you invented the brand, deliver it as files too (`bash scripts/brand-kit.sh`, `references/formats.md` §5).

## 7. The token file

`src/brand/tokens.ts` is the only place a colour, family, size or tracking value is written, and `scripts/lint-film.mjs` fails any hex colour that isn't declared there. The starter's file already has this shape; extend it rather than forking it. Its values are stand-ins marked `// cinetic:placeholder` (so are the starter's mark and demo name), and `lint-film.mjs` reports an error until you replace them and delete the markers: the film's palette comes from the user's brand or from the work in this file, never from the starter.

```ts
// Keel (a money app): precise, quiet, steady. Neutrals from scripts/palette.py --accent '#C13E2E' --meaning 'set aside'
export const C = {
  ink: '#120E0E',    // type and marks (OKLCH 0.17 0.007 30, 17.8:1 on paper)
  ink2: '#211C1B',   // raised dark surfaces
  paper: '#F9F6F5',  // the stage: light, tinted toward the accent (a dark stage is equally valid, §9)
  mist: '#F0ECEB',   // canvas behind the product
  line: '#DDD8D7',   // hairlines, ≥ 1.5 px on screen
  mute: '#706665',   // secondary text: 5.2:1 on paper, safe at any size
  accent: '#C13E2E', // MEANING: "set aside". Arrives on new things, relaxes to ink; ≤ 8% of pixels.
};
export const FONT = { text: '"Hanken Grotesk Variable", system-ui, sans-serif', mono: '"JetBrains Mono Variable", ui-monospace, monospace' };
export const FACES = ['400 16px "Hanken Grotesk Variable"', '520 16px "Hanken Grotesk Variable"', '400 16px "JetBrains Mono Variable"']; // what FontGate waits for
export const TYPE = {  // one token per role (references/copy-and-type.md)
  display: { size: 116, weight: 520, track: -0.03, lead: 1.0 },
  secondary: { size: 48, weight: 400, track: -0.015, lead: 1.15 },
  ui: { size: 26, weight: 400, track: -0.005, lead: 1.3 },
};
// add as needed: SHADOW (§11), RADIUS ({ mark: 12, card: 20, chip: 10 }), and emphasis or wordmark type roles
```

Write the accent's meaning in its comment. Critics read it, and it stops the accent drifting into decoration.

## 8. The accent

**Meaning first, hue second.** The meaning comes from the story, usually from the device's role: *now*, *risk*, *water*, *handled*, *set aside*, *new*, *yours*. Write it as one word in the token comment.

**Rules**
- **One token.** Two near-identical reds in the code read as a mistake on screen.
- **≤ 8% of the pixels** on any frame, except the one designed flood (usually the turn).
- **"Just happened."** New things arrive in the accent and relax to neutral over 10–30 f (typed letters over 12 f). The colour carries time without words.
- **One meaning.** Never success and error, never decoration ("the heading looked empty").
- **Check for collisions with UI semantics.** If the product UI shows errors in red and your accent is a red meaning "now", viewers will misread it. Choose another hue, or render UI errors with shape and a neutral.

**Choosing the hue.** Take it from the product's world: the brass of a plumb bob, water, the red antifouling paint below a hull's waterline, the red hand of a clock. Any hue is fine when it is chosen for a reason. Then fit it to the stage:

| On | Accent lightness (OKLCH L) | Chroma | Graphics contrast |
|---|---|---|---|
| A light stage | 0.50–0.65 | 0.10–0.20 (saturated reds up to ~0.23) | ≥ 3:1 |
| A dark stage | 0.70–0.82 | 0.08–0.16 | ≥ 3:1 |

- **Below 0.08 chroma** the accent reads as a grey rather than a signal.
- **Neon test.** OKLCH L > 0.85 with C > 0.15 is neon: it glows on ink and vibrates on paper. Lower one of them.

| Brand | Meaning | OKLCH | Hex | Stage | Contrast |
|---|---|---|---|---|---|
| Tessel | now | 0.61 0.225 24 | `#EC2A3A` | paper | 4.2:1 |
| Plumb | look here (the weight) | 0.78 0.12 85 | `#DBB155` | ink | 9.7:1 (only 1.9:1 on paper, so brass needs a dark stage) |
| Loam | water | 0.60 0.14 245 | `#1F86CD` | paper | 3.7:1 |
| Hush | handled | 0.76 0.10 165 | `#6FC5A1` | ink | 9.3:1 |
| Keel | set aside | 0.55 0.17 30 | `#C13E2E` | paper | 4.9:1 |

**Build and audit the palette with `scripts/palette.py`.** Given the accent (hex or `oklch(L C h)`), the stage (`--stage light|dark`) and the temperature (`--temp neutral|cool|warm`), it prints a `C` block for `tokens.ts` with neutrals tinted toward the accent, every contrast against the stage, and the checks above (statements ≥ 7:1, secondary ≥ 4.5:1, accent ≥ 3:1, chroma, neon, the lightness band), with a nearby fix when one fails. `--cover IMG` measures the accent's share of a still's pixels (within OKLab 0.08); on Tessel's frames it reads under 0.2% during the acts and 98% on the opening flood frame, the one designed exception.

## 9. Neutrals and the stage

Choose the stage first (§2): light or dark, cool, neutral or warm. `scripts/palette.py` builds either.
- **Ink.** Not pure black: OKLCH L 0.15–0.18 with chroma 0.003–0.008 (for example `#120E0E`). Pure black reads as a hole in the frame; a tinted ink reads as a material. On a dark stage it is the ground, and raised surfaces step up to L 0.21–0.23.
- **Paper.** L 0.96–0.99. Cool or neutral papers keep chroma ≤ 0.004; a warm paper for a warm brand goes to 0.008–0.015 toward hue 60–90. Pure white is fine for UI surfaces sitting on it.
- **2–4 steps between them:** mist for the canvas, line for hairlines, and mute for secondary text. Contrast against the ground: statements ≥ 7:1, secondary lines at 44 px and up ≥ 3:1, anything smaller ≥ 4.5:1. A grey like `#82868E` is 3.5:1 on paper: fine for a 48 px descriptor, too faint for 24 px UI copy.
- **Tint toward the accent.** Give the neutrals the accent's hue angle at chroma 0.003–0.010 so they read as one family. Warmth is a choice for a warm brand; warm neutrals picked by default slide into the beige tell.
- **Ink stays ink.** A white radial wash laid over ink cards turns them into grey buttons. Veil at 80–85% only where type sits.

## 10. Palettes that read as generated

These are combinations rather than hues, and they are the average of generated output. Avoid them when you are inventing; use them only if the brand already does.
- indigo or violet → blue gradients, and gradient text;
- neon on black (the §8 neon test on an ink stage);
- glassmorphism: backdrop blur, a 10–20% white fill and a 1 px white border;
- a beige or cream ground with an orange or terracotta accent, picked by default rather than for a warm brand;
- rainbow multi-hue gradients, mesh blobs and aurora washes;
- a dark UI with a coloured glow behind every hero element.

## 11. Surfaces: shadow and hairline

- **On paper**, use one soft key shadow per lifted surface: `0 20–40px 60–120px rgba(0,0,0,.12–.22)`, for example `0 28px 90px rgba(0,0,0,.16)`. A tight contact shadow of `0 1px 2px rgba(0,0,0,.06)` under it is optional.
- **On ink**, shadows vanish, so separate surfaces with a luminance step (ink → ink2) and a 1 px top hairline at 8–12% white: `inset 0 1px 0 rgba(255,255,255,.10)`.
- **Lifted objects.** The shadow grows with height; the offset, blur and alpha formulas are in `references/motion-tokens.md`.
- **Never** glass, glow, halo, bloom, an outer glow on text, an inner glow, or a gradient border.
- **Radii.** Use one card radius, one chip radius and the mark's radius. A nested radius is the outer radius minus the padding, or the corners look pinched.

## 12. Tonal stages and banding

- **Stages are tonal fields in the palette**: one or two large soft shapes a few code values off the ground (blurred 40–80 px), and at most a whisper of accent (≤ 4% alpha). They give depth without decoration, because they have a job: light the stage.
- **Chromium renders CSS gradients in 8 bits.** A gradient spanning fewer than about 30 code values shows contour bands; a glow on ink from code 11 to 29 showed about 18 rings. Nothing downstream removes bands quantized in the browser.
- **Bake stages as dithered PNGs** with `scripts/dither-gradient.py --spec backdrops.json --out public/fx` (`--example` prints a spec). It computes in float, adds ±1 LSB TPDF dither and quantizes once. Load the result with `<Img src={staticFile('fx/stage.png')} />`.
- For a glow over ink, use white with a dithered alpha, not a colour gradient.
- Check with the ×12 contrast stretch: `--preview out/qa/bands`, and the banding sheet from `scripts/forensics.py`.

## 13. Colour in motion

- **Mix in OKLab.** `interpolateColors` lerps gamma-encoded sRGB and rounds every channel each frame. Red → blue at 0.5 gives `rgba(128, 0, 128)`, a muddy dark purple; OKLab gives `rgb(140, 83, 162)`. Passing `oklch()` strings doesn't help, because they are converted to sRGB before the lerp. Use the starter's `mixColor(a, b, t)` from `src/lib/color.ts`, which mixes in OKLab and rounds once.
- **Slow global ramps step at 8 bits** however you mix: `#101010` → `#141414` over 100 f has only 5 distinct values. Keep slow tint changes on small areas, hide them inside motion, or cross-fade to a dithered PNG plate, whose per-pixel noise spreads the steps out.
- **Plan the luminance flips.** Write the film's light/dark sequence as one row in the treatment. Tessel's is paper → accent (iris) → paper → ink (flood) → paper → accent (flood) → grey → paper.
  - Carry each flip on a moving shape from the device (an iris, flood, shutter or implosion). Never a hard cut to a different luminance, and never a crossfade through black, which dips about 25%.
  - Land flips on downbeats, with the drop.
  - At most one flip per bar, and the accent floods the frame only once.
  - After a flip to dark, give the eye 12–20 f before any small type appears.
