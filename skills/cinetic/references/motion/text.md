# Text in motion

Type in a launch film is an **event**, not a caption. A line lands, the newest word is marked, the line makes room for
the next, and it leaves on motion. All numbers are at 30 fps and 1920x1080. Kit imports: `import { Words, Swap, Typing,
useTyped, Scramble, Odometer, Marker, at, mix, ease, springAt, springs, stagger, rand } from './kit'`.

## House rules (read before any recipe)

1. **Pick one or two arrival styles per film** and use them everywhere. Five styles is a template.
2. **Emphasis is colour, size, position, focus and timing. Never bounce.** Text does not overshoot, wobble or spring.
   The only overshoot allowed is a 4-7 % scale overshoot on individually tossed letters (one title per film at most).
3. **Never fade text alone.** A plain opacity ramp reads unsure. Cut on, or combine with blur, colour, a mask or a move.
   Fades of 2-4 f inside a word are fine; a 20 f fade-in of a whole line is not.
4. **Front-load every move.** Re-centres and arrivals put 50-80 % of their travel in the first 1-2 frames. A symmetric
   ease-in-out on text always looks late.
5. **Size is a decision**: either small (cap 40-75 px, the frame breathing around it) or giant (cap 300-700 px, cropped
   by the frame). Medium-everything is the template look.
6. **Copy**: 2-4 words per title, sentence case unless the world is a caps world, real nouns. A line should be readable
   in `words / 3 + 0.5` s; the film's pace decides the rest.
7. **Decode, scramble and glitch only on short strings** (names, labels, URLs, under ~20 characters).

---

## 1. Builds and re-centring

### 1.1 Cut-on stack
**What:** words appear complete on their first frame (no fade, no blur), one every 2-3 f, ideally on musical plucks. The
whole block is one group that keeps creeping (shrinks ~0.3-0.4 % per frame, drifts 0.5-1 px/f).
**When:** hooks and category lines on calm worlds (soft air, ink on white, poster). The most confident build there is.
**Numbers:** gap 2-3 f; block scale 1.00 -> 0.96 over 12 f, then creep. When the line must wrap: re-lay out in 3 f (block
scale -7 % on the first), then line-2 words cut on 50 px below their slot and rise with `cubic-bezier(0.16,0.84,0.30,1)`
over 14 f (spring `{stiffness: 210, damping: 26}` is equivalent), 2-3 f apart.

```tsx
const blockScale = 1 - 0.0035 * Math.min(frame, 40) - 0.0006 * Math.max(0, frame - 40);
<div style={{ transform: `scale(${blockScale})` }}>
  <Words text="Your work, handled" arrive="cut" gap={2.5} style={{ fontSize: 92, color: ink }} />
</div>
```
**Avoid:** per-letter staggers; giving line 1 the same rise as line 2 (line 1 cuts, line 2 rises: that contrast is the move).

### 1.2 Lead-heavy re-centre (append mode)
**What:** a centred line grows one word at a time; on the frame a word is appended, the **whole line jumps toward its new
centre**, with ~60-70 % of the travel in frame 1.
**When:** any word-by-word build of a centred statement. This single number decides whether captions feel on time.
**Numbers:** per-frame fractions of the move: 0, 0.60, 0.80, 0.90, 0.95, 0.975, 0.99, 1.0 (8 f); sub-frame curve
`cubic-bezier(0.08, 1.01, 0.22, 0.94)`. The new word cuts on in its final place relative to the line on the same frame.
For a swap of the last word: 3-4 f of 3-8 px creep toward the coming move while the old word heats out, then swap.
Variant **pre-centre**: shift the line to its new centre 3-6 f *before* the word lands (`cubic-bezier(0.33,0.36,0.24,0.94)`
per step), so the gap is waiting. Holding the last word back ~14 f is the punch.
Variant **drawer append**: never re-centre; the left edge eases left as the line grows (the line slides open like a drawer).

```tsx
// widths from @remotion/layout-utils measureText; starts = frames each word appears
const shown = starts.filter((s) => frame >= s).length;
const lead = (k: number) => [0, 0.6, 0.8, 0.9, 0.95, 0.975, 0.99, 1][Math.min(7, Math.max(0, k))];
let x = -widthOf(1) / 2;
for (let i = 2; i <= shown; i++) x = mix(lead(frame - starts[i - 1]), x, -widthOf(i) / 2);
<div style={{ transform: `translateX(${x}px)`, whiteSpace: 'pre' }}>{words.slice(0, shown).join(' ')}</div>
```
**Avoid:** springs with overshoot on the line; easing the re-centre symmetrically; laying out the full line invisibly
(then nothing re-centres, which is what `Words` does; use `<Build>` for the append re-centre).

