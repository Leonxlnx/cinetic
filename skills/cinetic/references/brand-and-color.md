# Brand and colour

Covers naming, mark construction, the token file, the accent and its meaning, neutrals, surfaces, tonal stages and colour in motion. Read it at Step 2, before writing `src/brand/tokens.ts` and `src/brand/Mark.tsx`, and whenever a critic flags colour. Numbers are proven defaults and starting points, not dogma.

**Contents**
1. [When the brand is supplied](#1-when-the-brand-is-supplied)
2. [Naming](#2-naming)
3. [Mark construction](#3-mark-construction)
4. [The token file](#4-the-token-file)
5. [The accent](#5-the-accent)
6. [Neutrals](#6-neutrals)
7. [Palettes that read as generated](#7-palettes-that-read-as-generated)
8. [Surfaces: shadow and hairline](#8-surfaces-shadow-and-hairline)
9. [Tonal stages and banding](#9-tonal-stages-and-banding)
10. [Colour in motion](#10-colour-in-motion)

---

## 1. When the brand is supplied

The brand wins. Everything below is for what you have to invent, plus the method for fitting a real brand into a film.

- **Colours.** Map them to roles: the darkest neutral becomes `ink`, the lightest `paper`. Choose *one* brand colour as the film's accent and write down its meaning. The other brand colours appear only inside the product UI, where they already live.
- **Typeface.** Use it, serif and condensed included. Ship it locally (`@font-face` or a `@fontsource-variable/*` package) and gate it with `FontGate`.
- **Logo.** Use the vector file. Don't redraw or "improve" it. Find the device in its geometry (a dot, a corner, a counter, a stroke end); if there is none, the device is the accent colour itself. Build the sting by splitting the logo along its existing shapes.
- **Wordmark only.** Take the device from a letter feature: the dot of an i, a crossbar, a terminal.
- **Brand guidelines that conflict with a rule here** (a gradient in the logo, a second accent): follow the guidelines, and use the rule to limit the damage. Show the gradient only in the logo, and let the second colour appear only in UI.

## 2. Naming

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

**Wordmark.** Set it in the film's sans at the display weight, tracked −0.04 to −0.06 em. Lowercase reads approachable and sentence case reads institutional; choose one and match it in copy. Allow one custom detail only if it is the device (the i's dot in the accent). No swooshes, gradient fills or custom ligatures.

## 3. Mark construction

The mark is built from the same primitives the film animates, so the logo sting and the end card come for free.

**Construction rules**
- **2–4 primitives** in a 100-unit box: rectangle, rounded rectangle, circle, half-disc, quarter-circle. Triangles rarely.
- **Gaps ≥ 8 units.** At 16 px, 8 units is 1.28 px, the smallest gap that survives downscaling. Smaller gaps fill in and turn the mark into a blob; they also crawl under perspective (see `references/chromium-rendering.md`).
- **Strokes ≥ 10 units** if the mark must work at 16 px (1.6 px). Otherwise draw a small-size variant that drops them.
- **One radius token for every rounded corner, and one signature corner that breaks it**: a fully round corner among soft ones, or one square corner. That break is what the eye remembers at 16 px.
- **The device is one primitive, in the accent**; the others are ink.
- **Optical corrections.** A circle beside a square of the same height looks smaller, so enlarge it a few percent. Horizontal bars look heavier than vertical bars of equal thickness, so thin them slightly.
- **It assembles.** Each primitive can enter on its own and land with a contact squash. That is the logo sting (`references/formats.md`).
- **It says the idea**: pieces that tile one square, a weight on a line, a keel below the waterline.

**The starter's contract.** `src/brand/Mark.tsx` exports `MARK` with pieces `A` (a path), `B` (a rect) and `D` (a circle, in the accent), per-piece transforms, an `only` prop that draws a subset (the dot alone, before the mark exists) and `placeMark()` for transform-only placement. Replace the geometry and keep the contract. Plumb's mark drops straight in:

```ts
export const MARK = {
  A: { d: 'M0 0H40A12 12 0 0 1 52 12V88A12 12 0 0 1 40 100H12A12 12 0 0 1 0 88Z', cx: 26, cy: 50, w: 52, h: 100 }, // the file: square top-left corner is the signature
  B: { x: 75, y: 0, w: 10, h: 36, r: 0 }, // the plumb line: 10 units, so 1.6 px at 16 px
  D: { cx: 80, cy: 64, r: 20 }, // the bob, in the accent: 8 units from A and from B
};
```

More worked marks, in 100-unit coordinates:

| Brand | Primitives | Idea | What testing taught |
|---|---|---|---|
| Hush | pill 24,0 → 100,16 (r 8); rounded square 0,24 → 76,100 (r 14); pip ⌀24 at 38,62 in the accent | the folded pile peeks out behind one incident; one pip survives | the pip sits inside the square, so the one-colour version needs it as a knockout |
| Keel | pill 0,30 → 100,50; half-disc, flat top at y 58, r 42, in the accent | a deck above the waterline, the hull below it in hull red | an 8-unit gap between waterline and hull still reads at 16 px |
| Loam | top block 0,0 → 100,50 (top corners r 14); bottom block 0,58 → 100,100 (bottom corners r 14) in the accent | a pot in section; the waterline sits at the healthy 42% | the first two tries failed the tell test: three stacked bars read as a menu icon, a half-disc over a line as a sunrise |

**Tests.** Render the starter's `Stills` folder (`npx remotion still Mark16 out/stills/mark16.png`, then `MarkLarge` and `MarkSizes`) and look at them:
1. **16 px:** every piece is distinct and every gap is visible.
2. **Silhouette:** all ink. The mark is still recognisable.
3. **One colour:** the accent becomes ink (or a knockout). The mark still works.
4. **Inverse:** paper on the ink stage.
5. **In motion:** each primitive alone reads as a piece of the product's world.
6. **Tell test:** it is not a letter in a rounded square, a gradient blob, an abstract swoosh, a hexagon network, a four-point sparkle, or a generic UI icon (menu, toggle, chat bubble, sunrise).

## 4. The token file

`src/brand/tokens.ts` is the only place a colour, family, size or tracking value is written, and `scripts/lint-film.mjs` fails any hex colour that isn't declared there. The starter's file already has this shape; extend it rather than forking it. Its values are stand-ins marked `// cinetic:placeholder` (so are the starter's mark and demo name), and `lint-film.mjs` reports an error until you replace them and delete the markers: the film's palette comes from the user's brand or from the work in this file, never from the starter.

```ts
export const C = {
  ink: '#0E0F12',   // type and marks on paper; the dark stage (OKLCH 0.17 / 0.006 / 260)
  ink2: '#191B1E',  // raised surfaces on ink
  paper: '#F8F9FA', // the light stage: cool, never cream unless the brand is
  mist: '#EEF0F3',  // canvas behind the product
  line: '#DDE0E4',  // hairlines, ≥ 1.5 px on screen
  mute: '#656970',  // secondary text: 5.2:1 on paper, safe at any size
  accent: '#C13E2E', // MEANING: "set aside". Arrives on new things, relaxes to ink; ≤ 8% of pixels.
};
export const FONT = { sans: '"Geist Variable", system-ui, sans-serif', mono: '"Geist Mono Variable", ui-monospace, monospace' };
export const FACES = ['400 16px "Geist Variable"', '600 16px "Geist Variable"', '400 16px "Geist Mono Variable"']; // what FontGate waits for
export const TYPE = {  // one token per role (references/copy-and-type.md)
  display: { size: 120, weight: 600, track: -0.045, lead: 1.0 },
  secondary: { size: 48, weight: 450, track: -0.02, lead: 1.15 },
  ui: { size: 24, weight: 500, track: -0.01, lead: 1.3 },
};
// add as needed: SHADOW (§8), RADIUS ({ mark: 12, card: 20, chip: 10 }), and emphasis or wordmark type roles
```

Write the accent's meaning in its comment. Critics read it, and it stops the accent drifting into decoration.

## 5. The accent

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
| Paper | 0.50–0.65 | 0.10–0.20 (saturated reds up to ~0.23) | ≥ 3:1 |
| Ink | 0.70–0.82 | 0.08–0.16 | ≥ 3:1 |

- **Below 0.08 chroma** the accent reads as a grey rather than a signal.
- **Neon test.** OKLCH L > 0.85 with C > 0.15 is neon: it glows on ink and vibrates on paper. Lower one of them.

| Brand | Meaning | OKLCH | Hex | Stage | Contrast |
|---|---|---|---|---|---|
| Tessel | now | 0.61 0.225 24 | `#EC2A3A` | paper | 4.2:1 |
| Plumb | look here (the weight) | 0.78 0.12 85 | `#DBB155` | ink | 9.7:1 (only 1.9:1 on paper, so brass needs a dark stage) |
| Loam | water | 0.60 0.14 245 | `#1F86CD` | paper | 3.7:1 |
| Hush | handled | 0.76 0.10 165 | `#6FC5A1` | ink | 9.3:1 |
| Keel | set aside | 0.55 0.17 30 | `#C13E2E` | paper | 4.9:1 |

To pick and audit tokens, convert OKLCH to hex with a throwaway script (`npx tsx pick.ts`):

```ts
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export const oklchToHex = (L: number, C: number, h: number) => {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  if (rgb.some((v) => v < -1e-4 || v > 1 + 1e-4)) throw new Error(`oklch(${L} ${C} ${h}) is outside sRGB`);
  return '#' + rgb.map((v) => Math.round(255 * gam(Math.min(1, Math.max(0, v)))).toString(16).padStart(2, '0')).join('');
};
console.log(oklchToHex(0.55, 0.17, 30)); // #c13e2e
```

**Measure coverage** on any still (the eval gate checks the final frame):

```python
# accent_cover.py IMG '#C13E2E' -> share of pixels within OKLab distance 0.08 of the accent
import sys, numpy as np, cv2
def oklab(rgb):
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    lms = np.cbrt(c @ np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]]).T)
    return lms @ np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]]).T
rgb = cv2.cvtColor(cv2.imread(sys.argv[1]), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
ref = np.array([int(sys.argv[2].lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
print(f"accent coverage {100 * (np.linalg.norm(oklab(rgb) - oklab(ref), axis=-1) < 0.08).mean():.2f}%")
```
On Tessel's frames this reads under 0.2% during the acts and 98% on the opening flood frame, which is the one designed exception.

## 6. Neutrals

- **Ink.** Not pure black: OKLCH L 0.15–0.18 with chroma 0.003–0.008 (for example `#0E0F12`). Pure black reads as a hole in the frame; a tinted ink reads as a material.
- **Paper.** L 0.97–0.99 and chroma ≤ 0.004, cool (`#F8F9FA`). Pure white is fine for UI surfaces sitting on it.
- **2–4 steps between them:** mist for the canvas, line for hairlines, and mute for secondary text. Contrast against the ground: statements ≥ 7:1, secondary lines at 44 px and up ≥ 3:1, anything smaller ≥ 4.5:1. A grey like `#82868E` is 3.5:1 on paper: fine for a 48 px descriptor, too faint for 24 px UI copy.
- **Tint toward the accent.** Give the neutrals the accent's hue angle at chroma 0.003–0.010 so they read as one family. Keep them cool unless the brand is warm; warm neutrals by default slide into the beige tell.
- **Ink stays ink.** A white radial wash laid over ink cards turns them into grey buttons. Veil at 80–85% only where type sits.

## 7. Palettes that read as generated

These are combinations rather than hues, and they are the average of generated output. Avoid them when you are inventing; use them only if the brand already does.
- indigo or violet → blue gradients, and gradient text;
- neon on black (the §5 neon test on an ink stage);
- glassmorphism: backdrop blur, a 10–20% white fill and a 1 px white border;
- a beige or cream ground with an orange or terracotta accent;
- rainbow multi-hue gradients, mesh blobs and aurora washes;
- a dark UI with a coloured glow behind every hero element.

## 8. Surfaces: shadow and hairline

- **On paper**, use one soft key shadow per lifted surface: `0 20–40px 60–120px rgba(0,0,0,.12–.22)`, for example `0 28px 90px rgba(0,0,0,.16)`. A tight contact shadow of `0 1px 2px rgba(0,0,0,.06)` under it is optional.
- **On ink**, shadows vanish, so separate surfaces with a luminance step (ink → ink2) and a 1 px top hairline at 8–12% white: `inset 0 1px 0 rgba(255,255,255,.10)`.
- **Lifted objects.** The shadow grows with height; the offset, blur and alpha formulas are in `references/motion-tokens.md`.
- **Never** glass, glow, halo, bloom, an outer glow on text, an inner glow, or a gradient border.
- **Radii.** Use one card radius, one chip radius and the mark's radius. A nested radius is the outer radius minus the padding, or the corners look pinched.

## 9. Tonal stages and banding

- **Stages are tonal fields in the palette**: one or two large soft shapes a few code values off the ground (blurred 40–80 px), and at most a whisper of accent (≤ 4% alpha). They give depth without decoration, because they have a job: light the stage.
- **Chromium renders CSS gradients in 8 bits.** A gradient spanning fewer than about 30 code values shows contour bands; a glow on ink from code 11 to 29 showed about 18 rings. Nothing downstream removes bands quantized in the browser.
- **Bake stages as dithered PNGs** with `scripts/dither-gradient.py --spec backdrops.json --out public/fx` (`--example` prints a spec). It computes in float, adds ±1 LSB TPDF dither and quantizes once. Load the result with `<Img src={staticFile('fx/stage.png')} />`.
- For a glow over ink, use white with a dithered alpha, not a colour gradient.
- Check with the ×12 contrast stretch: `--preview out/qa/bands`, and the banding sheet from `scripts/forensics.py`.

## 10. Colour in motion

- **Mix in OKLab.** `interpolateColors` lerps gamma-encoded sRGB and rounds every channel each frame. Red → blue at 0.5 gives `rgba(128, 0, 128)`, a muddy dark purple; OKLab gives `rgb(140, 83, 162)`. Passing `oklch()` strings doesn't help, because they are converted to sRGB before the lerp. Use the starter's `mixColor(a, b, t)` from `src/lib/color.ts`, which mixes in OKLab and rounds once.
- **Slow global ramps step at 8 bits** however you mix: `#101010` → `#141414` over 100 f has only 5 distinct values. Keep slow tint changes on small areas, hide them inside motion, or cross-fade to a dithered PNG plate, whose per-pixel noise spreads the steps out.
- **Plan the luminance flips.** Write the film's light/dark sequence as one row in the treatment. Tessel's is paper → accent (iris) → paper → ink (flood) → paper → accent (flood) → grey → paper.
  - Carry each flip on a moving shape from the device (an iris, flood, shutter or implosion). Never a hard cut to a different luminance, and never a crossfade through black, which dips about 25%.
  - Land flips on downbeats, with the drop.
  - At most one flip per bar, and the accent floods the frame only once.
  - After a flip to dark, give the eye 12–20 f before any small type appears.
