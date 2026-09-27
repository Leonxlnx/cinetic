# Copy and type

Covers the words (budget, voice, callback copy, stock phrasing, string audit) and the letters (one family, scale, tracking, numerals, kinetic-type recipes, measuring and fitting). Read the copy half at Step 1 while writing `TREATMENT.md` and the type half at Step 2 before writing `src/brand/tokens.ts`. Numbers are proven defaults at 1920×1080 and 60 fps, starting points rather than dogma. A supplied brand voice or typeface wins over every default here.

**Contents**
1. [Copy budget](#1-copy-budget)
2. [Writing a line](#2-writing-a-line)
3. [Callback copy](#3-callback-copy)
4. [Stock phrasing to cut](#4-stock-phrasing-to-cut)
5. [String audit](#5-string-audit)
6. [One family, two weights](#6-one-family-two-weights)
7. [Type scale](#7-type-scale)
8. [Kinetic type: one recipe per role](#8-kinetic-type-one-recipe-per-role)
9. [Recipe code](#9-recipe-code)
10. [Measuring and fitting text](#10-measuring-and-fitting-text)

---

## 1. Copy budget

Count every word the viewer has to read, including UI text that carries meaning. UI texture that is too small or too brief to read costs nothing, but then it can't carry meaning either.

| Format | Words in the film | Per line | Per shot |
|---|---|---|---|
| Launch film, 30 s | aim 15–25, cap 35 | ≤ 5 (about 24 characters) | ≤ 2 lines, one idea |
| Product / feature video | ≤ 15 | ≤ 5 | 1 line |
| Feature loop | ≤ 8, must read muted | ≤ 4 | 1 line |
| Logo sting | the name + ≤ 4 | ≤ 4 | 1 line |
| UI walkthrough | ≤ 6 per caption | ≤ 6 | 1 caption |

Why so few: a viewer reads about 3 words per second while also watching motion, and every word you add steals attention from the picture that is meant to carry the idea. Tessel's statements total 15 words across 33 s.

## 2. Writing a line

**Voice**
- Use the viewer's words at the moment of pain, not the marketer's. What would they say out loud? ("Looks good to me." "Not again.")
- Nouns, verbs and numbers. Cut praise adjectives (fast, powerful, smart, beautiful); a number beats an adjective every time.
- Present tense, active voice. Make the viewer's world the subject, not the product: "Meetings move over." rather than "Tessel moves your meetings."
- Sentence case with a period at the end of a statement. The period gives finality and can become a design element (in Tessel it is the device). No exclamation marks, questions, emoji or suspense ellipses.

**The line test.** Every line must pass all six:
1. It is true on its own paused frame: the picture agrees with it.
2. A competitor could not say it.
3. It has ≤ 5 words.
4. It contains no praise adjective.
5. Read aloud, it sounds like a person talking.
6. It will still be true in a year, so no "new", "now with" or "introducing".

**Generating lines.** Write 15–20 candidates per slot quickly, pulling words from the inventory in `TREATMENT.md` (verbs, the number, the pain scene). Cut with the line test. Then read the survivors in order, aloud, on the beat, and keep the set whose words echo one another. That echo is the start of a callback.

## 3. Callback copy

A callback plants a phrase early and pays it off later, changed by what the film has shown. It is how a 20-word film feels written rather than labelled.

| Mechanism | Setup → payoff | Example |
|---|---|---|
| Same words, new truth | The line returns unchanged; the picture changed its meaning | Plumb: "Looks good to me." (a tired lie at 0:04) → "Looks good to me." (true at 0:22) |
| One word flips | The refrain changes by one word | Tessel: "Your week doesn't fit." → "Everything fits." |
| The digit | A number or time changes by the smallest amount | Hush: "3:12 a.m." → "3:13 a.m." |
| The user's words | Text the user typed into the product returns as statements | Tessel: typed "Protect my mornings." → "Mornings stay yours." |
| Grammar rhyme | Lines share one structure, so the difference is the message | Loam: "18%. Water now." / "42%. Leave it." |
| Tautology as proof | Repetition shows that nothing was touched | Keel: "Spending money stays spending money." |

Rules:
- The payoff reuses at least one content word from the setup, or the viewer won't hear the echo.
- The payoff lands on the payoff beat, which is also the loudest sound in the film.
- The setup holds long enough to be remembered: at least 36 f + 6 f per word after it resolves.
- Never explain the callback on screen.
- Use one main chain per film, plus at most one echo. More than that becomes a gimmick.

## 4. Stock phrasing to cut

These mark a film as a template. Cut them on sight unless the brand's own voice uses them.

- **Openers:** Introducing, Meet, Say hello to, Say goodbye to, Ready to…?, What if…?, Imagine…, One more thing.
- **Claims:** the future of, reimagined, redefined, next-gen, revolutionary, game-changing, like never before, and more.
- **Verbs:** unlock, supercharge, streamline, elevate, empower, level up, transform your, harness.
- **Adjectives:** seamless(ly), effortless(ly), powerful, smart, intelligent, AI-powered, all-in-one, at scale.
- **Nouns:** workflow, productivity, solution, experience, journey.
- **Structures:** a feature name as a headline ("Smart Split"); eyebrow or kicker labels ("NEW FEATURE"); a tagline stacked over a headline; three-item lists ("Plan. Track. Win.").

## 5. String audit

Run this before every review round. Proofing bugs read as "fake" faster than any motion flaw.

- **Plurals and zero.** Use a helper; zero reads as "No clashes", never "0 clashes".
  ```ts
  export const plural = (n: number, one: string, many: string, none = `No ${many}`) =>
    n === 0 ? none : `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
  // plural(0,'clash','clashes') → "No clashes"; 1 → "1 clash"; 2184 → "2,184 clashes"
  ```
- **Casing.** The brand name is cased one way everywhere. Statements use sentence case. No ALL-CAPS labels.
- **Punctuation.** Curly apostrophes and quotes (’ “ ”), en dash for ranges (9–5), × for dimensions, no double spaces.
- **Numbers.** One time format, one currency format, thousands separators, and tabular figures (§6).
- **Data.** Dates match weekdays, and counts match the items shown. Assert them in `data.ts` (see `references/product-ui.md`).
- **Names.** Invented, plausible and varied. Never real people or companies, "John Doe", "Acme" or example domains.
- **Source of truth.** Every on-screen string lives in `COPY` (`src/timeline.ts`) or `data.ts`. A string hard-coded inside an act escapes both the audit and the word count.

```bash
# straight apostrophes, "1 things", placeholders
grep -rnP "\w'\w|\b1 [a-z]+s\b|lorem|ipsum|TODO|FIXME|Acme|John Doe|example\.com" src/
```

**Reading time** is owned by `references/timing-grid.md`: hold a line ≥ 36 f + 6 f per word after it resolves (1 word → 42 f, 3 → 54 f, 5 → 66 f), hold the lockup 1.5–2 s, and keep a URL readable ≥ 1.7 s. `scripts/grid-check.ts` enforces these holds from `COPY`.

## 6. One family, two weights

- **One well-made sans, shipped as a local variable font** from `@fontsource-variable/*`. The starter ships `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`. To change the family, install another package, import it in `src/brand/fonts.ts`, and update `FONT` and `FACES` (the faces `FontGate` waits for) in `src/brand/tokens.ts`. Why: a variable axis lets you pick 560 exactly, local files render identically offline, and one family makes display, UI and wordmark agree.
- **Choose it on purpose.** The ubiquitous UI default families read as "template" unless you chose them for a reason. Render a still of the name and the key statement in three candidates and compare the numerals, the "a", "g" and "t", and the width at display size.
- **Two weights** from the variable axis, for example 600 for display and 450 for text. Never animate weight on text that reflows (a chip whose weight changes pushes the rest of the line).
- **Mono** only for code, terminal output or aligned data. Mono timestamps in a consumer UI read as a developer-tool tell.
- **Serif, italic and condensed display faces** are the commonest generated-look tells. Use them only when the brand calls for them; otherwise take emphasis from size or motion.
- **One token per role.** If display is 600 / −0.045 em (the starter's value), it is exactly that in every scene. Near-miss values across scenes (590, 600, 620; −0.04, −0.05, −0.06) read as "almost matched".
- **Numerals.** `fontVariantNumeric: 'tabular-nums'` on anything that counts, changes or aligns, so counters don't jitter in width.

**Tracking tightens as size grows:**

| Size at 1080p | Tracking | Leading |
|---|---|---|
| ≥ 160 px (payoff, wordmark) | −0.05 to −0.06 em | 0.95 |
| 88–160 px (statements) | −0.04 to −0.05 em | 0.95–1.05 |
| 44–88 px (secondary) | −0.015 to −0.03 em | 1.1–1.2 |
| 22–44 px (UI, captions) | −0.01 to 0 em | 1.3–1.4 |
| All caps, if the brand uses them | +0.04 to +0.08 em | – |

## 7. Type scale

| Role | 16:9 (1920×1080) | 9:16 (1080×1920) | 1:1 (1080×1080) | Weight |
|---|---|---|---|---|
| Emphasis / payoff | 1.5–1.7× the statement (132–218 px) | 1.3–1.5× | 1.4–1.6× | 600 |
| Statement | 88–128 px, ≤ 5 words per line | 90–120 px, ≤ 3 words per line | 80–110 px | 600 |
| Slam | fit to ~77% of frame width | fit to ~86% | fit to ~84% | 600 |
| Secondary / descriptor, URL | 44–56 px | ≥ 48 px | 44–52 px | 450–500 |
| Walkthrough caption | 40–48 px | ≥ 44 px | 40–48 px | 500 |
| Readable UI, after camera scale | ≥ 22 px (28 preferred) | ≥ 32 px | ≥ 28 px | 450–500 |

- Keep a ratio of at least 2:1 between a headline and the secondary line; a flat scale (everything at 48–64 px) reads as a slide.
- Contrast against the ground: statements ≥ 7:1, secondary lines at 44 px and up ≥ 3:1, anything smaller ≥ 4.5:1.
- Size the wordmark optically: set its ascender or cap height about equal to the mark's height, then check it in a still.
- For 9:16, re-lay the type rather than cropping the master. Keep it out of the top ~14% and bottom ~20%, where the feed UI sits; `references/formats.md` has the safe zones.

## 8. Kinetic type: one recipe per role

Give each text role exactly one reveal system and reuse it. A film has about four roles: statement, slam, hero word and UI text. Animate words, not letters; the one exception is the hero word. Blur only on entry, and land sharp.

| Recipe | Role | Numbers | Budget |
|---|---|---|---|
| **Word reveal** (`src/fx/Words.tsx`) | statements | per word over 26 f on `E.out`, 6–9 f stagger: opacity 0 → 1; `translateY` 0.32 em → 0 through `arrive(p)`; blur 14 px (8 px on body lines) → 0 through `blurIn(p, px)`, clear by 60% of the eased move; exit at half the stagger over 16 f on `E.in` (`depart`, `blurOut`) | the default |
| **Slam** | the problem headline | from `cue − 1` over 15 f on `E.out`: scale 1.2 → 1, blur 22 → 0 px through `blurIn`, opacity 0 → 1; then a slow grow of 1 → 1.05 on `E.smooth` through the hold; width fitted to ~77% of the frame | 1–2 per film |
| **Locking words** | the payoff line | two words enter from opposite edges on `SPR.word` (20/170/0.9), launched `delayTo(SPR.word, 1)` = 19 f before the cue; each is clamped at its lock; a +1.8% `hitPulse(t, 1, 4)` punch; a push of 1 → 1.03 through the hold | 1 per film |
| **Tracking collapse** | the hero word | per-glyph spread of +0.6–0.8 em → 0 over 24 f on `E.out`; colour accent → ink over 20 f | once per film |
| **Drum** | a run of statements, one per bar | lines 0.30–0.42 rad apart on a 500 px drum, `scaleY(cos a)`, masked to one line; one `SPR.detent` (24/380/0.6) roll per bar, reaching the lock in 10 f; 3 ratchet ticks 3 f apart into each detent | 1 run |
| **Underline → block** | a word that becomes a shape, then the mark | a line 0.1 em thick at baseline + 0.07 em, drawn left to right over 16 f on `E.out`; from +14 f it swells to top = baseline − 0.8 em and height 1.04 em over 12 f; the glyphs melt under it over 10 f | 1 per film |
| **Label roll** | a UI label or counter changing | old label y 0 → −0.6 em over 10 f on `E.in`; new label +0.6 em → 0 over 14 f on `E.out`, overlapping 4 f; digits roll 6–8 f each in tabular figures | as needed |
| **Typed input** | the user's words | about 30 characters/s on a weighted cadence; each letter arrives in the accent and relaxes to ink over 12 f (`references/product-ui.md`) | 1 per film |

Why these numbers:
- **Blur clears early** (`blurIn`, `blurOut` in `src/lib/anim.ts`) because Chromium renders a blur radius in ~0.5 px steps and anything under ~0.75 px fully sharp. A blur that fades with the move's slow tail snaps into focus a few frames after the text has visibly stopped; one that is gone by 60% of the move finishes while the word is still fast and half transparent.
- **The rise ends on `arrive`** because the headless shell snaps a text layer's vertical position to whole pixels: an ease-out's last few pixels arrive as 1 px ticks with holds between them. Details in `references/chromium-rendering.md` §15.
- **The slam grows** because a headline that sits static past 48 f reads as a stalled player.
- **Locks never pass the lock** because overshoot closes the word space: Tessel showed "Everythingfits" for 6 f.
- **Underline, never strike-through**, because a line through your own promise crosses it out.
- **The drum masks to one line** because two readable lines at once is a text wall; neighbours show only as unreadable slivers.

`SPR.word` and `SPR.detent` live in the starter's `src/lib/anim.ts`. Add any new preset there with a comment, never inline in an act: the lint treats spring configs in acts as errors.

## 9. Recipe code

Each snippet was type-checked against the starter's `src/lib` and `src/brand` and rendered with Remotion 4.0.529. `f` is the act-local frame, and everything renders inside `<FontGate>` because it measures text.

**Slam**
```tsx
import { blurIn, E, mix, prog, tw } from '../lib/anim';
import { fitSize } from '../lib/measure';
import { C, TYPE, typeStyle } from '../brand/tokens';

export const Slam: React.FC<{ f: number; cue: number; out: number; text: string; width?: number; y?: number }> = ({
  f, cue, out, text, width = 1480, y = 540 }) => {
  const { weight, track } = TYPE.display;
  const size = fitSize(text, width, 480, weight, track);          // the measured line fills `width`
  const s = prog(f, cue - 1, cue + 14, E.out);                    // first new picture on the hit frame
  const k = mix(1.2, 1, s) * tw(f, cue, out, 1, 1.05, E.smooth);  // slam, then a slow grow
  return (
    <div style={{ ...typeStyle('display', size), position: 'absolute', left: 0, top: 0, width: 1920,
      textAlign: 'center', color: C.ink, transformOrigin: '960px 50%',
      transform: `translateY(${y - size / 2}px) scale(${k})`, opacity: s, filter: `blur(${blurIn(s, 22)}px)` }}>
      {text}
    </div>
  );
};
```

**Locking words**: the part that matters; place each word by `transform`.
```ts
import { spring } from 'remotion';
import { E, SPR, hitPulse, mix, prog } from '../lib/anim';
import { delayTo } from '../lib/sync';
import { FPS } from '../timeline';

const LEAD = delayTo(SPR.word, 1); // 19 f: export it as a sync constant for the lock sound
// x0: left edge of the locked line; wa: measured width of word A; gap: the word space (~0.24 em)
const s = spring({ frame: f - (cue - LEAD), fps: FPS, config: SPR.word });
const da = Math.min(0, mix(-(x0 + wa + 200), 0, s));                // left word: never past its slot
const db = Math.max(0, mix(1920 - (x0 + wa + gap) + 120, 0, s));     // right word: never past its slot
const k = (1 + 0.018 * hitPulse(f - cue, 1, 4)) * mix(1, 1.03, prog(f, cue, cue + 150, E.linear));
// word A at translate(x0 + da), word B at translate(x0 + wa + gap + db); the wrapper scales by k about the centre
```

**Tracking collapse**: glyphs sit at their *kerned* positions, so the rest pose matches a normal text run.
```tsx
const m = (s: string) => measureTracked(s, size, weight, track);
const chars = [...text];
const at = chars.map((ch, i) => m(chars.slice(0, i + 1).join('')) - m(ch)); // keeps pair kerning
const p = prog(f, start, start + 24, E.out);
const spread = (1 - p) * 0.7 * size;                                     // +0.7 em per letter at the start
const mid = (chars.length - 1) / 2;
const color = mixColor(C.accent, C.ink, prog(f, start + 4, start + 24, E.smooth)); // src/lib/color.ts, OKLab
// each glyph: <span style={{ position:'absolute', left:0, top:0, color,
//   transform:`translate(${x + at[i] + (i - mid) * spread}px, ${y}px)` }}>{chars[i]}</span>
```

**Underline → block**: draw it as an SVG rect so the geometry stays sub-pixel, and clamp every size at 0. `baseY` is the line box's top plus `baselineOf(size, weight, lead)` from `src/lib/measure.ts`.
```tsx
const draw = prog(f, start, start + 16, E.out);
const sw = prog(f, start + 14, start + 26, E.out);
const pad = 8; // negative tracking lets the last glyph's ink overhang the measured width
const top = mix(baseY + 0.07 * em, baseY - 0.8 * em, sw);
const h = Math.max(0, mix(0.1 * em, 1.04 * em, sw));
const glyphs = 1 - prog(f, start + 16, start + 26, E.smooth); // opacity of the word under the block
// <rect x={x - pad} y={top} width={Math.max(0, (w + 2 * pad) * draw)} height={h}
//       rx={Math.max(0, Math.min(h / 2, 0.05 * em + 0.08 * em * sw))} fill={C.ink} />
```
The block can then accelerate into a mark piece and land with a contact squash; that seam is "words become the mark" in `references/transitions.md`.

**Drum**
```tsx
const STEP = 0.42, R = 500; // radians between lines; drum radius in px
const turned = detents.reduce((a, t) => a + spring({ frame: f - t, fps: FPS, config: SPR.detent }), 0);
lines.map((text, i) => {
  const a = Math.max(-1.45, Math.min(1.45, (i - turned) * STEP));
  // translate(x, axisY + R * sin(a) - size / 2) scaleY(cos(a)), transformOrigin '0 50%';
  // parent mask: linear-gradient(transparent axisY-1.5·size, #000 axisY-0.55·size, #000 axisY+0.55·size, transparent axisY+1.5·size)
});
```

## 10. Measuring and fitting text

- **Measure after the fonts load.** `FontGate` delays the render until every face is decoded. Measure only in its children; a measurement taken earlier returns the fallback face's width.
- **The starter's `src/lib/measure.ts`:**
  - `measureTracked(text, size, weight, trackEm, family?)` measures a hidden DOM span with the real family, tracking and tabular figures.
  - `fitSize(text, maxWidth, max, weight, trackEm)` returns the largest size ≤ `max` at which the line fits; width is linear in size at a fixed em tracking, so one measurement is enough.
  - `inkBox(text, size, weight)` returns the glyphs' real ink extents (ascent, descent, left, right) from the font; use it to sit a dot on the baseline or a mark on the cap height instead of guessing from the font size.
  - `baselineOf(size, weight, lead)` is the distance from the top of a CSS line box to its baseline.
- **Measure what you render.** Same family, weight, tracking and numeric variant. `measureTracked` measures tabular figures, and `typeStyle()` renders them, so keep the two together.
- **Ink versus box.**
  - Chromium includes the trailing letter-spacing in the measured width, so with negative tracking a glyph with a small right side bearing can overhang the box by up to |track| × size (about 9 px at 176 px and −0.05 em). Pad covering boxes by about 8 px.
  - Side bearings offset the ink from the box on the left too: in the starter's sans, a 176 px "m" starts 13 px inside its box. Align ink rather than boxes, nudging by a bearing measured in a still.
- **Break lines by hand.** Put one string per line in `COPY` and render one block per line. Automatic wrapping leaves widows (one word alone on the last line), and HyperFrames bans `<br>`.
- **`@remotion/layout-utils`**, if you use it:
  - `fitText({text, withinWidth, fontFamily, fontWeight, letterSpacing})` returns `{fontSize}`; it measures at 100 px and scales.
  - `fitTextOnNLines({text, maxLines, maxBoxWidth, fontFamily, fontWeight, letterSpacing, maxFontSize})` returns `{fontSize, lines}`. It binary-searches the size and breaks greedily on single spaces, so you don't choose the breaks; prefer hand-set lines for statements.
  - `letterSpacing` is a string (`'-0.05em'`), and `fontFamily` is the loaded family name (`'Geist Variable'`).
  - **The cache gotcha.** Measurements go into a module-level cache that is never cleared. Its key is text, family, weight, size, letterSpacing, textTransform and additionalStyles, but *not* `fontVariantNumeric`, so a tabular and a proportional measurement of the same string collide. A measurement taken before the font loads is cached with the fallback width for the rest of the render. Call these functions only inside `FontGate`, and pass `validateFontIsLoaded: true`, which throws when the fallback face measures identically (it needs more than 4 distinct characters to tell).