### 1.3 Masked rise
**What:** each word slides up out of a clip mask with a few degrees of tilt settling to 0. The classic premium build.
**When:** statements on flat grounds, lockup lines, one style per film. Strong on poster and grid worlds.
**Numbers:** from 105 % of the line height and 6 deg to 0 over 14 f, `ease.out`, gap 3.5 f compressing.

```tsx
<Words text="Ship the whole thing" arrive="rise" gap={3.5} dur={14} style={{ fontSize: 120, fontWeight: 600 }} />
```
**Avoid:** rising every line in the film; leaving the line static after (add a creep).

### 1.4 Staircase settle
**What:** a line typesets itself: later words start lower on a descending staircase and rise to one baseline while the
whole line drifts sideways.
**When:** a claim over a busy montage (the line stays fixed in colour while the pictures cut under it).
**Numbers:** start offsets 0, 0, 16, 70, 90 px (the last word may also be 1.1x); each rises over 30 f with
`cubic-bezier(0.2,0.8,0.3,1)`, half done by frame 6; the whole line drifts 150 px left on the same curve over 60 f.

```tsx
const dy = [0, 0, 16, 70, 90];
words.map((w, i) => <span key={i} style={{ display: 'inline-block',
  transform: `translateY(${mix(at(frame, 0, 30, ease.out), dy[i], 0)}px)` }}>{w}&nbsp;</span>)
```
**Avoid:** rotation, per-letter motion, blur. It is about baselines.

### 1.5 Cut inside the text
**What:** a small line (scale ~0.45) jumps to ~0.97 on one frame as the next word appears, then settles to 1.0 with a
blur clearing 3 -> 0 px over 6 f, anchored on one end.
**When:** an opening title of 2-3 words; it reads like an edit, not an animation.
**Numbers:** first words fade in 2-3 f at scale 0.447; f7-8 blur 1.5 -> 3 px and slide ~60 px; f9 jump to 0.967; f9-15
settle to 1.0 with blur 3.0, 2.2, 1.6, 1.0, 0.5, 0.2, 0. The new word enters lighter and reaches full ink by +4 f.

---

## 2. Colour as the arrival (born tint and its family)

### 2.1 Born tint ("hot arrival")
**What:** each new word is born in the accent colour (and the first one also oversized and blurred) and cools to the
line's ink. The eye always knows where to read, with no movement at all.
**When:** hooks, questions, any build where restraint is the look. The single most useful text move in the kit.
**Numbers:** first word: scale `1 + 1.77 * exp(-f / 4.5)`, blur `10.7 * exp(-f / 4.3)` px (clamp < 0.5 to 0), accent held
8 f then to ink by f22 with `ease.inOut`. Following words: no scale; cut on with 1 px blur for 2 f; accent for 2 f, then
to ink over 6 f. The line re-centres (1.2) after each word. Keep the type small (cap 50-75 px).

```tsx
<Words text="Where did that file go?" arrive="cut" gap={6} born={accent} settle={8}
       style={{ fontSize: 74, color: '#222222' }} />
```
`born` and `style.color` must be 6-digit hex (the kit blends hex).
**Avoid:** combining born tint with a rise and a blur and a scale on every word. Colour is the whole effect.

### 2.2 Light-to-ink arrival
**What:** words arrive slightly enlarged (1.1-1.3x), blurred ~8 px, in a light tint of the accent, and darken to ink.
**When:** statements on white or pale grounds; softer than 2.1.
**Numbers:** scale 1.3 -> 1.0 and blur 8 -> 0 over 8 f (`ease.out`), colour light accent -> ink over 10 f; pre-centre the line.

```tsx
<Words text="Built for real teams" arrive="blur" dur={10} gap={6} born={accentLight} settle={10} />
```

### 2.3 Ramp print
**What:** the word cuts on at full size and is "printed" through a colour ramp: a gradient 3x the word's width (transparent,
lightest tint, mid tones, darkest tone, ink) slides so the word becomes ink **from right to left** in 6-8 f. On the first
frame only the right ~40 % has any ink.
**When:** a world where colour enters only as a state (ink on white). Reverse it (ink -> light -> transparent, left to
right, 5-7 f) as the exit.
**Numbers:** 8 f, `background-position-x` on an expo-out (`1 - 2^(-6t)`); build the ramp from the brand's colours.

