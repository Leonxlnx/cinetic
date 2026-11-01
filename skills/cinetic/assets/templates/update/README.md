# The update template

A 15-25 s update film ("vX is out", 2-4 changes; two changes for an 8-20 s spec) laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter acts it
removes). The film fills `src/update.ts` (and `src/content.ts`, written from the brief by `scripts/content.mjs`);
everything else is dealt from the product's name, or from the deck (`src/dealt.ts`).

**The shape.** One world for the whole film (fx/world: a photograph or a built field, with its key light), which the
film travels through (`PATH`: it enters the place and moves on with every shot that arrives, landing after it; no shot
draws a copy of it of its own). The name
and the version, centred, as one pair from the first frame. Then each change is filmed by a **hero shot** and said in
one short centred line, in its own shape (`src/deal.ts` SHAPES):

- `show`: the hero shot first; then it falls back into the world (soft, smaller, darkening, gone 22 f@60 after) as the
  line lands centred on the world, on its pool.
- `lead`: the line first, alone in the world (the shot before goes soft into the world), then the hero shot.
- `split` (once a film): the line first, parted round a porthole that opens in its gap with the shot (or the shot's
  chosen picture) inside; the words leave and the porthole opens into the frame as the shot plays.

A line never follows a line. Each hero shot arrives on the film's optics (`arrive`: racking sharp out of focus, a whip
that brakes into the shot, or a bloom of the world's light that settles), and the shot before leaves under it, soft.
Then the end card: the brand's mark as a solid, close up and turning, pulls back and lands exactly on the flat mark
(fx/three Logo3D); the name slides out of it and the version lands on the last bar line.

**The hero shots** (`src/acts/heroes.tsx`, `src/deal.ts` HERO_META). Each change takes the first one in the film's
order that can film it (`heroFit`), and a film plays at least two different ones:

| the change is | hero shot | what the viewer sees |
|---|---|---|
| a tap | `push-press` | the change's screen; a chunky pointer travels to its button with the camera following it in; the press blooms a glow the size of the button and the screen's answer lands in frame |
| a typed request | `macro-type` | the input at macro scale (frosted glass over a photograph): the camera pushes onto the first characters, rides the caret, travels to send and lands on the press |
| a list | `toast-stack` | the rows drop into the front slot as cards, pushing the stack back into depth: the front one sharp, each one further back softer (a graded blur ladder) |
| a list | `fan-focus` | the rows as cards fanned back in depth; the camera to one side closes on the one that matters as the focus racks to it |
| 5+ pictures | `carousel` | a ring of the pictures turning in depth; the camera cranes down to eye level as it lands the chosen one, which opens toward the lens as the focus follows it |
| a picture | `photo-develop` | the picture develops from a duotone in the world's light to full colour while a glass card with what it says rises in front |
| a count | `glass-counter` | the figure in a slab of glass (it frosts the world), counting as the camera pushes onto it; a band of light crosses the glass on the landing |
| a page or a week | `page-fly` | the page (CONTENT.doc, CONTENT.site, or the week) lies back in perspective and the camera travels it from the headline to what changed |
| a before and an after | `focus-swap` | the screen as it was goes soft, dims and falls back as the screen as it is now rises in front, the focus racking forward |
| 3+ products it works with | `glass-tiles` | their official marks as milky glass tiles rising on an arc in depth (3D on a GPU, the flat version on software GL) |

Every shot keeps the house habits: one sharp plane and a graded blur ladder (fx/depth's lens), one declared camera
move that starts, travels with its subject and lands, the world behind it soft and a little parallaxed, glass that
frosts the world, light sized to its source and timed, real content (faces, names, figures, pictures) and a jump in
scale; a short-shutter smear only on fast moves. A change names its own shot with `hero` (and `why`).

**The rules it keeps.** The camera never floats: it moves only inside a hero shot, on the world's path or in the
mark's pull-back, and every hold is still. Nothing bobs or breathes; no card rests tilted (every shot's framing is square
at rest; the toast stack on an 85 mm lens). Lines are centred, 2-6 words, never over a sharp shot; their moves rotate and
they take three sizes. A shot leaving falls back and darkens under the next, never a sharp double exposure. People are
real faces from `src/content.ts` with the names they were cast with (one face, one person), never initials. The world
never cuts.

**The deal** (`src/deal.ts`, seeded by the name; `PIN` a slot or `SEED` to re-deal; the last three films' choices are
left out through `src/recent.ts`): the world (`ground`: nearWhite, paleSky, blackField, deepField, electric, or a
photograph: clouds, sky, aerial, sea, nightCity, studio, macro), the hook (`roll`, `rise`, `badge`), the arrival
(`rack`, `whip`, `bloom`), the order of shapes, the end (`beside`, `stack`), the hero shots and the lines' voice.
`deck.py` deals the world and the hero shots into `src/dealt.ts` when a direction is picked. Print it: the command in
template.json `deal.print`.

**What to write.**
- `src/content.ts`: `node scripts/content.mjs --brief BRIEF.md --fetch --force`, then keep what is true.
- `src/update.ts`: the version and the one before it, and 2-4 changes. Each: `words`, one plain sentence of 2-6
  words saying the result the user sees; `key`, the words set apart; `title` and `sub`, the screen's own header;
  `show`, the moment that proves it (`tap`, `type`, `fill` as list, grid or week, `swap`, `count`, `page`), in the
  product's own words, its numbers holding up when paused; `photos` (5+) or `logos` (3+) when the change has them.
- A plate world needs its photograph: `node scripts/assets.mjs plate <kind>`, look at the sheet, then `--pick <n> --to
  public/plates --accent '<the accent>'` (choose a calm area where the line will sit; the picture check wants 30 %
  neutral pixels: regrade with `assets.mjs grade --chroma` if it fails). Until then a built world of the same tone
  stands in.
- The brand: the palette in `src/brand/tokens.ts`, the mark's SVG in `src/brand/logo.ts` (named parts: the 3D mark
  extrudes them; on a dark world its near-black parts take the world's ink).

**Look early, render in parts.** `node scripts/frames.mjs end` (the lockup), then `node scripts/frames.mjs sheet
--frames <a change's frames> --every 6` per hero shot, then `bash scripts/render.sh Film out/draft.mp4 --draft` and
`frames.mjs sheet --from out/draft.mp4`. On software GL the 3D mark draws its CSS-3D twin (`MARK_3D` in
`src/acts/World.tsx`: 'auto', fx/three SolidMark: an extruded solid in CSS 3D); a hardware GPU draws it in WebGL 3D.

**Music.** Cut to a licensed, human-made, instrumental track (template.json `music`); `track.py fit --end auto` puts its
entry on the mark's bar and its final hit on the version mark. `src/sync.ts` places the effects on each hero shot's own
beats.
