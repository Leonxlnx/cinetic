# The update template

An 8-20 s update film ("vX is out": two changes run 9-12 s, three 12-15 s) laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter acts it
removes). The film fills `src/update.ts` (and `src/content.ts`, written from the brief by `scripts/content.mjs`);
everything else is derived from it or dealt from the product's name, or from the deck (`src/dealt.ts`).

**The shape: a line and its scene per change, assembled from the house scenes** (`src/scenes`: one moment each,
1.5-3 s, a pure function of its frame, filled with this product's words, pictures and mark).

| part | what plays | length |
|---|---|---|
| hook | the name, already moving on the first frame, lands centred on a clean ground; the version arrives beside it (`pill` lands, `roll`s from the old numerals, or cuts on as a `tag` while the name slides aside) | 1.6 s at most |
| each change | its line alone on the film's one ground (one flat colour: text never stands on a picture; the accent field, toast-stack's flood, is the one deliberate change, its card with it, then back), then the scene that proves it; a scene that sets the line itself (porthole-line parts it round its picture, decode-title decodes it, orbit-chips sets it on its orbits) plays alone; a scene that takes over the element the scene before hands on (macro-type's send button, pressed by porthole-line's pointer) follows it on a match cut | 2-4 s |
| end | mark-pullback: the brand's mark as a solid pulls back from an extreme close-up with a roll (about 1 s), one snap to the lockup assembling, which keeps pushing; the version lands under it as a pill on the bar line that ends the body | the lockup whole and alive to the last frame, 1.5-2 s after the version |

Every press is a real arrow pointer (porthole-line, decode-title, macro-type), never a click circle. At least one scene
of a film is big (`SCENE_SPEC.big`: porthole-line, decode-title, macro-type, page-fly, photo-river), and the end is
always the mark-pullback. The cuts sit on the 16th grid where each part is understood, never stretched to a bar; the
version mark lands on the bar line (the track's final hit), and when that bar line would leave the lockup waiting, the
hook, the cards and the scenes with a rest (played slower over a few frames, never frozen) take the time instead.

**The limits** (`src/deal.ts` LIMITS; the plan is built inside them and `src/timeline.ts` throws on a plan outside them,
so grid-check, the Studio and the render all stop and say what to shorten): a lone line is in and read in 1.2 s (big, a
cap of 8 % of the frame, arriving whole or in 2-3 chunks, never word by word); a scene runs 3 s at most; a change 4 s, a
typed change 3 s (a request of about 20 characters types in macro-type, entered as its pointer nears the field; a longer
one types in glass-prompt); the hook 1.6 s, moving on the first frame; the lockup 2.5 s from its first frame to the film's
last, the version at least 1.5 s before the end (never a fade, never an empty last frame); one snap zoom (the pull-back's cut to the lockup); the film 8-20 s. Never
raise a limit to pass: shorten the line or the request, give the scene less content, or choose another scene.

**The seams.** A change comes in on the element the scene before hands on (a match cut), on that scene's own exit, or
through a defocus the stage draws: what was before racks out of focus with a push and the change's ground racks in, the
cut inside the blur. A line card's line dissolves off over its scene's first frames on the shared ground. Nothing stands
still: the hook and each card push toward the lens at a steady rate, the lockup keeps the pull-back's push.

**The scenes** (`src/deal.ts` HERO_META, `sceneFit`), dealt at random: the film's order is a weighted shuffle seeded by
the name and the last films (big scenes early, the last films' scenes late); each change takes the first in that order
that films it, its words pulling a scene a little forward; never one scene twice, two of the last film's change scenes
at most (the lockup every update film ends on is not counted); a change names a scene by hand only with its `why`
(grid-check `deal-*`):

| the change is | scene | big | its line |
|---|---|---|---|
| a press that opens a picture (`tap` + `picture`) | `porthole-line` | yes | parted round the porthole |
| a press, 2-4 words (`tap`) | `decode-title` | yes | decoded, its button clicked |
| a typed request of about 20 characters (`type`; the change in 3 s) | `macro-type` | yes | on its card |
| a typed request (`type`) | `glass-prompt` | | on its card |
| a list (`fill` list, or 3+ results) | `toast-stack` | | on its card |
| a page (`page`) | `page-fly` | yes | on its card |
| 8+ pictures (`photos`, a grid) | `photo-river` | yes | on its card |
| a figure on a picture (`count` + `picture`) | `photo-counters` | | on its card |
| 3+ products it works with (`logos`) | `orbit-chips` | | on the orbits |

**The colours** (`src/acts/look.tsx`): the brand's when `src/brand/tokens.ts` carries them, else a palette dealt per film
(`src/deal.ts` PALETTES: a near-black or a white ground, one strong accent; never a tinted wash, never the starter's
green, never a scene's own demo colours). Every scene and line card stands on the film's base (`toneOf`; a light
scene on a dark film keeps its white surfaces as raised dark ones), the accent field (toast-stack's flood) its one
deliberate change; `GROUND_PLAN` declares it (grid-check grounds).

**The deal** (`src/deal.ts`, seeded by the name; `PIN` a slot or `SEED` to re-deal; the last three films' choices are
left out through `src/recent.ts`): `palette`, `hook` (pill, roll, tag), `voice` (the lines' move: whole, chunks, track),
`set` (line or statement size), and the scenes. Print it: the command in template.json `deal.print`; the plan in one
line: `npx tsx -e "import { PLAN_LINE } from './src/timeline'; console.log(PLAN_LINE)"`.

**What to write.**
- `src/content.ts`: `node scripts/content.mjs --brief BRIEF.md --fetch --force`, then keep what is true.
- `src/update.ts`: the version and the one before it; the `session` and its `case`; 2-3 changes in the session's order.
  Each: `words`, one plain sentence of 2-6 words saying the result the user sees; `key`; `verb`; `title` and `sub`;
  `show`, the moment that proves it (`tap`, `type`, `fill` as list or grid, `count`, `page`); `picture` (a press opens
  onto it, a count stands on it), `photos` (8+) or `logos` (3+, official marks via `scripts/logos.mjs`) when it has them;
  `scene` (with `why`) to choose by hand; `split` to break a parted line.
- The brand: the palette in `src/brand/tokens.ts`, the mark's SVG in `src/brand/logo.ts` (the pull-back extrudes it).

**Look early.** The plan with its seconds (`PLAN_LINE`), `node scripts/frames.mjs end` (the lockup), a sheet of the
whole film (`--every 24`), then `bash scripts/render.sh Film out/draft.mp4 --draft` with its sound. Gates: grid-check,
forensics (its motion floor: under 10 % of the body near-still), look-audit `--look`.

**Music.** Cut to a licensed, human-made, instrumental track (template.json `music`); `track.py fit --end auto` puts
its final hit on the version mark. `src/sync.ts` voices each scene's own moments (its meta cues) where the film plays
them, one soft text sound per line card, the version's arrival in the hook, the pull-back and the version mark: real
licensed recordings from the catalogue (`node scripts/audio/sfx.mjs`, a new set each film), earshot judging the mix.
Every move eases, never linear (zooms in log space, pans on exponential curves; `lint-film.mjs` fails linear motion).