```tsx
const p = at(frame, s, 8, ease.out);
<span style={{ backgroundImage: `linear-gradient(90deg, transparent, ${t1}, ${t2}, ${t3}, ${ink} 66%, ${ink})`,
  backgroundSize: '300% 100%', backgroundPositionX: `${mix(p, 0, 100)}%`,
  WebkitBackgroundClip: 'text', color: 'transparent' }}>{word}</span>
```
**Avoid:** scaling, blurring or fading the word as well; sweeping the wrong way (the dark end leads from the right).

### 2.4 Fresh-ink typing colour
**What:** while text types or streams, the newest characters or words are tinted (accent, or 50 % white) and settle to
the final colour 2-11 f later, so a moving "fresh zone" travels with the text.
**Numbers:** each word born accent, turns to ink over 2-3 f, 4-11 f after its last character; in streamed answers the
newest line is 70 % opacity tinted, the previous 90 %, older 100 %.

### 2.5 Tint band and shimmer pass
**What (tint band):** a soft band of the light accent (one word wide, 40 px soft edges) travels left to right across a
white headline as its words turn on, fast across the first words (~55 px/f), then **parks on the key word** for ~30 f and
drains slowly (~5 px/f). The key word glows for a second without any motion.
**What (shimmer):** a white band ~150 px wide with 60 px soft edges, clipped to the glyphs, sweeps a status line at
~85 px/f (10-11 f across), rests, and repeats **on the beat** (period = frames per beat; 20 f at 90 BPM).
**When:** tint band for a key word in a headline; shimmer for "working..." status lines and completed rows.

```tsx
const X = keys(frame, [[0, 520], [3, 740], [7, 990], [12, 1170], [16, 1330], [35, 1360], [47, 1500]], ease.out);
<span style={{ backgroundImage: `linear-gradient(90deg, #fff ${X - 160}px, ${tint} ${X - 40}px, ${tint} ${X + 40}px, #fff ${X + 160}px)`,
  backgroundAttachment: 'fixed', WebkitBackgroundClip: 'text', color: 'transparent' }}>{line}</span>
