# Type: how a film sets its words

The film's own words (statements, the one spectacle word, the claim, the wordmark) are where a generated film shows
first. A film follows the rules below. Sizes are font sizes in px for a 1920x1080 frame unless they say cap height. The
faces are in `src/kit/fonts.ts`; the arrival moves are in [motion/text.md](motion/text.md).

Readability comes mostly from isolation, not from raw size: one short line at a time, in high contrast against what is
behind it (a flat ground, or a calm area of a picture the film really needs; never a plate over a photograph), centred
or set beside the object it answers. The library's
type moves ([library-type.md](library-type.md)) come first; [motion/text.md](motion/text.md) has the rest.

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
| a label the viewer needs | a third of the line it serves, 40 px or more | the UI's weight | 0 |
| a texture label inside a UI component (chips, status lines, tags) | 20-28 px | the UI's weight | 0 |
| UI text, on screen after the camera's zoom | 30-44 px, 4.5:1 contrast or more | the UI's weight | 0 |

- No statement word is under 64 px: not a lead-in word, not a second line, not the small word beside a giant one.
- A line is at most 1500 px wide. A line that would be wider holds too many words: cut words or split it into two
  beats, never shrink it below its range.
- Two lines at once only for one thought that will not split: both centred, line height 1.0-1.1, sized by the longer
  line.
- Vertical and square frames keep the same rules with lines wrapped to 2-3 words, each line at most 85 % of the frame's
  width, and the spectacle fitted to the width so no key word is cut off.

**Sizes for a 1080-wide frame** (vertical 1080 x 1920, or square). The 16:9 sizes by word count do not fit: 160 px for
two words is already about 1100 px wide. A line of Inter at weight 500-650 is about 0.52 em a character, so a line of
`n` characters at size `s` is about `0.52 * n * s` px; keep it under 920 px (85 % of 1080).

| What | Size | Lines |
|---|---|---|
| 1-2 short words (up to about 12 characters) | 110-150 px | one |
| a statement of 3-5 words | 96-124 px | two or three lines of 1-2 words, line height 1.05-1.15 (`RiseLine maxWidth`) |
| the spectacle word | fitted: about `920 / (0.52 * characters)` px, 200-420 px | one |
| the wordmark on the end card | 96-120 px text (`TumbleLockup` and `LockupType` default to 10 % and 7 % of 1080) | one |
| UI text after the camera's zoom | 30-40 px | |

The 64 px floor for a statement word holds; a line that needs to go under it holds too many words.

## 3. One spectacle size in a film

