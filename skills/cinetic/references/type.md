# Type: how a film sets its words

The film's own words (statements, the one spectacle word, the claim, the wordmark) are where a generated film shows
first. A film follows the rules below. Sizes are font sizes in px for a 1920x1080 frame unless they say cap height. The
faces are in `src/kit/fonts.ts`; the arrival moves are in [motion/text.md](motion/text.md).

Readability comes mostly from isolation, not from raw size: one short line, centred, alone on a clean ground, in high
contrast.

## 1. One sans voice

- Every statement is set in one sans: `fonts.inter` by default. It loads with optical sizing, so a large line renders in
  Inter's display cut (tighter spacing, finer joins) rather than as UI text blown up. Leave `font-optical-sizing` at its
  default (`auto`).
- `fonts.geist` instead for a developer brand that wants a tighter, technical grotesk: then it is the whole voice, never
  mixed into a line of Inter. A brand's own face replaces both.
- The product's UI keeps its own face, usually the same family.
- One face per line and one voice per film: no second display face, no faces swapped word by word, no extended "techno"
  face, no script.

## 2. Size by word count

A resting line (the size a normal statement settles at) is sized by how many words it holds.

| On screen | Size | Weight | Tracking |
|---|---|---|---|
| 5-6 words | 84-100 px | 430-500 | -0.015 em |
| 3-4 words | 110-150 px | 450-550 | -0.015 to -0.02 em |
| 1-2 words | 160-240 px | 450-550; 600-700 for one headline word | -0.02 to -0.03 em |
| the spectacle, once a film | 280-700 px, may crop at the frame edge | 500-700 | -0.03 to -0.05 em, line height 0.85-0.95 |
| the wordmark on the end card | cap height 90-140 px | 600-700 for a sans mark, regular for a serif mark | by size |
| a label the viewer needs | 34 px or more | the UI's weight | 0 |
| a texture label inside a UI component (chips, status lines, tags) | 20-28 px | the UI's weight | 0 |
| UI text, on screen after the camera's zoom | 30-44 px | the UI's weight | 0 |

- No statement word is under 64 px: not a lead-in word, not a second line, not the small word beside a giant one.
- A line is at most 1500 px wide. A line that would be wider holds too many words: cut words or split it into two
  beats, never shrink it below its range.
- Two lines at once only for one thought that will not split: both centred, line height 1.0-1.1, sized by the longer
  line.
- Vertical and square frames keep the same rules with lines wrapped to 2-3 words, each line at most 85 % of the frame's
  width, and the spectacle fitted to the width so no key word is cut off.

## 3. One spectacle size in a film