```
**Avoid:** a band at constant speed; tinting the whole line; a shimmer that is off the beat or loops endlessly.

### 2.6 Colour wave on a word
**What:** one word recolours letter by letter from ink to the accent, the wave **decelerating** (letter starts 0, 2, 4, 6,
8, 11, 15, 19, 23 f), each letter cross-fading over ~4 f, while the line pulls back 1.0 -> 0.83 (expo-out).
**When:** the payoff word of a tagline.

---

## 3. Swaps and slots

### 3.1 Slot roll
**What:** one slot in a sentence rolls to the next word (old up and out, new up from below) inside a mask.
**When:** "for X / for Y / for Z" audiences, sources or verbs.
**Numbers:** `every` 24-30 f, roll 8-12 f `ease.inOut`, blur 10 px at mid-roll. Better: the old word heats (accent tint)
for 3 f before the roll and the new word arrives warm and cools in 3-4 f; the slot's width snaps to the new word.

```tsx
<span>Made for <Swap items={['designers', 'studios', 'founders']} start={20} every={28} dur={10} /></span>
```

### 3.2 Hinge drum
**What:** words flip up about their **baseline** (`rotateX` ~70 -> 0) while rising and going grey -> ink; the exit tips
back, rises 15-25 px and flattens while heating. For one frame old and new overlap like a drum.
**Numbers:** arrival 10 f expo-out, `transform-origin: 50% 100%`, perspective 800 px, translateY 40 -> 0, colour #7E7E7E
-> ink. Exit 9-11 f; alternate two exit tints on successive swaps so repeats do not feel identical. A picture slot beside
the word can drum vertically at the same time (old content accelerates up 12, 18, 27, 48, 110 px/f and is cut at peak;
new content enters at ~50 px/f and brakes over 12 f; the tile itself never moves).

```tsx
<Words text="Invoices" arrive="flip" dur={10} born="#7E7E7E" settle={8} style={{ color: '#000000' }} />
```

### 3.3 Accelerating example cycle
**What:** inside an input field, example strings **hard-swap with no transition** on an accelerating schedule; the
acceleration is the message ("it takes any request"). Slip the tagline in as one of the fast ones.
**Numbers:** durations 7, 7, 7, 7, 7, 5, 5, 5, 3, 3, 3, 3, 3, 3, 4 f (~3.2 s); the first placeholder blurs in 6 -> 0 px
over 3 f; a 5-8 ms tick per swap; the whole group scales 1.00 -> 1.15 on an ease-in meanwhile.

```tsx
const durs = [7, 7, 7, 7, 7, 5, 5, 5, 3, 3, 3, 3, 3, 3, 4];
let t = frame - start, i = 0;
while (i < durs.length - 1 && t >= durs[i]) t -= durs[i++];
<span>{examples[i]}</span>
```
**Avoid:** rolling or crossfading between examples (kills the acceleration); typing every example.

### 3.4 Glyph substitution
**What:** a transition of *meaning* in place: a band of rolling digits turns, slot by slot, into the glyphs of the next
idea; or one line's glyph slots reroll into random glyphs (some taller, some bolder, some blank) for 6-8 f and resolve into the
next line, first in a light "generating" tint with 2-3 letters missing (2 f), complete (2 f), then ink.
**When:** turning one idea into the next without moving the camera.
**Avoid:** blur or opacity between glyphs; `Math.random()` (use the kit's `rand(seed)`).

---

## 4. Typing

### 4.1 Realistic cadence
**What:** a human types: 1-3 characters per frame, faster inside words, stalls of 2 f on a few characters, longer pauses
after commas and full stops, never a constant rate. The caret blinks on **its own clock** (10-15 f on, 10-15 f off),
independent of typing, and is solid while typing.
**When:** every input field, prompt and composer.
**Numbers:** 12-20 chars/s average for prompts; 30-60 chars/s for "the machine writes"; the kit's `useTyped` adds seeded
jitter and pauses on spaces and punctuation.

```tsx
<InputBar t={theme} text="Draft the launch email for Friday" start={12} cps={16} sendAt={80} />
<Typing text="npm create app@latest" start={6} cps={22} caretColor={accent} />
```
Upgrades: **delete and retype** (placeholder deleted one char per frame with one multi-char skip, a 1 f beat, then the real
value typed unevenly: 3 chars on the first frame, then 1 per 1-2 f); **soft newest characters** (the newest 2 chars at
3 px blur / 60 %, the third at 1.5 px / 85 %: text condenses onto glass); **born colour** per word (2.4).
**Avoid:** showing the whole typing time. Hide it: type during a camera whip, cut inside a zoom whip to a later state, or
let the camera follow the caret (see `camera.md`).

### 4.2 Streaming answers
**What:** an AI answer appears faster than typing: one block (header, sentence, row) per frame top-down, each block
0.5 -> 1 opacity in 2 f; or text revealed behind a soft left-to-right wipe whose leading ~80 px edge is blurred and faded;
list rows: icon cuts on first, then text streams ~4-5 chars/f, characters cut on; the closing question slows to 1-2
chars/f with stalls.
**When:** chat answers, generated documents. Fast enough to read as machine speed, slow enough to see structure.

### 4.3 Parallel and hyper-fast typing
**What:** headline, body and button all type at once, 1-2 chars per frame, while the block pans out of frame mid-sentence.
The text is never finished on screen: speed says "it writes for you".

---

## 5. Decode, counters and numbers

### 5.1 Cipher settle
**What:** a short string first appears as a rule-based cipher of itself (each letter shifted +3 in the alphabet; spaces and
punctuation kept) and locks letter by letter into the real word; unlocked letters are tinted (60 % ink or the accent). On
exit it re-encodes in 6 f. Mono labels use the noisier variant: random [A-Z0-9] per slot changing every 2 f, one slot
locking every ~3 f, left to right.
**When:** product names, short claims, labels, the URL on the end card. The rule (encryption) can carry meaning.
**Numbers:** lock_i = start + 2 + floor(i x 0.8) (about one character per frame for short words).

```tsx
<Scramble text="acme.dev" start={10} per={1.2} flicker={6} glyphs="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
          style={{ fontFamily: fonts.mono, fontSize: 36 }} />