- Once a film, one word or a 2-3 word phrase goes giant: 280-700 px (cap height 15-50 % of the frame's height). It is the
  largest type in the film and names the benefit or the product (or its object), never the problem or the input: the
  hours saved, not the pile of mail; the amount that arrives, not the amount sent. A viewer reads the biggest word as the
  brand.
- The giant word is optional in a film led by product UI or by the product's own pictures: there the scale contrast can come from a macro
  of the UI or a full-frame picture instead, and the statements keep their sizes by word count. When a film has one, it
  follows this section.
- It may crop at the frame edge (never inside a box) as long as the word still reads.
- Weight 500-700, tracking -0.03 to -0.05 em, line height 0.85-0.95.
- The resting lines keep their sizes around it; the jump between the two is the point. No third size in between: a film
  whose statements come in five sizes has no scale at all.

## 4. Weight

- Statements at 430-550. Inter at 450-500 is the usual voice.
- 600-700 only for one headline word, a stat or the wordmark. Never 800-900.
- Light (300) only on a light, airy ground at large sizes.
- No bold word inside a line for emphasis: emphasis is colour (section 9).
- A brief that asks for **bold** allows statement weights up to 700 (still never 800-900) and asks for at least two
  lines over 250 px in the film.

**The brief's adjectives become choices.** In `BRIEF.md`, list every adjective the user wrote and what it becomes in
type weight and size, pace, colour, picture and sound, so each one can be checked on the sheet:

| The brief says | It becomes |
|---|---|
| bold | statements 600-700, two or more lines over 250 px, words allowed to fill the frame (one lone giant word may crop); short holds, hard cuts on the beat; a strong accent on a tenth of the frame; a bed with a clear pulse |
| mostly words, words-led | type leads at least half the beats; the type library is the default (`check` flags a words-led brief that imports no type piece); statements at 160 px or more, never mid-weight on an empty ground; a picture or object enters the line, not beside it |
| warm | warm off-white or a warm, lit ground, 450-520 weight, softer arrivals, a sparse bed with no hit on every beat |
| quiet, calm | fewer beats, longer read holds with idle life, one accent, a sparse bed, effects at the low end |
| playful | a library playful-letters move once, a bounce up to 0.3, a brighter accent, a lighter bed |
| make people feel it | a person seen (a face, a hand, a reaction), not only objects: the film's own person in the payoff, seen earlier in the film |

Write it as `bold -> 650 weight, "Tomorrow" at 420 px and the claim at 280 px, cuts on the kick`, one line each.

## 5. Tracking by size

- -0.01 to -0.015 em up to 130 px; -0.02 to -0.03 em at 130-250 px; -0.03 to -0.05 em above 250 px.
- 0 for UI text and labels at 40 px or less.
- Never above +0.03 em: no letter-spaced small caps, no spaced-out labels.

## 6. Sentence case

- Every statement in sentence case; a lowercase start is fine.
- No ALL CAPS statements, no Title Case.
- Capitals only where the words have them (an acronym, a product name), or once for a stat set with its unit.

## 7. Centred, one line at a time

- By default a line sits at the frame's centre: x 960, its optical centre at y 520-540 (a hair above the middle).
- It is the only line on screen. Behind it: a flat ground, a calm area of the product's surface or of a
  picture the film needs (never a plate laid over a photograph); its contrast against what is behind it is 7:1 or more. A statement alone on an empty
  ground is for a line that must land (the claim at the end), never the turn and not the default beat: most lines sit over their picture or
  beside their object. A brand accent that cannot reach that against the neutrals (a mid blue, an orange) never carries a statement as
  its ground or its colour: use it for shapes, the accent word's underline or glow, and a lighter tint of it for text on
  dark.
- Text is readable or absent: never blurred, ghosted or faded copies of words, rows or code behind or around a line.
- It keeps 8 % or more from every edge. The frame edge may cut only a single giant word (280 px or more) alone in the
  frame, or one component in close-up that leaves on one side while the camera follows it: never a resting line of
  normal size, never two or more sides at once, never the words the beat is about. The film's key figure or claim is
  never cut by the frame, also while it counts or scales: size a rolling number so its widest state fits.
- As words append, the line re-centres (`<Build>`; [lead-heavy re-centre](motion/text.md#12-lead-heavy-re-centre-append-mode)).
- Off-centre only when the line answers an object beside it: a left-aligned block next to a UI card or a 3D object, 60 px
  of air or more between them, text and object centred together as one group. A poster world sets lines flush-left on its
  column grid. Type printed on a surface (a floor, the face of a block) follows the surface.
- Never a heading alone in a corner.

### Over a busy photograph

A statement never sits on the busy part of a picture, and never on a white or coloured plate laid over it (a plate over a
photograph reads as sloppy). Two answers:
- **a clean band of the picture:** frame or crop the photograph so the line lands on a calm area (a wall, the sky, a
  table top) that is calm under every letter for the line's whole time on screen, or
- **move the line to the ground:** the picture leaves or shrinks into the frame and the statement takes the clean
  ground; or drop the picture (a film needs no photograph that is not the product's or the user's own).
The line reaches 7:1 against what is directly behind it. Never dim, darken, blur or tint the whole picture
to make room for words: the picture is the world, and a dimmed world reads as a slide.

## 8. Few words, built

- 2-6 words on screen at once. A longer thought becomes two beats.
- A statement ends without a full stop unless the sentence needs one (a two-part line, a quote); a question keeps its
  question mark.
- Build them 1-3 words at a time, on the music: cut-on words (`<Words arrive="cut" times>`), an append that re-centres
  (`<Build>`), a last-word swap (`<Swap>`), a decode, a colour wake, type set on a surface, a masked rise (two a film).
  Two arrival styles a film. Never fade a whole line in.
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

At most one emphasised word or phrase a statement, in the accent, and in at most two statements a film; everything
else in the ink. Punctuation is never coloured, never animated and never turned into an object (a full stop that grows,
travels or becomes the mark), and a line is never split into two colours with no word singled out. The kit's `<Words>`
and `<Build>` keep punctuation in the line's colour. Emphasis by one of:
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

The default is no serif, and a serif is rarely the right voice. A serif appears only:
- **as the brand's voice**, when the brand's own type is a serif, or when the product is a writing, publishing or
  editorial brand (a writing tool, a publisher, a magazine, a newsletter), which may set every statement in its serif
  even when the brand is invented. Then it sets every statement: `fonts.serif` (Newsreader; its optical sizing gives a
  display cut at large sizes) or the brand's licensed serif, weight 400-600, tracking 0 to -0.01 em, sentence case. The
  UI stays in `fonts.inter`.
- **as the wordmark**, when the brand's mark is a serif.
- **as one italic accent word** inside a sans line, at most once a film: at the sans's cap height, the line's only accent.

Never a third face, and never a serif because the film should "feel human" or "feel premium". No handwriting font by
default (`fonts.hand` only for a mark a person makes inside a product, when the story needs it).

## 11. No eyebrows, no kickers

- No small line above or beside a statement: no category label, no "New", no feature number, no small "Introducing".
- "Introducing" is its own beat or the first word of the line, at the line's size.
- A lead-in before a giant word ("under" before "a second") is part of the same sentence: same face, same case, at 64 px
  or more, read straight into the giant word.
- A figure never carries a label above it. Its unit or name follows it on the same line, or sits under it at a third
  of the figure's size (40 px or more), in the same face. A product name in small type above a UI element or a figure is a kicker.

## 12. Labels, figures and mono

- Labels are sentence case in the UI face, tracking 0.
- Texture labels (UI chips, status lines, data tags nobody must read) may sit at 20-28 px. A label the viewer needs (a
  stat's unit, a caption, a date, a name under an avatar, the line under a giant word, the CTA) is a third of the line it
  serves and 40 px or more.
- Text never crops inside its own box (a chip, a field, a card): fit it (`useTextWidth`) or shorten it.
- A rolling or counting figure moves in whole digits: every frame shows whole digits, and no digit is ever clipped
  mid-roll on a frame that holds. The kit's `<Odometer>` (`roll="step"`) and the library's `RollType` (`whole`) step by
  default; their old continuous roll (`roll="smooth"`, `whole={false}`) only for a figure that never rests on a frame.
- Typing runs at a believable speed to the end, about 15-18 characters a second (the kit's default `cps` 17), never a
  burst where the rest of the line lands at once. When time is short, show a prefix as already typed and type the rest
  on screen, or shorten the line.
- `fonts.mono` is for code and data as written, inside UI or a terminal: commands, file names, numbers in a log. Never a
  statement, never an uppercase label, never letter-spaced.
- `fonts.hand` is for a sketch or a note inside a product (a napkin, a margin), and only when the story needs it.
  Never a statement.

## 13. In code

```tsx
import { At, Build, Words, fonts } from '../../kit';

const INK = '#111214';
const ACCENT = '#E8572A';
const voice = { fontFamily: fonts.inter, color: INK };

// 3 words: 130 px, 500, -0.015 em. One word joins at a time and the line re-centres; the key word stays in the accent.
// Build's box is 1.2 em tall, so top 452 puts its middle at y 530.
<div style={{ position: 'absolute', left: 0, right: 0, top: 452 }}>
  <Build words={['Drafts', 'write', 'themselves']} times={[T.a, T.b, T.c]}
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

- Every line the same mid size whatever its word count, and no contrast of scale anywhere (no giant word, no macro, no
  full-frame picture); or a six-word line blown up to 200 px.
- A full sentence on screen at once, or two lines where one would do.
- An eyebrow or kicker over a heading: a category label, a "New" pill, a feature number.
- Uppercase mono labels, letter-spaced small caps, any tracking above +0.03 em.
- ALL CAPS or Title Case statements.
- Statements at 800-900, or a bold word used for emphasis.
- A serif or script accent word dropped into a sans line by habit; two faces in one line; a mono statement for a
  "developer" feel; an extended techno face.
- Large type at UI spacing (tracking 0, optical sizing off): it reads as interface text blown up.
- A heading alone in a top-left corner, or a left-aligned line on an empty ground with nothing beside it to answer;
  every line alone on an empty ground, beat after beat.
- Contrast under 7:1. Blurred, ghosted or faded copies of words behind a line, or a claim over dimmed, blurred UI.
- A resting line cut by the frame edge, or cut on two sides with the UI around it.
- A label above a figure; a full stop on every statement, a coloured or animated one; a statement in two colours.
- Letters that start widely spaced and pull together; a typing burst; a rolling number that smears, pixelates or holds a
  digit clipped mid-roll.
- A turn or a claim told by a headline alone on an empty frame, or by the text inside one card swapped while the card
  stays ([turns are shown](film-grammar.md#story)).
- A statement over a busy photograph with no clean band, on a plate over the picture, or the whole picture dimmed or
  blurred behind it.
- The same treatment in every film: one flat accent word, the born tint on every statement.
- Gradient fills on every headline, decorative glows (anything beyond the accent word's own soft light), outlines, drop
  shadows, letters bouncing one by one.
- Two accents in one line (a colour word plus a bold word plus an underline).
- A label the viewer needs at 20 px; text cropped inside its own chip or field.
