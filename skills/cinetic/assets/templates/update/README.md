# The update template

A 15-25 s update film ("vX is out", 2-3 changes; two changes for an 8-20 s spec) laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter acts it
removes). The film fills `src/update.ts` (and `src/content.ts`, written from the brief by `scripts/content.mjs`);
everything else is derived from it or dealt from the product's name, or from the deck (`src/dealt.ts`).

**The shape: a spine** (`references/spine.md`, lib/spine.ts). The film is ONE session (`session`: one person doing one
task that uses each change in turn) on ONE case (`case`: the record, names and numbers every act's screen shows), played
as 3-4 acts: the hook, one act per change in the order the session meets them, the lockup in the last act. ONE element
carries it: the version's pill in the hook is handed into each change's hero shot, where the shot draws it in its form
(the picture, the front notice, the card and then its button ...), and its last form converges into the brand's mark.
`src/timeline.ts` builds `SPINE`, plans it on the music grid (`SPINE_PLAN`, read by grid-check `--part spine` and the
cues) and derives every frame from it (`TIMES`, `HANDS`, `HOOK`, `CLOSE`).

- **Handovers instead of arrivals.** Every change of scene carries the element (`HANDS`, drawn by fx/Handover in
  `src/acts/World.tsx`): its box, corner, rim and content (a window onto each shot's own pixels, never scaled) travel
  from where the shot before draws it, under that shot's camera, to where the next shot draws it, under its camera. The
  kind comes from the form pair (grow, fly, swell, shrink; converge through a spark when no recipe fits; a notice or a
  card that opens into the next screen grows into it); a two-form shot reaches its second form on its own surface. The
  shot before falls back and is gone by the cut; the next racks in behind the landing element: no cross-dissolve.
- **Placements instead of shapes** (`src/deal.ts` PLACES): the hook's line stands alone and becomes the pill; each
  change's line meets the element: `part` (once, never on a line carrying a mark) parts round a rounded window holding the
  element, which opens into the shot; `head` rides over the element in the shot's own space as its heading.
- **The lockup grows out of the last form**: the converge's spark grows the mark as a solid (fx/three Logo3D; a CSS-3D
  solid on software GL), one pull-back lands it on the flat mark, the name slides out beside or under it, the version
  lands on the bar line that ends the body.
- **Never still, never aimless.** The world (fx/world WorldSteps) takes one step per act on the act cuts (enter, closer,
  light, pull-back) and holds inside an act; each held result creeps on the tail of its shot's last move; the lockup
  creeps toward the lens to the last frame. No float, no bob, no card at rest tilted.

**The hero shots** (`src/acts/heroes.tsx`, `src/deal.ts` HERO_META; the element's forms in `src/timeline.ts`
HERO_FORMS, its boxes in `heroElement`). Each change takes the first one in the film's order that can film it
(`heroFit`), the ones its `verb` asks for first (lib/spine `devicesFor`); a film plays at least two different ones:

| the change is | hero shot | the element | what the viewer sees |
|---|---|---|---|
| a tap | `push-press` | card, button | a chunky pointer travels to the button with the camera following it in; the press blooms a glow the size of the button and the screen's answer lands in frame |
| a typed request | `macro-type` | input, send | the input at macro scale: the camera pushes onto the first characters, rides the caret, travels to send and lands on the press |
| a list | `toast-stack` | front notice | the rows drop into the front slot as cards, pushing the stack back into depth on a graded blur ladder |
| a list | `fan-focus` | list | the rows as cards fanned back in depth; the camera closes on the one that matters as the focus racks to it |
| 5+ pictures | `carousel` | picture | a ring of the pictures turning in depth; the camera cranes down as it lands the chosen one |
| a picture | `photo-develop` | picture | the picture develops from a duotone in the world's light to full colour while a glass card with what it says rises in front |
| a count | `glass-counter` | figure | the figure in a slab of glass, counting as the camera pushes onto it; a band of light on the landing |
| a page or a week | `page-fly` | page | the page lies back in perspective and the camera travels it from the headline to what changed |
| a before and an after | `focus-swap` | card | the screen as it was falls back as the screen as it is now rises in front, the focus racking forward |
| 3+ products it works with | `glass-tiles` | tiles | their official marks as milky glass tiles rising on an arc in depth |

**The deal** (`src/deal.ts`, seeded by the name; `PIN` a slot or `SEED` to re-deal; the last three films' choices are
left out through `src/recent.ts`): the world (`ground`: deepField, electric dealt; blackField, nearWhite, paleSky and the
photographs clouds, sky, aerial, sea, nightCity, studio, macro by PIN or the deck when the brief names the place), the hook (`roll`,
`rise`, `badge`: each ends on the pill), the placements (`place`), the end (`beside`, `stack`), the hero shots and the
lines' voice. `deck.py` deals the world and the hero shots into `src/dealt.ts` when a direction is picked. Print it: the
command in template.json `deal.print`.

**What to write.**
- `src/content.ts`: `node scripts/content.mjs --brief BRIEF.md --fetch --force`, then keep what is true.
- `src/update.ts`: the version and the one before it; the `session` (a verb phrase) and its `case`; 2-3 changes in the
  session's order. Each: `words`, one plain sentence of 2-6 words saying the result the user sees; `key`; `verb`;
  `title` and `sub`, the screen's own header (the case's names and numbers belong here); `show`, the moment that proves
  it (`tap`, `type`, `fill` as list, grid or week, `swap`, `count`, `page`); `photos` (5+) or `logos` (3+, official
  marks via `scripts/logos.mjs`) when the change has them; `place` to choose its line's placement.
- The brand: the palette in `src/brand/tokens.ts`, the mark's SVG in `src/brand/logo.ts` (named parts: the 3D mark
  extrudes them; on a dark world its near-black parts take the world's ink).

**Look early, render in parts.** `node scripts/frames.mjs end` (the lockup), a sheet of the whole film, each handover at
`--every 2` round its span (`HANDS` t0-t1), then `bash scripts/render.sh Film out/draft.mp4 --draft` with its sound.
Gates: grid-check `--part spine`, forensics `--spine` (each handover's and the porthole's box track is declared in
`src/sync.ts`), look-audit `--look`.

**Music.** Cut to a licensed, human-made, instrumental track (template.json `music`); `track.py fit --end auto` puts its
entry on the lockup's bar and its final hit on the version mark. `src/sync.ts` cuts the effects to the picture: a
handover's air from 4 f@60 before its cut, the landing on the frame it lands, each hero shot's moment on its frames.