```
The kit's `Scramble` locks left to right from random glyphs; a shifted-cipher mode is a kit gap.

### 5.2 Random-order reveal (no glyphs)
**What:** the letters of a status line appear in shuffled order, ~2 per frame, accelerating, each 0 -> 0.5 -> 1 opacity
over 2 f; no substitute glyphs, no motion; trailing dots last. 30 characters in ~16 f.
**When:** "working..." status lines. Cleaner than any matrix effect.

### 5.3 Viewfinder scramble
**What:** inside L-shaped corner brackets, all glyphs change every 3 f through 6 states; exactly **one** glyph per state in
the accent with a 14 px glow; resolved letters lock left to right from state 4; glyphs carry a soft 16 px glow that
disappears on the frame the word resolves (crisp = done). Meanwhile the group zooms 1.44 -> 1.0 over 15 f, expo-out.

### 5.4 Counters
- **Rolling odometer** (mechanical, each digit a reel, low digits blurred by speed): budgets, limits, prices typed into a
  field. Lock the leftmost column first; ~30 f total.

```tsx
<Odometer value={1500} from={0} start={10} dur={30} prefix="$" style={{ fontSize: 64, fontWeight: 600 }} />
```
- **Cut counter** (real data): the value changes **by cuts**, never rolls, growing ~x1.08-1.12 per frame with irregular
  steps, and lands with one final jump (e.g. 2,000 -> 3,412). Percentages step 1-2 per 1-2 f irregularly. Irregularity is
  what makes it read as real. A light tick per change at -26 dB.
- **Percent ticks** in diagrams: a few % per frame in mono.
**Avoid:** odometers for everything; constant-rate counters; round numbers (use 3,412, not 3,000).

---

## 6. Type on surfaces

### 6.1 Floor sentence
**What:** a frontal card tilts back into a floor and the words are **printed on it**: they are children of the plane, so
they foreshorten with it. Each new word is larger (x1.4) and sits on a larger slab: the layout performs the sentence.
**Numbers:** words fade on in place over 5 f starting at 25 % ink tinted toward the ground; the plane tilts `rotateX 0 -> 52`,
`rotateZ 0 -> -22` over 12 f with `ease.soft`, then keeps drifting ~2 px/f and scaling 1 -> 1.15 over 70 f. Replace an old
word by cross-dissolving the new word into the same slot (6 f).

```tsx
<Camera keys={[{ f: 0 }, { f: 15 }, { f: 27, rx: 52, rz: -22, curve: ease.soft }, { f: 100, rx: 52, rz: -22, zoom: 1.15 }]}>
  <At x={700} y={560}><Words text="and then it grew" arrive="cut" gap={8} style={{ fontSize: 96 }} /></At>
</Camera>
```

### 6.2 Words on an object's faces
**What:** a question printed on the faces of a 3D bar, split so words sit near the face corners or wrap across an edge
(readable only from the corner). Same prop, three framings (wide, low pillar, macro) for three questions.
**Kit:** `Box` with `frontContent` / `topContent` / `sideContent` inside a `Camera`.

```tsx
<Box w={900} d={160} h={160} color="#F2F2F2" front={shade(accent, 0.35)}
     frontContent={<div style={{ fontSize: 88, color: ground }}>Where is it stored?</div>} />
```

### 6.3 Selection-box caption
**What:** a caption sits inside a 1 px rectangle with four square handles; each new word cuts on and the box **snaps to the
new width in one frame** (no tween). The snap makes it a tool, not an animation. Corner markers (four 25 px squares
~40 px outside the ink box) may arrive doubled and contract in 2-3 f, drift outward 1 px per 2 f, and stretch into bars
in the last 2-3 f of the shot.

---

## 7. Type as material

### 7.1 Letters as windows
**What:** a dark line slides in, grows 1.00 -> 1.05 (ease-in), steps 1.12x on a cut, then **on one frame** its letters become
windows onto the hero picture (picture fixed to the frame, letters as the mask). Two frames later add one row above and
one below at 1.5x, cropped by the frame edges, filled with the same picture.

```tsx
<div style={{ fontSize: 310, fontWeight: 700, color: 'transparent', WebkitBackgroundClip: 'text',
  backgroundImage: `url(${staticFile('hero.jpg')})`, backgroundSize: '1920px 1080px',
  backgroundPosition: `${-left}px ${-top}px` }}>Launch day</div>
