# The update template

An 8-20 s update film ("vX is out": two changes run 11-15 s, three stay inside 20 s) laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter acts it
removes). The film fills `src/update.ts` (and `src/content.ts`, written from the brief by `scripts/content.mjs`);
everything else is derived from it or dealt from the product's name, or from the deck (`src/dealt.ts`).

**The shape: a line and its scene per change, assembled from the house scenes** (`src/scenes`: one moment each,
1.5-3 s, a pure function of its frame, filled with this product's words, pictures and mark).

| part | what plays | length |
|---|---|---|
| hook | the name builds centred on a clean ground; the version arrives beside it (`pill` lands, `roll`s from the old numerals, or cuts on as a `tag` while the name slides aside) | about 1.5 s |
| each change | its line alone on the ground of its scene (one flat colour: text never stands on a picture), then the scene that proves it; a scene that sets the line itself (porthole-line parts it round its picture, decode-title decodes it, orbit-chips sets it on its orbits) plays alone; a scene that takes over the element the scene before hands on (macro-type's send button, pressed by porthole-line's pointer) follows it on a match cut | 2-4 s |
| end | mark-pullback: the brand's mark as a solid pulls back from an extreme close-up with a roll, cuts to the flat mark, the lockup assembles; the version lands under it as a pill on the bar line that ends the body | 2.5 s and the tail |

Every press is a real arrow pointer (porthole-line, decode-title, macro-type), never a click circle. At least one scene
of a film is big (`SCENE_SPEC.big`: porthole-line, decode-title, macro-type, page-fly, photo-river), and the end is
always the mark-pullback. The cuts sit on the 16th grid where each part is understood, never stretched to a bar; the
version mark lands on the bar line (the track's final hit), and when that bar line would leave the lockup waiting, the
hook, the cards and the scenes with a rest (played slower over a few frames, never frozen) take the time instead.

**The scenes** (`src/deal.ts` HERO_META, `sceneFit`; each change takes the first in the film's order that films it, the
ones its words ask for first):

| the change is | scene | big | its line |
|---|---|---|---|
| a press that opens a picture (`tap` + `picture`) | `porthole-line` | yes | parted round the porthole |
| a press, 2-4 words (`tap`) | `decode-title` | yes | decoded, its button clicked |
| a typed request, up to 40 characters (`type`) | `macro-type` | yes | on its card |
| a typed request (`type`) | `glass-prompt` | | on its card |
| a list (`fill` list, or 3+ results) | `toast-stack` | | on its card |
| a page (`page`) | `page-fly` | yes | on its card |
| 8+ pictures (`photos`, a grid) | `photo-river` | yes | on its card |
| a figure on a picture (`count` + `picture`) | `photo-counters` | | on its card |
| 3+ products it works with (`logos`) | `orbit-chips` | | on the orbits |

**The colours** (`src/acts/look.tsx`): the brand's when `src/brand/tokens.ts` carries them, else a palette dealt per film
(`src/deal.ts` PALETTES: a near-black or a white ground, one strong accent; never a tinted wash, never the starter's
green, never a scene's own demo colours). Each scene takes the ground its picture needs (dark, light, the film's base,
or the accent as a full field); each line card stands on the ground of the scene it leads into.

**The deal** (`src/deal.ts`, seeded by the name; `PIN` a slot or `SEED` to re-deal; the last three films' choices are
left out through `src/recent.ts`): `palette`, `hook` (pill, roll, tag), `voice` (the lines' move: build, open, mask),
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

**Look early.** `node scripts/frames.mjs end` (the lockup), a sheet of the whole film (`--every 24`), then
`bash scripts/render.sh Film out/draft.mp4 --draft` with its sound. Gates: grid-check, forensics, look-audit `--look`.

**Music.** Cut to a licensed, human-made, instrumental track (template.json `music`); `track.py fit --end auto` puts
its final hit on the version mark. `src/sync.ts` voices each scene's own moments (its meta cues) where the film plays
them, one soft text sound per line card, the version's arrival in the hook, the pull-back and the version mark.