- Once a film, one word or a 2-3 word phrase goes giant: 280-700 px (cap height 15-50 % of the frame's height). It is the
  largest type in the film and names the benefit or the product (or its object), never the problem or the input: the
  hours saved, not the pile of mail; the amount that arrives, not the amount sent. A viewer reads the biggest word as the
  brand.
- It may crop at the frame edge (never inside a box) as long as the word still reads.
- Weight 500-700, tracking -0.03 to -0.05 em, line height 0.85-0.95.
- The resting lines keep their sizes around it; the jump between the two is the point. No third size in between: a film
  whose statements come in five sizes has no scale at all.

## 4. Weight

- Statements at 430-550. Inter at 450-500 is the usual voice.
- 600-700 only for one headline word, a stat or the wordmark. Never 800-900.
- Light (300) only on a light, airy ground at large sizes.
- No bold word inside a line for emphasis: emphasis is colour (section 9).

## 5. Tracking by size

- -0.01 to -0.015 em up to 130 px; -0.02 to -0.03 em at 130-250 px; -0.03 to -0.05 em above 250 px.
- 0 for UI text and labels at 40 px or less.
- Never above +0.03 em: no letter-spaced small caps, no spaced-out labels.

## 6. Sentence case

- Every statement in sentence case; a lowercase start is fine.
- No ALL CAPS statements, no Title Case.
- Capitals only where the words have them (an acronym, a product name), or once for a stat set with its unit.

## 7. Centred, alone

- By default a line sits at the frame's centre: x 960, its optical centre at y 520-540 (a hair above the middle).
- It is alone: the only words on screen, on a clean patch of ground. Nothing behind it is busier than a clean ground, a
  soft field of neighbouring hues or a calm area of a photograph, and its contrast against what is behind it is 7:1 or
  more. A brand accent that cannot reach that against the neutrals (a mid blue, an orange) never carries a statement as
  its ground or its colour: use it for shapes, the accent word's underline or glow, and a lighter tint of it for text on
  dark.
- Text is readable or absent: never blurred, ghosted or faded copies of words, rows or code behind or around a line.
  When a claim answers what was just shown, cut the picture away (or out of frame) and set the line on clean ground; a
  short line alone on a clean, lit ground is a calm frame, not an empty one. `CornerMarks` can frame it without a box.
- It keeps 8 % or more from every edge. Only the one spectacle word may be cut by the frame edge.
- As words append, the line re-centres (`<Build>`; [lead-heavy re-centre](motion/text.md#12-lead-heavy-re-centre-append-mode)).
- Off-centre only when the line answers an object beside it: a left-aligned block next to a UI card or a 3D object, 60 px
  of air or more between them, text and object centred together as one group. A poster world sets lines flush-left on its
  column grid. Type printed on a surface (a floor, the face of a block) follows the surface.
- Never a heading alone in a corner.

## 8. Few words, built

- 2-6 words on screen at once. A longer thought becomes two beats.
- Build them 1-3 words at a time, on the music: cut-on words (`<Words arrive="cut" times>`), an append that re-centres
  (`<Build>`), a last-word swap (`<Swap>`), a masked rise. Two arrival styles a film. Never fade a whole line in.
- One line on screen at a time.

**One type treatment a film.** Beside its arrivals, a film picks one treatment for its statements (a slot in the
`BEATS.md` Devices block) and repeats it through the film, so its type has a look of its own and not the same flat word
as every other film. Pick by what the product is:
- a light sweep through the line, parking on the key word ([tint band and shimmer](motion/text.md#25-tint-band-and-shimmer-pass));
- a heat glow that cools: the key word arrives with a soft glow in the accent's hue that cools to its resting colour
  ([born tint](motion/text.md#21-born-tint-hot-arrival) with the glow of section 9);
- a decode ([cipher settle](motion/text.md#51-cipher-settle));
- a word swap in place, the line holding while one word turns over ([last-word swap](motion/text.md#35-last-word-swap));
- type set on a surface: a floor, a block's face, the product's own paper ([type on surfaces](motion/text.md#6-type-on-surfaces));
- a picture inside the line ([letters as windows](motion/text.md#71-letters-as-windows),
  [picture inside the sentence](motion/text.md#97-picture-inside-the-sentence));
- the born tint, each new word born in the accent and cooling to the ink ([born tint](motion/text.md#21-born-tint-hot-arrival)).

The born tint is one option, not the default.

## 9. Emphasis by colour

At most one emphasised word or phrase a statement, in the accent; everything else in the ink. Punctuation is never
coloured, and a line is never split into two colours with no word singled out. Emphasis by one of:
- an accent word or short closing phrase in the brand accent (`accent` + `accentStyle` on `<Words>`, `wordStyle` on
  `<Build>`);
- a tint that sweeps the line and parks on the key word ([colour wake](motion/text.md#27-colour-wake));
- a highlight block behind the key word (`<Marker>`);
- an object inline at cap height in a word gap: an icon, a photo chip or a partner's mark (a `<Build>` slot;
  [picture inside the sentence](motion/text.md#97-picture-inside-the-sentence)).

The accent word may also carry light: a soft glow or a gradient in the accent's own hue, sized to the letters (the glow
reaches a fraction of the cap height past them, never a halo round the line), once a line. It lights the accent; it is
not a second accent.

Never emphasis by a second face, a heavier weight or a bounce, never a glow as decoration (on a whole line, on every
line, in a hue not the accent's), and never two accents in one line.

## 10. Serif only with a reason

The default is no serif. A serif appears only:
- **as the brand's voice**, when the brand's own type is a serif, or when the product is a writing, publishing or
  editorial brand (a writing tool, a publisher, a magazine, a newsletter), which may set every statement in its serif
  even when the brand is invented. Then it sets every statement: `fonts.serif` (Newsreader; its optical sizing gives a
  display cut at large sizes) or the brand's licensed serif, weight 400-600, tracking 0 to -0.01 em, sentence case. The
  UI stays in `fonts.inter`.
- **as the wordmark**, when the brand's mark is a serif.
- **as one italic accent word** inside a sans line, at most once a film: at the sans's cap height, the line's only accent.

Never a third face, and never a serif because the film should "feel human" or "feel premium".

## 11. No eyebrows, no kickers

- No small line above or beside a statement: no category label, no "New", no feature number, no small "Introducing".
- "Introducing" is its own beat or the first word of the line, at the line's size.
- A lead-in before a giant word ("under" before "a second") is part of the same sentence: same face, same case, at 64 px
  or more, read straight into the giant word.
- A figure never carries a label above it. Its unit or name follows it on the same line, or sits under it at 34 px or
  more, in the same face. A product name in small type above a UI element or a figure is a kicker.

## 12. Labels and mono

- Labels are sentence case in the UI face, tracking 0.
- Texture labels (UI chips, status lines, data tags nobody must read) may sit at 20-28 px. A label the viewer needs (a
  stat's unit, a name under an avatar, the line under a giant word, the CTA) is 34 px or more.
- `fonts.mono` is for code and data as written, inside UI or a terminal: commands, file names, numbers in a log. Never a
  statement, never an uppercase label, never letter-spaced.
- `fonts.hand` is for a sketch or a note inside a product (a napkin, a margin). Never a statement.

## 13. In code

```tsx
import { At, Build, Words, fonts } from '../../kit';

const INK = '#111214';
const ACCENT = '#E8572A';
const voice = { fontFamily: fonts.inter, color: INK };

// 3 words: 130 px, 500, -0.015 em. One word joins at a time and the line re-centres; the key word stays in the accent.
// Build's box is 1.2 em tall, so top 452 puts its middle at y 530.
<div style={{ position: 'absolute', left: 0, right: 0, top: 452 }}>
  <Build words={['Drafts', 'write', 'themselves.']} times={[T.a, T.b, T.c]}
    style={{ ...voice, fontSize: 130, fontWeight: 500, letterSpacing: '-0.015em' }}
    wordStyle={(i) => (i === 2 ? { color: ACCENT } : undefined)} />
</div>

// 5 words: 92 px, 460, -0.015 em, cut on in two groups (2 words, then 3), one accent word.
<At x={960} y={530}>
  <Words text="Your inbox, sorted by noon" arrive="cut" times={[T.b, T.b, T.b + 8, T.b + 8, T.b + 8]}
    accent={['noon']} accentStyle={{ color: ACCENT }}
    style={{ ...voice, fontSize: 92, fontWeight: 460, letterSpacing: '-0.015em' }} />
</At>

// The spectacle, once a film: one word at 460 px, 640, -0.045 em, line height 0.9.
<At x={960} y={540}>
  <Words text="Instant" arrive="rise" start={T.big}
    style={{ ...voice, fontSize: 460, fontWeight: 640, letterSpacing: '-0.045em', lineHeight: 0.9 }} />
</At>
```

## Tells: what makes type look generated

- Every line the same mid size whatever its word count, and nothing giant; or a six-word line blown up to 200 px.
- A full sentence on screen at once, or two lines where one would do.
- An eyebrow or kicker over a heading: a category label, a "New" pill, a feature number.
- Uppercase mono labels, letter-spaced small caps, any tracking above +0.03 em.
- ALL CAPS or Title Case statements.
- Statements at 800-900, or a bold word used for emphasis.
- A serif or script accent word dropped into a sans line by habit; two faces in one line; a mono statement for a
  "developer" feel; an extended techno face.
- Large type at UI spacing (tracking 0, optical sizing off): it reads as interface text blown up.
- A heading alone in a top-left corner, or a left-aligned line on an empty ground with nothing beside it to answer.
- Words over a busy picture without a plate; contrast under 7:1. Blurred, ghosted or faded copies of words behind a
  line, or a claim over dimmed, blurred UI.
- A resting line cut by the frame edge, or cut on two sides with the UI around it.
- A label above a figure; a coloured full stop; a statement in two colours.
- The same treatment in every film: one flat accent word, the born tint on every statement.
- Gradient fills on every headline, decorative glows (anything beyond the accent word's own soft light), outlines, drop
  shadows, letters bouncing one by one.
- Two accents in one line (a colour word plus a bold word plus an underline).
- A label the viewer needs at 20 px; text cropped inside its own chip or field.