```
**Avoid:** a wipe or fade into the fill; it happens on one frame, on a hit.

### 7.2 Text on torn layers
**What:** in a montage where each picture tears in over the last, **each layer carries its own copy of the text block**,
growing layer by layer; the torn edge passes *through* the words, so half a word belongs to the old layer and half to
the new.

### 7.3 Type behind the subject
**What:** a word sits in front of a subject until the moment a mask is "applied"; from that frame it is between the
backdrop and the cut-out. The layer-order change *is* the feature demo (selection, cut-out, segmentation). Needs a
cut-out PNG of the subject over the full picture.

### 7.4 Type hides the swap
**What:** a giant word rises in front of the product (cap ~65 % of frame height, cropped by the right edge, glyph top 810,
650, 486, 387, 346, 305, 276 px over 12 f, drifting left 220 px); while it covers the product, swap the product's variant.
The next cut arrives before the full word is ever seen: anticipation through cropping.

### 7.5 One gradient through a line
**What:** a single multi-stop gradient clipped to all glyphs of a line (`background-clip: text`) on a plain ground, with
only a slow push. It reads as the film's imagery printed into the type. Once per film.

### 7.6 Letterpress speckle
**What:** a fixed-seed mask of pinholes and specks (2-6 px, 5-12 % of the ink) and slightly rough edges on a serif. Makes
type feel printed. Fixed per word (it must not boil).

---

## 8. Giant words

### 8.1 Marquee pair
**What:** two giant words (cap ~150 px, often more), one top-right and one bottom-left, both partly outside the frame;
the whole type field pans left continuously (~15-20 px/f); a new verb enters from the right as the old leaves left, and
UI (chips, an input, a chart) lives in the gaps between the words.
**When:** a run of 3 short features, one verb pair each.

### 8.2 Giant type pan
**What:** a tagline at cap ~575 px (font ~820 px) overflowing the frame; the camera pans 140 px/f decaying to 16 px/f
(expo-out) with ~60 px horizontal motion blur at the start, the text plane yawing ~2 deg and breathing 6 % in scale.

### 8.3 Giant word as a camera reveal
**What:** a giant word enters from a corner while the camera pans; as a picture blooms in behind it, the fill flips
black -> white with a horizontal gradient sweep (white edge crossing the letters over 6 f) so it stays legible on both
grounds. Three things at once, no cut.

### 8.4 Ghost type
**What:** a frame-filling word at 3 % contrast to the ground (an emboss) behind a small word in full ink. Scale is
expressed without motion.

### 8.5 Size steps are cuts
**What:** a word changes size by cutting (big for 6 f, then 0.66x for 4 f, then off), or a punch-in on the word only
(x1.30, then x1.15) while the picture keeps its framing: type scale used as a camera move.

---

## 9. Words, objects and seams

### 9.1 Object born between words
A two-word line; the second word cuts on and the pair re-centres in one frame; at +10 f a small circle (d 16 px) appears in
the gap and grows on an accelerating curve (16 -> 107 px over 13 f) **pushing the words apart** (gap x4). Then cut 5x onto
the circle (see `turns.md`).

### 9.2 Words pushed by an object
Giant lines cut on word by word *behind* a growing circle or window; as it grows (+8 % radius), the line above moves up
and the line below moves into contact. Letters never scale on their own; only lines move.

### 9.3 Carried word
The last word of shot A, still fading in (~60 %), is the first word of shot B on a new ground. In B it grows 1.0 -> 1.43 over
20 f (`cubic-bezier(0.23,0.85,1,1.02)`), its fill sweeps to a two-tone gradient over 15 f, a blurred copy behind it blooms
with the colour, and its neighbour word stays blurred ~3.5 px (typographic depth of field).

### 9.4 Letter erosion swap
The old word erodes from its end, one letter per 1-2 f, each smearing 8-12 px horizontally as it fades in 2 f; overlapping
it by ~5 f, the new word's letters rise 45 px with vertical motion blur, 0 -> 1 in 3 f, settling in 8 f
(`cubic-bezier(0.15,0.64,0.27,0.97)`), 2-3 f stagger.

### 9.5 Collapse to icon
The caption heats out over 4 f, its group scales X 1 -> 0.02 about its centre (frames 2-4); on frame 4 it is two 8 px
dots; the dots are the end points of the icon of the action it names, which draws on with `stroke-dashoffset` over 8 f;
a rounded tile unfolds behind it from a 12 px line (scaleY 0.04 -> 1, expo-out, frames 6-18). The tile becomes the next
shot's container.

### 9.6 Word becomes picture
See `turns.md`: outer words keep slot and direction across a cut; the middle word is replaced by a photo card at 1.8x
that shrinks to rest in ~5 f.

---

## 10. Lockup type

- **Soft scan:** the wordmark slides left ~154 px over 12 f (`ease.out`) while a horizontal soft mask (band ~250 px)
  sweeps left to right *faster* than the slide (9 f, starting 1 f after), so letters inside the band read grey: ink
  developing. No per-letter motion, no blur, no scale.

```tsx
const tx = mix(at(frame, 0, 12, ease.out), 154, 0);
const p = mix(at(frame, 1, 9, ease.out), 900, 1350) - 960 + 500; // mask centre in the word's coordinates
<div style={{ transform: `translateX(${tx}px)`, WebkitMaskImage:
  `linear-gradient(90deg,#000 0,#000 ${p - 125}px,transparent ${p + 125}px)` }}>{name}</div>
```
- **Spaced cut-on:** letters cut on one per frame at +30 % letter-spacing; the gaps close expo-out over ~4 f; mark parts
  slide together; the lockup settles 1 -> 0.9 and drifts.
- **Glyph birth in light:** one glyph per 3 f, each born glowing in a light tint and cooling to white over 12 f, with a
  large soft glow (1000 x 700 px) travelling with the newest glyph; the lockup re-centres in small cuts.
- **Letter toss** (one title per film): one glyph per frame, each from (-55..-75, -60..-82) px, +35..+40 deg, scale 0.5,
  opacity 0.6, blur 3 px; position and rotation over 5 f `cubic-bezier(0.43,1.06,0.65,1.11)`; scale 0.5, 0.63, 0.79, 0.92,
  1.04, 1.06, 1.05, 1.03, 1.0. Only scale overshoots. 3-4 glyphs mid-flight at once.
- **Per-letter cut-on**, left to right ~2 f per character, leading characters light grey until they lock.

---

## 11. Exits for text
See `exits.md` section 6: shrink into the cut, one layer leaves, carried by the camera, make room, defocus while
moving, masked rise out (`leave="rise"`), heat out, re-encode. Never a plain fade longer than 4 f.

---

## Not in the kit yet (build these by hand from the recipes above)

- **Append build re-centre styles:** `<Build>` re-centres with the lead-heavy jump; the `pre`, `drawer` and `none` styles
  described above are still built by hand.
- **Explicit unit timing.** `Words` needs `starts?: number[]` (beat-locked builds, held-back last word) instead of only `gap`.
- **New `Words` arrivals:** `'hot'` (oversized + blurred, exponential settle: 1.2/2.1), `'track'` (letter-spacing snap from
  -0.08 em or +0.18 em to 0 in 3-4 f, 80 % on the first frame), `'stair'` (per-word start offsets, 1.4), `'ramp'` (gradient
  print, 2.3), `'drop'` variant from above-left with scale-to-centre.
- **New `Words` exits:** `'heat'` (ramp out), `'erode'` (letters leave from the end with horizontal smear), `'reencode'`.
- **`born` with non-hex colours.** `mixColor` only parses `#rrggbb`; `style.color` must be hex or blending fails silently.
- **`Swap` schedule and modes:** `durations?: number[]` (accelerating cycle), `mode="cut" | "roll" | "flip"`, pre-swap heat
  tint, and width animation to each word (the prop comment promises `auto-ch` but nothing implements it).
- **`Typing` / `useTyped`:** per-word born colour + settle, soft newest characters, explicit stall list, delete-then-type
  (`from` string), caret blink period as a prop.
- **`Scramble` modes:** `mode="cipher"` (shift +n, re-encode exit), `mode="order"` (random-order reveal without glyphs),
  `accentGlyph` (one accent glyph per state with glow), `glowUntilResolved`, and `reroll` from one string to another.
- **`CutCounter`:** a counter that changes by cuts with a growth factor, seeded irregular steps and a final jump.
- **`TintBand` / `Shimmer`:** a text-clipped gradient band with keyframed centre, park and drain; a beat-period shimmer.
- **`ColourWave`:** per-letter recolour with a decelerating schedule.
- **`TextWindow`:** text as a mask onto an image or video, fixed to the frame.
- **`Speckle`:** fixed-seed letterpress texture mask for type.
- **`Marker` block wipe:** a gradient block whose leading edge outruns its trailing edge and which can shrink onto the last
  word and linger as a highlighter.
- **`SelectionBox`:** a 1 px box with corner handles that snaps to its child's width per frame; corner markers that double,
  drift and stretch.
